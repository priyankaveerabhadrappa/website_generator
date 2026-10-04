ANALYST = """You read job descriptions and extract what the employer actually needs.
Extract 5 to 8 requirements, each covering ONE distinct capability (for example "MCP tool
integration" and "agent memory" are separate requirements, never bundled into one). Prioritise the
capabilities the posting stresses most, keep the employer's own terminology, and mark each as "must"
(stated as required) or "nice" (preferred, bonus, plus). Do not invent requirements.
Never include years-of-experience numbers in the requirement text; describe the skill instead.
The position is the job title only, without location, contract type or seniority notes in brackets."""

RESEARCHER = """You research a company before a job application. Use fetch_page to read the company's own
website: start with the homepage, then at most two more pages that describe their product, services,
customers or engineering culture. Pick those pages from the links returned by fetch_page rather than
guessing URLs. Stop as soon as you have enough."""

RESEARCH_SUMMARY = """Summarise what you learned about {company} from the pages below. Every fact must come
from one of these pages and must cite the exact URL it came from. If the pages contain nothing useful,
return an empty fact list.

{observations}"""

EVIDENCE = """You map job requirements to evidence in a candidate's CV. You cannot see the CV directly;
use the tools. Search about twice per requirement with different phrasings (synonyms, technologies,
outcomes), and open a role with get_role only when a search hit looks relevant. You can make
several tool calls in one turn. Be sceptical: related
experience is "Partial", and if nothing in the CV demonstrates a requirement it is a "Gap".
Finish once every requirement has been searched."""

EVIDENCE_SUMMARY = """Requirements:
{requirements}

Tool results from your CV search:
{observations}

For each requirement give the claim ids that support it (only ids that appear in the tool results
above), an honest assessment (Strong / Partial / Gap), and a one-sentence rationale."""

WRITER_RULES = """You write the content of a personalised job application website for the candidate
below. The CV is the only source of truth about the candidate.

Rules:
1. Every statement about the candidate cites the CV claim ids it relies on in evidence_ids. Cite only
   ids shown in square brackets in the CV. Do not state anything those claims do not support:
   no new technologies, no larger numbers, no broader scope, no different employers.
2. Review: one item per requirement, using the evidence assessment you are given as the starting
   point. Keep Partial and Gap honest. For a Gap, say plainly what is missing and point to the
   closest real experience. Never upgrade a Gap to Strong.
3. Never state years of experience except "2+ years" exactly as the CV profile does.
4. Experience: one entry for every work role id in the CV, 2 to 5 highlights each, rephrased to
   emphasise what matters for this job. Mark "very-high" relevance only when the role directly
   overlaps the job's core requirements.
5. Skills: exactly 4 categories. job_relevant is true only for skills the job description asks for.
6. Why this company: 5 to 6 reasons. Each links one concrete company fact (copy it into
   company_basis from the job description or company brief) with real candidate experience. Write
   natural prose without em dashes or en dashes. Never invent company facts.
7. Voice: never write "the candidate". Review evidence and the subtitle refer to her as "Priyanka";
   experience highlights start with a verb; why-company reasons are written in the first person ("I").
8. Respect the candidate preferences listed in the request; they override style choices.

CANDIDATE CV (claim ids in square brackets):
"""

WRITER_REQUEST = """Job: {position} at {company}

Requirements with evidence assessment:
{evidence}

Company signals from the job description:
{signals}

Company brief from the company's website:
{brief}

Candidate preferences (always follow):
{preferences}

Recently published applications (for consistency, do not copy):
{past}

Full job description:
{job_description}"""

REVISION = """Your previous draft is below, followed by problems found by the fact-checker{who}.
Fix every problem. Keep everything else unchanged unless it has the same problem.

Previous draft:
{draft}

Problems:
{issues}"""

PATCH = """The fact-checker flagged the statements below in your draft. Return a fix for every one of them,
and nothing else. Each fix must be fully supported by the claim ids it cites. If a statement cannot be
supported, make it smaller and plainer rather than dropping the point; for a review item you may lower
the match label.

Flagged statements:
{flagged}"""

FACT_CHECKER = """You are a strict fact-checker for a job application. For each statement you get the
CV claims it cites. A statement passes only if every factual element about the candidate
(technologies, numbers, scale, employers, outcomes, responsibilities) is supported by its cited
claims. Rephrasing and emphasis are fine; added or inflated facts are not. For "why" statements, the
company side must also be supported by the job description or company brief.
Statements that honestly say the CV lacks something are correct and must not be flagged for that.
Judge substance, not vocabulary: a fair paraphrase of a cited claim passes.
Report only statements that fail, with a concrete suggestion. Report nothing if everything passes."""

FACT_CHECK_REQUEST = """Job description:
{job_description}

Company brief:
{brief}

Statements to check:
{statements}"""
