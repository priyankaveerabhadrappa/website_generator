"""The LangGraph pipeline.

    analyze_job ─┬─> research_company ─┐
                 └─> gather_evidence ──┴─> write ─> fact_check ─┬─> write (revise, bounded)
                                                                └─> assemble ─> human_review ─┬─> publish
                                                                                              ├─> write (human feedback)
                                                                                              └─> END (rejected)
"""

import hashlib
import json
import operator
import sys
from typing import Annotated, Any, Literal, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt

from . import config, memory, prompts
from .assemble import assemble_site
from .checks import apply_patch, is_patchable, iter_statements, run_checks
from .cv import load_cv, load_profile
from .llm import (
    add_usage,
    cached_system,
    cost_usd,
    format_observations,
    make_model,
    run_tool_loop,
    structured,
    total_tokens,
)
from .schemas import (
    CompanyBrief,
    DraftPatch,
    EvidenceMap,
    FactCheckReport,
    JobAnalysis,
    RequirementEvidence,
    SiteConfigModel,
    SiteDraft,
)
from .web import make_fetch_tool, registrable_domain

MCP_CONNECTIONS = {
    "cv": {"command": sys.executable, "args": ["-m", "appgen.mcp_server"], "transport": "stdio"},
}
EVIDENCE_TOOLS = {"search_cv", "get_role", "get_claim", "list_roles"}


class State(TypedDict, total=False):
    job_description: str
    company_url: str | None
    dry_run: bool
    auto_approve: bool

    analysis: dict
    company_brief: dict | None
    evidence: dict
    draft: dict
    issues: list[dict]
    write_passes: int
    human_feedback: str | None
    human_rounds: int
    site_config: dict
    halted: str | None
    status: str
    slug: str

    usage: Annotated[dict, add_usage]
    trace: Annotated[list[dict], operator.add]
    check_history: Annotated[list[dict], operator.add]
    # Hashes of statements the judge already passed; unchanged statements are not re-judged on revision.
    verified: Annotated[list[str], operator.add]


def _analysis(state: State) -> JobAnalysis:
    return JobAnalysis.model_validate(state["analysis"])


async def analyze_job(state: State) -> dict:
    analysis, usage = await structured(
        make_model(),
        JobAnalysis,
        [SystemMessage(prompts.ANALYST), HumanMessage(state["job_description"])],
    )
    return {"analysis": analysis.model_dump(), "usage": usage, "write_passes": 0, "human_rounds": 0}


async def research_company(state: State) -> dict:
    analysis = _analysis(state)
    domain = registrable_domain(state.get("company_url") or analysis.company_website or "")
    if not domain:
        return {"company_brief": None, "trace": [{"agent": "research", "tool": None, "status": "skipped_no_url"}]}

    fetched: list[str] = []
    observations, usage, trace, stop = await run_tool_loop(
        make_model(),
        [make_fetch_tool({domain}, fetched)],
        [
            SystemMessage(prompts.RESEARCHER),
            HumanMessage(f"Company: {analysis.company}\nAllowed domain: {domain}\nHomepage: https://{domain}"),
        ],
        max_calls=config.MAX_RESEARCH_FETCHES,
        agent="research",
    )
    trace.append({"agent": "research", "tool": None, "status": f"stop:{stop}"})
    if not fetched:
        return {"company_brief": None, "usage": usage, "trace": trace}

    brief, summary_usage = await structured(
        make_model(),
        CompanyBrief,
        [
            HumanMessage(
                prompts.RESEARCH_SUMMARY.format(
                    company=analysis.company, observations=format_observations(observations)
                )
            )
        ],
    )
    allowed = {u.rstrip("/") for u in fetched}
    brief.facts = [f for f in brief.facts if f.source_url.rstrip("/") in allowed]
    return {"company_brief": brief.model_dump(), "usage": add_usage(usage, summary_usage), "trace": trace}


async def gather_evidence(state: State) -> dict:
    analysis = _analysis(state)
    requirements = "\n".join(
        f"- {r.id} ({r.importance}): {r.text} [keywords: {', '.join(r.keywords)}]" for r in analysis.requirements
    )
    client = MultiServerMCPClient(MCP_CONNECTIONS)
    async with client.session("cv") as session:
        tools = [t for t in await load_mcp_tools(session) if t.name in EVIDENCE_TOOLS]
        observations, usage, trace, stop = await run_tool_loop(
            make_model(),
            tools,
            [SystemMessage(prompts.EVIDENCE), HumanMessage(f"Requirements:\n{requirements}")],
            max_calls=config.MAX_EVIDENCE_TOOL_CALLS,
            agent="evidence",
        )
    trace.append({"agent": "evidence", "tool": None, "status": f"stop:{stop}"})

    evidence, summary_usage = await structured(
        make_model(),
        EvidenceMap,
        [
            HumanMessage(
                prompts.EVIDENCE_SUMMARY.format(
                    requirements=requirements, observations=format_observations(observations, limit=4000)
                )
            )
        ],
    )
    cv = load_cv()
    by_req = {item.requirement_id: item for item in evidence.items}
    items = []
    for req in analysis.requirements:
        item = by_req.get(req.id) or RequirementEvidence(
            requirement_id=req.id, claim_ids=[], assessment="Gap", rationale="Not assessed by the evidence agent."
        )
        item.claim_ids = [c for c in item.claim_ids if c in cv.claims]
        if not item.claim_ids:
            item.assessment = "Gap"
        items.append(item)
    return {
        "evidence": EvidenceMap(items=items).model_dump(),
        "usage": add_usage(usage, summary_usage),
        "trace": trace,
    }


