"""Runs the graph to completion without a human (auto-approve), for evals and the CLI."""

import argparse
import asyncio
import json
import sys
import time
import uuid
from pathlib import Path

from langgraph.checkpoint.memory import InMemorySaver

from .graph import build_graph, run_config
from .llm import cost_usd


async def run_once(job_description: str, company_url: str | None = None, *, dry_run: bool = True) -> dict:
    graph = build_graph(InMemorySaver())
    started = time.perf_counter()
    state = await graph.ainvoke(
        {
            "job_description": job_description,
            "company_url": company_url,
            "dry_run": dry_run,
            "auto_approve": True,
        },
        run_config(str(uuid.uuid4())),
    )
    state["latency_s"] = round(time.perf_counter() - started, 1)
    return state


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate an application site without the dashboard.")
    parser.add_argument("job_description", type=Path)
    parser.add_argument("--company-url")
    parser.add_argument("--publish", action="store_true", help="Write to data/sites instead of a dry run")
    args = parser.parse_args()

    state = asyncio.run(run_once(args.job_description.read_text(), args.company_url, dry_run=not args.publish))
    print(json.dumps(state["site_config"], indent=2, ensure_ascii=False))
    print(
        json.dumps(
            {
                "slug": state.get("slug"),
                "halted": state.get("halted"),
                "remaining_issues": state.get("issues"),
                "check_history": state.get("check_history"),
                "usage": state.get("usage"),
                "cost_usd": cost_usd(state.get("usage", {})),
                "latency_s": state["latency_s"],
                "trace": state.get("trace"),
            },
            indent=2,
        ),
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
