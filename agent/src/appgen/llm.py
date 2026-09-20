import json
from typing import Any

from langchain_aws import ChatBedrockConverse
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import BaseTool
from pydantic import BaseModel

from . import config

Usage = dict[str, int]


class StructuredOutputError(RuntimeError):
    pass


def make_model(*, temperature: float = 0.0, max_tokens: int = 8192, model_id: str | None = None):
    return ChatBedrockConverse(
        model=model_id or config.MODEL_ID,
        region_name=config.AWS_REGION,
        temperature=temperature,
        max_tokens=max_tokens,
    )


def cached_system(*parts: str) -> SystemMessage:
    """System prompt with a Bedrock cache point after the (large, stable) prefix."""
    blocks: list[Any] = [{"type": "text", "text": p} for p in parts]
    blocks.append(ChatBedrockConverse.create_cache_point())
    return SystemMessage(content=blocks)


def empty_usage() -> Usage:
    return {"input_tokens": 0, "output_tokens": 0, "cache_read": 0, "cache_write": 0, "llm_calls": 0}


def add_usage(a: Usage | None, b: Usage | None) -> Usage:
    out = empty_usage()
    for src in (a or {}, b or {}):
        for k, v in src.items():
            out[k] = out.get(k, 0) + v
    return out


def usage_of(message: BaseMessage | None) -> Usage:
    meta = getattr(message, "usage_metadata", None) or {}
    details = meta.get("input_token_details") or {}
    cache_read = details.get("cache_read", 0) or 0
    cache_write = details.get("cache_creation", 0) or 0
    return {
        "input_tokens": max(meta.get("input_tokens", 0) - cache_read - cache_write, 0),
        "output_tokens": meta.get("output_tokens", 0),
        "cache_read": cache_read,
        "cache_write": cache_write,
        "llm_calls": 1,
    }


def total_tokens(usage: Usage) -> int:
    return sum(usage.get(k, 0) for k in ("input_tokens", "output_tokens", "cache_read", "cache_write"))


def cost_usd(usage: Usage) -> float:
    return round(
        usage.get("input_tokens", 0) / 1e6 * config.PRICE_INPUT_PER_M
        + usage.get("output_tokens", 0) / 1e6 * config.PRICE_OUTPUT_PER_M
        + usage.get("cache_read", 0) / 1e6 * config.PRICE_CACHE_READ_PER_M
        + usage.get("cache_write", 0) / 1e6 * config.PRICE_CACHE_WRITE_PER_M,
        4,
    )


async def structured[T: BaseModel](
    model: ChatBedrockConverse,
    schema: type[T],
    messages: list[BaseMessage],
    *,
    retries: int = config.MAX_STRUCTURED_RETRIES,
) -> tuple[T, Usage]:
    """Forces a tool-use response matching `schema`; validation errors are fed back for a bounded retry."""
    runnable = model.with_structured_output(schema, include_raw=True)
    history = list(messages)
    usage = empty_usage()
    last_error: Exception | None = None
    for _ in range(retries + 1):
        result = await runnable.ainvoke(history)
        raw: AIMessage = result["raw"]
        usage = add_usage(usage, usage_of(raw))
        if result["parsed"] is not None and result["parsing_error"] is None:
            return result["parsed"], usage
        last_error = result["parsing_error"] or ValueError("no tool call in response")
        feedback = (
            f"Your output did not validate against the {schema.__name__} schema:\n{last_error}\n"
            "Call the tool again with the complete, corrected arguments."
        )
        history.append(raw)
        if raw.tool_calls:
            for call in raw.tool_calls:
                history.append(ToolMessage(content=feedback, tool_call_id=call["id"], status="error"))
        else:
            history.append(HumanMessage(content=feedback))
    raise StructuredOutputError(f"{schema.__name__} failed validation after {retries + 1} attempts: {last_error}")


async def run_tool_loop(
    model: ChatBedrockConverse,
    tools: list[BaseTool],
    messages: list[BaseMessage],
    *,
    max_calls: int,
    agent: str,
) -> tuple[list[dict], Usage, list[dict], str]:
    """Lets the model call tools until it stops, with a call budget and duplicate-call breaker.

    Returns (observations, usage, trace, stop_reason). Observations are plain dicts so the caller
    can summarise them into a fresh prompt instead of replaying tool-use blocks.
    """
    bound = model.bind_tools(tools)
    by_name = {t.name: t for t in tools}
    history = list(messages)
    usage = empty_usage()
    observations: list[dict] = []
    trace: list[dict] = []
    seen: set[str] = set()
    calls = duplicates = 0
    stop_reason = "model_finished"

    for _ in range(max_calls + 2):
        response: AIMessage = await bound.ainvoke(history)
        usage = add_usage(usage, usage_of(response))
        history.append(response)
        if not response.tool_calls:
            break
        halt = False
        for call in response.tool_calls:
            key = f"{call['name']}:{json.dumps(call['args'], sort_keys=True)}"
            entry = {"agent": agent, "tool": call["name"], "args": call["args"], "status": "ok"}
            if key in seen:
                duplicates += 1
                entry["status"] = "duplicate"
                content = "You already made this exact call. Use the earlier result or try a different query."
                if duplicates >= config.MAX_DUPLICATE_TOOL_CALLS:
                    stop_reason, halt = "duplicate_calls", True
            elif calls >= max_calls:
                entry["status"] = "over_budget"
                content = "Tool budget exhausted. Stop calling tools."
                stop_reason, halt = "tool_budget", True
            elif call["name"] not in by_name:
                entry["status"] = "unknown_tool"
                content = f"Unknown tool {call['name']}. Available: {', '.join(by_name)}"
            else:
                seen.add(key)
                calls += 1
                try:
                    content = _tool_text(await by_name[call["name"]].ainvoke(call["args"]))
                except Exception as exc:  # tool errors go back to the model, not up the stack
                    content = f"Error executing tool {call['name']}: {exc}"
                if content.startswith("Error executing tool"):
                    entry["status"] = "error"
                observations.append({"tool": call["name"], "args": call["args"], "result": content})
            trace.append(entry)
            history.append(ToolMessage(content=content, tool_call_id=call["id"]))
        if halt:
            break
    else:
        stop_reason = "turn_limit"
    return observations, usage, trace, stop_reason


def _tool_text(output: Any) -> str:
    if isinstance(output, str):
        return output
    if isinstance(output, list) and all(isinstance(b, dict) and "text" in b for b in output):
        return "\n".join(b["text"] for b in output)
    return json.dumps(output, default=str)


def format_observations(observations: list[dict], limit: int = 2500) -> str:
    chunks = []
    for i, obs in enumerate(observations, 1):
        result = obs["result"]
        if len(result) > limit:
            result = result[:limit] + " …[truncated]"
        chunks.append(f"### Call {i}: {obs['tool']}({json.dumps(obs['args'])})\n{result}")
    return "\n\n".join(chunks) or "(no tool results)"
