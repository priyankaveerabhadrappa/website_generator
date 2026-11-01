"""Eval harness: runs the multi-agent pipeline and the original single-call baseline on the same job
descriptions and scores both with the same independent audit.

    uv run appgen-eval                      # all cases
    uv run appgen-eval --cases opsfleet java-backend --skip-baseline
"""

import argparse
import asyncio
import json
from datetime import UTC, datetime
from statistics import mean
from urllib.parse import urlparse

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, ValidationError

from . import config
from .baseline import run_baseline
from .checks import YEARS_PATTERN
from .cv import load_cv
from .llm import cost_usd, make_model, structured
from .runner import run_once
from .schemas import SiteConfigModel
from .web import registrable_domain

EVALS_DIR = config.AGENT_DIR / "evals"

AUDITOR = """You audit a generated job application website against the candidate's CV.
For each numbered statement decide whether every factual element about the candidate (technologies,
numbers, scale, employers, outcomes, responsibilities) is supported somewhere in the CV. Rephrasing is
fine; invented or inflated facts are not.
For requirement statements, judge whether the match label and the evidence together are justified: a
"Strong" label for something the CV does not show is unsupported, while an honest "Partial" or "Gap"
that correctly says what is missing is supported.
Claims about the company are out of scope: do not list a statement whose only problem concerns the
company. List only unsupported statements."""


class UnsupportedStatement(BaseModel):
    index: int
    reason: str


class AuditReport(BaseModel):
    """Statements not supported by the CV."""

    unsupported: list[UnsupportedStatement]


def site_statements(site: dict) -> list[str]:
    out = [site["candidate"]["subtitle"]]
    out += [
        f"Requirement from the job description: {i['requirement']}. Match label given to the candidate: "
        f"{i['match']}. Evidence: {i['evidence']}"
        for i in site["review"]["items"]
    ]
    out += [h for e in site["experience"]["items"] for h in e["highlights"]]
    out += [f"{r['title']}. {r['body']}" for r in site["whyCompany"]["reasons"]]
    return out


def normalise_match(match: str) -> str:
    m = match.lower()
    if "gap" in m or "growing" in m:
        return "Gap"
    if "partial" in m:
        return "Partial"
    return "Strong"


def label_checks(site: dict, keywords: list[str], wanted: set[str], *, require_all: bool) -> dict:
    """Gaps must never be labelled Strong (require_all); a strength counts if any matching item is Strong."""
    hits = missing = 0
    details = []
    for kw in keywords:
        items = [i for i in site["review"]["items"] if kw.lower() in i["requirement"].lower()]
        if not items:
            missing += 1
            details.append({"keyword": kw, "result": "not_reviewed"})
            continue
        labels = [normalise_match(i["match"]) for i in items]
        ok = (all if require_all else any)(label in wanted for label in labels)
        hits += ok
        details.append({"keyword": kw, "labels": labels, "result": "ok" if ok else "wrong"})
    checked = len(keywords) - missing
    return {"correct": hits, "checked": checked, "not_reviewed": missing, "details": details}


async def audit(site: dict) -> dict:
    cv = load_cv()
    statements = site_statements(site)
    numbered = "\n".join(f"{i}. {s}" for i, s in enumerate(statements))
    report, usage = await structured(
        make_model(model_id=config.JUDGE_MODEL_ID),
        AuditReport,
        [SystemMessage(AUDITOR), HumanMessage(f"CV:\n{cv.raw}\n\nStatements:\n{numbered}")],
    )
    cv_years = {int(m.group(1)) for m in YEARS_PATTERN.finditer(cv.raw)}
    tenure = [s for s in statements for m in YEARS_PATTERN.finditer(s) if int(m.group(1)) not in cv_years]
    unsupported = [u.model_dump() | {"statement": statements[u.index]} for u in report.unsupported if u.index < len(statements)]
    return {
        "statements": len(statements),
        "unsupported": len(unsupported),
        "unsupported_rate": round(len(unsupported) / len(statements), 3),
        "unsupported_details": unsupported,
        "tenure_violations": tenure,
        "audit_cost_usd": cost_usd(usage),
    }


def score_site(site: dict | None, case: dict) -> dict:
    if site is None:
        return {"schema_valid": False}
    try:
        SiteConfigModel.model_validate(site)
        valid = True
    except ValidationError:
        valid = False
    return {
        "schema_valid": valid,
        "gap_honesty": label_checks(site, case["expected_gaps"], {"Gap", "Partial"}, require_all=True),
        "strong_recall": label_checks(site, case["expected_strong"], {"Strong"}, require_all=False),
    }


def trajectory_metrics(state: dict, company_url: str | None) -> dict:
    trace = [t for t in state.get("trace", []) if t.get("tool")]
    evidence = [t for t in trace if t["agent"] == "evidence"]
    research = [t for t in trace if t["agent"] == "research"]
    allowed = registrable_domain(company_url or "")

    def off_domain(t: dict) -> bool:
        host = (urlparse(t["args"].get("url", "")).hostname or "").lower()
        return not allowed or not (host == allowed or host.endswith("." + allowed))

    analysis = state.get("analysis", {})
    queries = " ".join(str(t["args"].get("query", "")).lower() for t in evidence if t["tool"] == "search_cv")
    searched = [
        r for r in analysis.get("requirements", []) if any(k.lower() in queries for k in r["keywords"])
    ]
    executed = [t for t in evidence + research if t["status"] in ("ok", "error")]
    return {
        "tool_calls": len(executed),
        "tool_success_rate": round(sum(t["status"] == "ok" for t in executed) / len(executed), 3) if executed else None,
        "duplicate_calls": sum(t["status"] == "duplicate" for t in trace),
        "over_budget_calls": sum(t["status"] == "over_budget" for t in trace),
        "unknown_tool_calls": sum(t["status"] == "unknown_tool" for t in trace),
        "off_domain_fetches": sum(off_domain(t) for t in research),
        "requirements_searched": f"{len(searched)}/{len(analysis.get('requirements', []))}",
        "stop_reasons": [t["status"] for t in state.get("trace", []) if not t.get("tool")],
    }