def _brief_text(state: State) -> str:
    brief = state.get("company_brief")
    if not brief:
        return "(no company website research available; rely only on the job description)"
    facts = "\n".join(f"- {f['fact']} (source: {f['source_url']})" for f in brief["facts"])
    return f"{brief['summary']}\n{facts}"


async def write(state: State) -> dict:
    analysis = _analysis(state)
    cv = load_cv()
    reqs = {r.id: r for r in analysis.requirements}
    evidence_lines = []
    for item in EvidenceMap.model_validate(state["evidence"]).items:
        req = reqs[item.requirement_id]
        evidence_lines.append(
            f"- {req.id} ({req.importance}) {req.text}\n  assessment: {item.assessment}; "
            f"claims: {', '.join(item.claim_ids) or 'none'}; {item.rationale}"
        )
    preferences = [p["text"] for p in memory.list_preferences()]
    past = [f"{a['company']} ({a['position']})" for a in memory.list_applications(limit=5)]

    messages = [
        cached_system(
            prompts.WRITER_RULES.replace("{first_name}", load_profile()["candidate"]["firstName"]) + cv.annotated()
        ),
        HumanMessage(
            prompts.WRITER_REQUEST.format(
                position=analysis.position,
                company=analysis.company,
                evidence="\n".join(evidence_lines),
                signals="\n".join(f"- {s}" for s in analysis.company_signals) or "(none)",
                brief=_brief_text(state),
                preferences="\n".join(f"- {p}" for p in preferences) or "(none)",
                past="\n".join(f"- {p}" for p in past) or "(none)",
                job_description=state["job_description"],
            )
        ),
    ]
    feedback = state.get("human_feedback")
    issues = state.get("issues") or []
    if state.get("draft") and issues and not feedback and all(is_patchable(i["ref"]) for i in issues):
        draft = SiteDraft.model_validate(state["draft"])
        current = {ref: text for ref, text, _ in iter_statements(draft)}
        flagged = "\n\n".join(
            f"{i['ref']}: {current.get(i['ref'], '(missing)')}\n  problem: {i['problem']}\n  suggestion: {i['suggestion']}"
            for i in issues
        )
        messages.append(HumanMessage(prompts.PATCH.format(flagged=flagged)))
        patch, usage = await structured(make_model(temperature=0.2, max_tokens=4000), DraftPatch, messages)
        return {
            "draft": apply_patch(draft, patch).model_dump(),
            "usage": usage,
            "write_passes": state.get("write_passes", 0) + 1,
        }

    if state.get("draft") and (issues or feedback):
        problems = [f"- {i['ref']}: {i['problem']} Suggestion: {i['suggestion']}" for i in issues]
        if feedback:
            problems.append(f"- Candidate feedback: {feedback}")
        messages.append(
            HumanMessage(
                prompts.REVISION.format(
                    who=" and the candidate" if feedback else "",
                    draft=json.dumps(state["draft"], ensure_ascii=False),
                    issues="\n".join(problems),
                )
            )
        )

    draft, usage = await structured(make_model(temperature=0.3, max_tokens=16000), SiteDraft, messages)
    return {
        "draft": draft.model_dump(),
        "usage": usage,
        "write_passes": state.get("write_passes", 0) + 1,
        "human_feedback": None,
    }


