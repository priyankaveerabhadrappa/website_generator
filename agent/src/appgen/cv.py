"""Parses candidate_cv.md into addressable claims.

Every bullet (and every profile sentence / skills line) becomes a claim with a stable ID such as
`nordfeld-logistics-3`. Generated text must cite these IDs, which is what makes fact-checking mechanical.
"""

import json
import re
import unicodedata
from dataclasses import asdict, dataclass, field
from functools import lru_cache

from rank_bm25 import BM25Okapi

from .config import CV_PATH, PROFILE_PATH


@dataclass
class Claim:
    id: str
    text: str
    section: str
    role_id: str | None = None


@dataclass
class Role:
    id: str
    kind: str  # "work" | "project" | "education"
    title: str
    company: str
    location: str
    period: str
    claim_ids: list[str] = field(default_factory=list)


@dataclass
class CV:
    raw: str
    claims: dict[str, Claim]
    roles: dict[str, Role]

    @property
    def work_roles(self) -> list[Role]:
        return [r for r in self.roles.values() if r.kind == "work"]

    def claim_text(self, claim_id: str) -> str | None:
        claim = self.claims.get(claim_id)
        return claim.text if claim else None

    def annotated(self) -> str:
        """CV rendered with claim IDs, used as the cached system context for the writer."""
        lines: list[str] = []
        current_section = None
        current_role = None
        for claim in self.claims.values():
            if claim.section != current_section:
                current_section = claim.section
                lines.append(f"\n## {claim.section}")
                current_role = None
            if claim.role_id and claim.role_id != current_role:
                current_role = claim.role_id
                role = self.roles[claim.role_id]
                header = " | ".join(p for p in (role.title, role.company, role.location, role.period) if p)
                lines.append(f"\n### [{role.id}] {header}")
            if claim.id != claim.role_id:
                lines.append(f"- [{claim.id}] {claim.text}")
        return "\n".join(lines).strip()


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9\s-]", "", text).lower()
    return re.sub(r"[\s-]+", "-", text).strip("-")


def _role_id(company: str, title: str) -> str:
    paren = re.search(r"\(([^)]+)\)", company)
    if paren:
        return slugify(paren.group(1))
    if "," in company:
        return slugify(company.split(",")[-1])
    return re.sub(r"-(gmbh|ag|inc|ltd|llc)$", "", slugify(company or title))


def _split_sentences(paragraph: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+(?=[A-Z])", paragraph) if s.strip()]


def parse_cv(raw: str) -> CV:
    claims: dict[str, Claim] = {}
    roles: dict[str, Role] = {}
    section = ""
    role: Role | None = None
    counters: dict[str, int] = {}

    def add_claim(prefix: str, text: str, role_id: str | None) -> None:
        counters[prefix] = counters.get(prefix, 0) + 1
        claim_id = f"{prefix}-{counters[prefix]}"
        claims[claim_id] = Claim(claim_id, text, section, role_id)
        if role_id:
            roles[role_id].claim_ids.append(claim_id)

    for line in raw.splitlines():
        stripped = line.strip()
        if stripped.startswith("## "):
            section = stripped[3:].strip()
            role = None
            continue
        if stripped.startswith("### "):
            parts = [p.strip() for p in stripped[4:].replace("||", " ").split("|")]
            kind = {"Work Experience": "work", "Education": "education"}.get(section, "project")
            if kind == "work":
                title, company, location, period = (parts + [""] * 4)[:4]
                rid = _role_id(company, title)
            elif kind == "education":
                title, company, location, period = (parts + [""] * 4)[:4]
                rid = "edu-" + slugify(title).split("-")[0]
            else:
                title, period = parts[0], parts[-1]
                company = parts[1] if len(parts) > 2 else ""
                location = ""
                rid = "-".join(slugify(title).split("-")[:3])
            role = Role(rid, kind, title, company, location, period)
            roles[rid] = role
            # The role itself is citable (e.g. "edu-msc" for enrolment), separate from its bullets.
            header = ", ".join(p for p in (f"{title} at {company}" if company else title, location, period) if p)
            claims[rid] = Claim(rid, header, section, rid)
            continue
        if not stripped or stripped == "---":
            continue
        if section == "Profile":
            for sentence in _split_sentences(stripped):
                add_claim("profile", sentence, None)
        elif stripped.startswith("- "):
            text = stripped[2:].strip()
            if role:
                add_claim(role.id, text, role.id)
            elif section == "Technical Skills":
                add_claim("skills", text, None)
            elif section == "Language Skills":
                add_claim("lang", text, None)
    return CV(raw=raw, claims=claims, roles=roles)


@lru_cache(maxsize=1)
def _load(mtime: float) -> CV:
    return parse_cv(CV_PATH.read_text(encoding="utf-8"))


def load_cv() -> CV:
    return _load(CV_PATH.stat().st_mtime)


def load_profile() -> dict:
    return json.loads(PROFILE_PATH.read_text(encoding="utf-8"))


_TOKEN = re.compile(r"[a-z0-9+#.]+")


def _tokens(text: str) -> list[str]:
    return _TOKEN.findall(text.lower())


def search_claims(cv: CV, query: str, k: int = 6) -> list[dict]:
    claims = list(cv.claims.values())
    bm25 = BM25Okapi([_tokens(f"{c.text} {c.role_id or ''}") for c in claims])
    scores = bm25.get_scores(_tokens(query))
    ranked = sorted(zip(scores, claims), key=lambda pair: pair[0], reverse=True)
    return [
        {**asdict(c), "score": round(float(s), 2)}
        for s, c in ranked[:k]
        if s > 0
    ]