async def eval_case(case: dict, skip_baseline: bool, sem: asyncio.Semaphore) -> dict:
    jd = (EVALS_DIR / "cases" / f"{case['id']}.md").read_text(encoding="utf-8")
    result: dict = {"case": case["id"]}
    async with sem:
        try:
            state = await run_once(jd, case.get("company_url"))
            site = state.get("site_config")
            result["pipeline"] = {
                **score_site(site, case),
                **(await audit(site) if site else {}),
                "latency_s": state["latency_s"],
                "cost_usd": cost_usd(state.get("usage", {})),
                "llm_calls": state.get("usage", {}).get("llm_calls"),
                "write_passes": state.get("write_passes"),
                "remaining_issues": len(state.get("issues", [])),
                "halted": state.get("halted"),
                "check_history": state.get("check_history"),
                "trajectory": trajectory_metrics(state, case.get("company_url")),
                "review": [(i["requirement"], i["match"]) for i in site["review"]["items"]] if site else None,
            }
        except Exception as exc:
            result["pipeline"] = {"error": f"{type(exc).__name__}: {exc}", "schema_valid": False}
        if not skip_baseline:
            try:
                base = await run_baseline(jd)
                site = base["site_config"]
                scored = score_site(site, case)
                result["baseline"] = {
                    **scored,
                    **(await audit(site) if scored["schema_valid"] else {}),
                    "parse_error": base["parse_error"],
                    "latency_s": base["latency_s"],
                    "cost_usd": cost_usd(base["usage"]),
                    "review": [(i["requirement"], i["match"]) for i in site["review"]["items"]]
                    if scored["schema_valid"]
                    else None,
                }
            except Exception as exc:
                result["baseline"] = {"error": f"{type(exc).__name__}: {exc}", "schema_valid": False}
    print(f"done: {case['id']}", flush=True)
    return result


def summarise(results: list[dict], system: str) -> dict | None:
    rows = [r[system] for r in results if system in r]
    if not rows:
        return None
    ok = [r for r in rows if r.get("schema_valid") and "unsupported_rate" in r]

    def ratio(key: str) -> str:
        correct = sum(r[key]["correct"] for r in ok)
        checked = sum(r[key]["checked"] for r in ok)
        return f"{correct}/{checked}" if checked else "n/a"

    summary = {
        "runs": len(rows),
        "schema_valid": f"{sum(bool(r.get('schema_valid')) for r in rows)}/{len(rows)}",
        "unsupported_claim_rate": round(mean(r["unsupported_rate"] for r in ok), 3) if ok else None,
        "tenure_violations": sum(len(r["tenure_violations"]) for r in ok),
        "gaps_labelled_honestly": ratio("gap_honesty"),
        "strengths_recognised": ratio("strong_recall"),
        "mean_latency_s": round(mean(r["latency_s"] for r in ok), 1) if ok else None,
        "mean_cost_usd": round(mean(r["cost_usd"] for r in ok), 3) if ok else None,
    }
    if system == "pipeline" and ok:
        traj = [r["trajectory"] for r in ok]
        rates = [t["tool_success_rate"] for t in traj if t["tool_success_rate"] is not None]
        summary |= {
            "mean_write_passes": round(mean(r["write_passes"] for r in ok), 2),
            "runs_halted_by_breaker": sum(bool(r["halted"]) for r in ok),
            "tool_success_rate": round(mean(rates), 3) if rates else None,
            "duplicate_tool_calls": sum(t["duplicate_calls"] for t in traj),
            "off_domain_fetches": sum(t["off_domain_fetches"] for t in traj),
        }
    return summary


def to_markdown(summaries: dict[str, dict | None]) -> str:
    systems = [s for s, v in summaries.items() if v]
    keys = list(dict.fromkeys(k for s in systems for k in summaries[s]))
    lines = ["| metric | " + " | ".join(systems) + " |", "|---|" + "---|" * len(systems)]
    for k in keys:
        lines.append(f"| {k} | " + " | ".join(str(summaries[s].get(k, "")) for s in systems) + " |")
    return "\n".join(lines)


async def run(args: argparse.Namespace) -> None:
    cases = json.loads((EVALS_DIR / "cases.json").read_text())
    if args.cases:
        cases = [c for c in cases if c["id"] in args.cases]
    sem = asyncio.Semaphore(args.concurrency)
    results = await asyncio.gather(*(eval_case(c, args.skip_baseline, sem) for c in cases))
    summaries = {"pipeline": summarise(results, "pipeline"), "baseline": summarise(results, "baseline")}

    out_dir = EVALS_DIR / "results"
    out_dir.mkdir(exist_ok=True)
    stamp = datetime.now(UTC).strftime("%Y%m%d-%H%M%S")
    (out_dir / f"{stamp}.json").write_text(json.dumps({"summary": summaries, "cases": results}, indent=2))
    table = to_markdown(summaries)
    (out_dir / f"{stamp}.md").write_text(f"# Eval run {stamp}\n\nCases: {', '.join(c['id'] for c in cases)}\n\n{table}\n")
    print(table)
    print(f"\nWrote evals/results/{stamp}.json")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cases", nargs="*")
    parser.add_argument("--skip-baseline", action="store_true")
    parser.add_argument("--concurrency", type=int, default=3)
    asyncio.run(run(parser.parse_args()))


if __name__ == "__main__":
    main()
