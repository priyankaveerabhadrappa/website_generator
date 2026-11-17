"""The original single-call generator, reproduced for comparison in evals.

Same prompt (recovered from git into evals/baseline_prompt.ts), model, temperature 0.7 and plain JSON
parsing as the TypeScript version this project started with.
"""

import json
import re
import time

from langchain_core.messages import HumanMessage

from .config import AGENT_DIR, CV_PATH
from .cv import load_profile
from .llm import make_model, usage_of

PROMPT_FILE = AGENT_DIR / "evals" / "baseline_prompt.ts"


def _template() -> str:
    source = PROMPT_FILE.read_text(encoding="utf-8")
    return source[source.index("return `") + len("return `") : source.rindex("`;")]


def _extract_json(text: str) -> str:
    match = re.search(r"```(?:json)?\s*\n?([\s\S]*?)\n?\s*```", text)
    return match.group(1).strip() if match else text.strip()


async def run_baseline(job_description: str) -> dict:
    profile = load_profile()
    prompt = (
        _template()
        .replace("${firstName}", profile["candidate"]["firstName"])
        .replace("${lastName}", profile["candidate"]["lastName"])
        .replace("${education}", json.dumps(profile["education"], ensure_ascii=False, indent=2))
        .replace("${contact}", json.dumps(profile["contact"], ensure_ascii=False, indent=2))
        .replace("${jobDescription}", job_description)
        .replace("${candidateCV}", CV_PATH.read_text(encoding="utf-8"))
    )
    started = time.perf_counter()
    response = await make_model(temperature=0.7, max_tokens=8192).ainvoke([HumanMessage(prompt)])
    latency = round(time.perf_counter() - started, 1)
    text = response.content if isinstance(response.content, str) else "".join(
        b.get("text", "") for b in response.content if isinstance(b, dict)
    )
    try:
        site, error = json.loads(_extract_json(text)), None
    except json.JSONDecodeError as exc:
        site, error = None, str(exc)
    return {"site_config": site, "parse_error": error, "usage": usage_of(response), "latency_s": latency}
