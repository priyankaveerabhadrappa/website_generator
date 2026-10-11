"""MCP server exposing the candidate CV and application history as tools.

Run standalone with `uv run appgen-mcp` (stdio) so any MCP client, not only this pipeline, can use it.
"""

from dataclasses import asdict

from mcp.server.fastmcp import FastMCP

from . import memory
from .cv import load_cv, search_claims

mcp = FastMCP("candidate-cv")


@mcp.tool()
def search_cv(query: str, k: int = 6) -> list[dict]:
    """Keyword search over CV claims. Returns the best matching claims with their ids and role ids."""
    return search_claims(load_cv(), query, k=min(max(k, 1), 10))


@mcp.tool()
def get_claim(claim_id: str) -> dict:
    """Return one CV claim by id (e.g. 'nordfeld-logistics-3')."""
    claim = load_cv().claims.get(claim_id)
    if claim is None:
        raise ValueError(f"No claim with id {claim_id!r}")
    return asdict(claim)


@mcp.tool()
def list_roles() -> list[dict]:
    """List every role, project and degree in the CV with its id, title, organisation and period."""
    return [
        {k: v for k, v in asdict(r).items() if k != "claim_ids"} | {"claims": len(r.claim_ids)}
        for r in load_cv().roles.values()
    ]


@mcp.tool()
def get_role(role_id: str) -> dict:
    """Return a role with all of its claims."""
    cv = load_cv()
    role = cv.roles.get(role_id)
    if role is None:
        raise ValueError(f"No role with id {role_id!r}. Call list_roles to see valid ids.")
    data = asdict(role)
    data["claims"] = [asdict(cv.claims[c]) for c in data.pop("claim_ids")]
    return data


@mcp.tool()
def list_past_applications(limit: int = 5) -> list[dict]:
    """Recently published applications: company, position and how each requirement was assessed."""
    return memory.list_applications(limit=min(max(limit, 1), 20))


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