async def fact_check(state: State) -> dict:
    draft = SiteDraft.model_validate(state["draft"])
    analysis = _analysis(state)
    cv = load_cv()
    issues = run_checks(draft, cv, analysis)

    company_basis = {f"why[{i}]": r.company_basis for i, r in enumerate(draft.why_company)}
    already_verified = set(state.get("verified", []))
    statements = list(iter_statements(draft))
    pending: dict[str, str] = {}
    blocks = []
    for ref, text, ids in statements:
        basis = company_basis.get(ref, "")
        digest = hashlib.sha1(json.dumps([text, sorted(ids), basis]).encode()).hexdigest()
        if digest in already_verified:
            continue
        pending[ref] = digest
        cited = "\n".join(f"    [{i}] {cv.claim_text(i) or '(unknown id)'}" for i in ids) or "    (no citations)"
        basis_line = f"\n  company basis: {basis}" if basis else ""
        blocks.append(f"{ref}: {text}{basis_line}\n  cites:\n{cited}")

    judge_issues: list[dict] = []
    usage = None
    if blocks:
        report, usage = await structured(
            make_model(model_id=config.JUDGE_MODEL_ID),
            FactCheckReport,
            [
                SystemMessage(prompts.FACT_CHECKER),
                HumanMessage(
                    prompts.FACT_CHECK_REQUEST.format(
                        job_description=state["job_description"],
                        brief=_brief_text(state),
                        statements="\n\n".join(blocks),
                    )
                ),
            ],
        )
        judge_issues = [
            {**i.model_dump(exclude={"fails"}), "source": "judge"}
            for i in report.issues
            if i.fails and i.ref in pending
        ]
    flagged = {i["ref"] for i in issues + judge_issues}
    return {
        "issues": issues + judge_issues,
        "usage": usage or {},
        "verified": [d for ref, d in pending.items() if ref not in flagged],
        "check_history": [
            {
                "pass": state.get("write_passes", 0),
                "statements": len(statements),
                "judged": len(blocks),
                "rule_issues": len(issues),
                "judge_issues": len(judge_issues),
            }
        ],
    }


def route_after_check(state: State) -> Literal["write", "assemble"]:
    if total_tokens(state.get("usage", {})) > config.TOKEN_BUDGET:
        return "assemble"
    if state.get("issues") and state.get("write_passes", 0) <= config.MAX_FACTCHECK_REVISIONS:
        return "write"
    return "assemble"


async def assemble(state: State) -> dict:
    halted = None
    if state.get("issues"):
        over_budget = total_tokens(state.get("usage", {})) > config.TOKEN_BUDGET
        halted = "token_budget" if over_budget else "revision_limit"
    site = assemble_site(
        SiteDraft.model_validate(state["draft"]), _analysis(state), load_cv(), load_profile()
    )
    return {"site_config": site, "halted": halted, "status": "awaiting_review"}


async def human_review(state: State) -> Command[Literal["publish", "write", "__end__"]]:
    if state.get("auto_approve"):
        decision: dict[str, Any] = {"action": "approve"}
    else:
        usage = state.get("usage", {})
        decision = interrupt(
            {
                "site_config": state["site_config"],
                "issues": state.get("issues", []),
                "halted": state.get("halted"),
                "usage": usage,
                "cost_usd": cost_usd(usage),
                "human_rounds": state.get("human_rounds", 0),
            }
        )
    action = decision.get("action")
    if action == "approve":
        return Command(goto="publish")
    if action == "revise":
        return Command(
            goto="write",
            update={
                "human_feedback": decision.get("feedback", ""),
                "human_rounds": state.get("human_rounds", 0) + 1,
                "write_passes": 0,
                "status": "revising",
            },
        )
    return Command(goto=END, update={"status": "rejected"})


async def publish(state: State) -> dict:
    site = dict(state["site_config"])
    SiteConfigModel.model_validate(site)
    if state.get("dry_run"):
        return {"status": "published", "slug": site["slug"]}

    base = site["slug"]
    slug, n = base, 1
    while (config.SITES_DIR / f"{slug}.json").exists():
        n += 1
        slug = f"{base}-{n}"
    site["slug"] = slug
    config.SITES_DIR.mkdir(parents=True, exist_ok=True)
    (config.SITES_DIR / f"{slug}.json").write_text(json.dumps(site, indent=2, ensure_ascii=False) + "\n")
    memory.record_application(
        slug,
        site["candidate"]["company"],
        site["candidate"]["position"],
        {"requirements": [{"requirement": i["requirement"], "match": i["match"]} for i in site["review"]["items"]]},
    )
    return {"status": "published", "slug": slug, "site_config": site}


def build_graph(checkpointer=None):
    graph = StateGraph(State)
    graph.add_node("analyze_job", analyze_job)
    graph.add_node("research_company", research_company)
    graph.add_node("gather_evidence", gather_evidence)
    graph.add_node("write", write)
    graph.add_node("fact_check", fact_check)
    graph.add_node("assemble", assemble)
    graph.add_node("human_review", human_review)
    graph.add_node("publish", publish)

    graph.add_edge(START, "analyze_job")
    graph.add_edge("analyze_job", "research_company")
    graph.add_edge("analyze_job", "gather_evidence")
    graph.add_edge(["research_company", "gather_evidence"], "write")
    graph.add_edge("write", "fact_check")
    graph.add_conditional_edges("fact_check", route_after_check, ["write", "assemble"])
    graph.add_edge("assemble", "human_review")
    graph.add_edge("publish", END)
    return graph.compile(checkpointer=checkpointer)


def run_config(thread_id: str) -> dict:
    return {"configurable": {"thread_id": thread_id}, "recursion_limit": config.RECURSION_LIMIT}
