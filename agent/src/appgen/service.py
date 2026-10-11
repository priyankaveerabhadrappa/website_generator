"""HTTP API used by the Next.js dashboard. Runs are checkpointed in SQLite, so a run paused for
human review survives a service restart."""

import asyncio
import uuid
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Literal

import uvicorn
from fastapi import FastAPI, HTTPException
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from langgraph.types import Command
from pydantic import BaseModel

from . import config, memory
from .graph import build_graph, run_config
from .llm import cost_usd

RUNS: dict[str, dict] = {}
TASKS: set[asyncio.Task] = set()


@asynccontextmanager
async def lifespan(app: FastAPI):
    config.STATE_DIR.mkdir(parents=True, exist_ok=True)
    async with AsyncSqliteSaver.from_conn_string(str(config.STATE_DIR / "checkpoints.sqlite")) as saver:
        app.state.graph = build_graph(saver)
        yield


app = FastAPI(title="appgen", lifespan=lifespan)


class RunRequest(BaseModel):
    job_description: str
    company_url: str | None = None


class ReviewDecision(BaseModel):
    action: Literal["approve", "revise", "reject"]
    feedback: str | None = None


class PreferenceIn(BaseModel):
    text: str


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _describe(node: str, update: dict) -> str:
    if node == "analyze_job":
        a = update["analysis"]
        return f"{len(a['requirements'])} requirements extracted for {a['position']} at {a['company']}"
    if node == "research_company":
        brief = update.get("company_brief")
        return f"{len(brief['facts'])} sourced facts from the company website" if brief else "No company website to research"
    if node == "gather_evidence":
        items = update["evidence"]["items"]
        counts = {lvl: sum(i["assessment"] == lvl for i in items) for lvl in ("Strong", "Partial", "Gap")}
        calls = sum(1 for t in update.get("trace", []) if t.get("tool") and t["status"] == "ok")
        return f"{calls} MCP tool calls: {counts['Strong']} strong, {counts['Partial']} partial, {counts['Gap']} gaps"
    if node == "write":
        return f"Draft {update['write_passes']} written"
    if node == "fact_check":
        h = update["check_history"][0]
        found = h["rule_issues"] + h["judge_issues"]
        return f"Checked {h['judged']} of {h['statements']} statements, {found} issue(s)"
    if node == "assemble":
        return "Site assembled" + (f" ({update['halted'].replace('_', ' ')} reached)" if update.get("halted") else "")
    if node == "human_review":
        if update.get("status") == "rejected":
            return "Rejected by candidate"
        return f"Changes requested: {update.get('human_feedback', '')}"
    if node == "publish":
        return f"Published as /{update['slug']}"
    return node


async def _drive(run_id: str, payload) -> None:
    run = RUNS[run_id]
    run["status"] = "running"
    graph = app.state.graph
    try:
        async for chunk in graph.astream(payload, run_config(run_id), stream_mode="updates"):
            for node, update in chunk.items():
                if node == "__interrupt__" or not isinstance(update, dict):
                    continue
                run["events"].append({"node": node, "at": _now(), "detail": _describe(node, update)})
        snapshot = await graph.aget_state(run_config(run_id))
        run["status"] = "awaiting_review" if snapshot.interrupts else snapshot.values.get("status", "done")
    except Exception as exc:
        run["status"] = "failed"
        run["error"] = f"{type(exc).__name__}: {exc}"


def _spawn(run_id: str, payload) -> None:
    task = asyncio.create_task(_drive(run_id, payload))
    TASKS.add(task)
    task.add_done_callback(TASKS.discard)


@app.get("/health")
async def health() -> dict:
    return {"ok": True, "model": config.MODEL_ID}


@app.post("/runs")
async def create_run(body: RunRequest) -> dict:
    if not body.job_description.strip():
        raise HTTPException(400, "job_description is required")
    run_id = uuid.uuid4().hex[:12]
    RUNS[run_id] = {"id": run_id, "status": "running", "events": [], "error": None, "created_at": _now()}
    _spawn(run_id, {"job_description": body.job_description, "company_url": body.company_url or None})
    return {"run_id": run_id}


@app.get("/runs")
async def list_runs() -> list[dict]:
    return [
        {k: r[k] for k in ("id", "status", "created_at")} for r in sorted(RUNS.values(), key=lambda r: r["created_at"])
    ]


@app.get("/runs/{run_id}")
async def get_run(run_id: str) -> dict:
    snapshot = await app.state.graph.aget_state(run_config(run_id))
    values = snapshot.values or {}
    run = RUNS.get(run_id)
    if run is None:
        if not values:
            raise HTTPException(404, "Run not found")
        status = "awaiting_review" if snapshot.interrupts else values.get("status", "done")
        run = RUNS[run_id] = {"id": run_id, "status": status, "events": [], "error": None, "created_at": _now()}

    usage = values.get("usage", {})
    analysis = values.get("analysis") or {}
    return {
        **run,
        "company": analysis.get("company"),
        "position": analysis.get("position"),
        "review": snapshot.interrupts[0].value if run["status"] == "awaiting_review" and snapshot.interrupts else None,
        "slug": values.get("slug"),
        "usage": usage,
        "cost_usd": cost_usd(usage),
        "check_history": values.get("check_history", []),
        "max_human_rounds": config.MAX_HUMAN_REVISIONS,
    }


@app.post("/runs/{run_id}/review")
async def review_run(run_id: str, decision: ReviewDecision) -> dict:
    snapshot = await app.state.graph.aget_state(run_config(run_id))
    if not snapshot.interrupts:
        raise HTTPException(409, "Run is not waiting for review")
    if decision.action == "revise":
        if not (decision.feedback or "").strip():
            raise HTTPException(400, "Feedback is required to request a revision")
        if snapshot.values.get("human_rounds", 0) >= config.MAX_HUMAN_REVISIONS:
            raise HTTPException(409, "Revision limit reached; approve or reject this draft")
    RUNS.setdefault(run_id, {"id": run_id, "events": [], "error": None, "created_at": _now()})
    RUNS[run_id]["status"] = "running"
    _spawn(run_id, Command(resume=decision.model_dump()))
    return {"ok": True}


@app.get("/preferences")
async def get_preferences() -> list[dict]:
    return memory.list_preferences()


@app.post("/preferences")
async def post_preference(body: PreferenceIn) -> dict:
    if not body.text.strip():
        raise HTTPException(400, "text is required")
    return memory.add_preference(body.text)


@app.delete("/preferences/{pref_id}")
async def remove_preference(pref_id: int) -> dict:
    memory.delete_preference(pref_id)
    return {"ok": True}


def main() -> None:
    uvicorn.run("appgen.service:app", host="127.0.0.1", port=8000)


if __name__ == "__main__":
    main()
