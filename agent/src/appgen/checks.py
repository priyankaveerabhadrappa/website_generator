"""Rule-based checks that need no LLM: citations exist, roles are complete, no inflated tenure."""

import re

from .cv import CV
from .schemas import DraftPatch, JobAnalysis, SiteDraft

YEARS_PATTERN = re.compile(r"\b(\d+)\s*\+?\s*years?\b", re.IGNORECASE)
DASHES = ("\u2014", "\u2013")


def iter_statements(draft: SiteDraft):
    """Yields (ref, text, evidence_ids) for every statement in the draft that makes a claim."""
    yield "subtitle", draft.subtitle, draft.subtitle_evidence_ids
    for i, item in enumerate(draft.review):
        yield f"review[{i}]", item.evidence, item.evidence_ids
    for role in draft.experience:
        for j, h in enumerate(role.highlights):
            yield f"experience.{role.role_id}[{j}]", h.text, h.evidence_ids
    for c, cat in enumerate(draft.skills):
        for k, skill in enumerate(cat.skills):
            yield f"skills[{c}][{k}]", f"{skill.name}: {skill.evidence}", skill.evidence_ids
    for i, reason in enumerate(draft.why_company):
        yield f"why[{i}]", f"{reason.title}. {reason.body}", reason.evidence_ids


REF_PATTERN = re.compile(r"^(subtitle|review\[(\d+)\]|experience\.([\w-]+)\[(\d+)\]|skills\[(\d+)\]\[(\d+)\]|why\[(\d+)\])$")


def is_patchable(ref: str) -> bool:
    return bool(REF_PATTERN.match(ref))


def apply_patch(draft: SiteDraft, patch: DraftPatch) -> SiteDraft:
    """Applies statement-level fixes; unknown or out-of-range refs are ignored (the issue stays open)."""
    data = draft.model_copy(deep=True)
    roles = {r.role_id: r for r in data.experience}
    for fix in patch.fixes:
        m = REF_PATTERN.match(fix.ref)
        if not m:
            continue
        try:
            if fix.ref == "subtitle":
                data.subtitle, data.subtitle_evidence_ids = fix.text, fix.evidence_ids
            elif m.group(2) is not None:
                item = data.review[int(m.group(2))]
                item.evidence, item.evidence_ids = fix.text, fix.evidence_ids
                item.match = fix.match or item.match
            elif m.group(3) is not None:
                h = roles[m.group(3)].highlights[int(m.group(4))]
                h.text, h.evidence_ids = fix.text, fix.evidence_ids
            elif m.group(5) is not None:
                s = data.skills[int(m.group(5))].skills[int(m.group(6))]
                s.evidence, s.evidence_ids = fix.text, fix.evidence_ids
            else:
                r = data.why_company[int(m.group(7))]
                r.body, r.evidence_ids = fix.text, fix.evidence_ids
                r.title = fix.title or r.title
        except (IndexError, KeyError):
            continue
    return SiteDraft.model_validate(data.model_dump())


def _cv_years(cv: CV) -> set[int]:
    return {int(m.group(1)) for c in cv.claims.values() for m in YEARS_PATTERN.finditer(c.text)}


def run_checks(draft: SiteDraft, cv: CV, analysis: JobAnalysis) -> list[dict]:
    issues: list[dict] = []

    def issue(ref: str, problem: str, suggestion: str) -> None:
        issues.append({"ref": ref, "problem": problem, "suggestion": suggestion, "source": "rules"})

    allowed_years = _cv_years(cv)
    for ref, text, ids in iter_statements(draft):
        unknown = [i for i in ids if i not in cv.claims]
        if unknown:
            issue(ref, f"Cites claim ids that do not exist: {unknown}", "Cite only [ids] that appear in the CV.")
        for m in YEARS_PATTERN.finditer(text):
            if int(m.group(1)) not in allowed_years:
                issue(ref, f"States '{m.group(0)}', which the CV does not support.", "Describe concrete work instead of tenure.")

    for i, item in enumerate(draft.review):
        if item.match != "Gap" and not item.evidence_ids:
            issue(f"review[{i}]", f"Marked {item.match} without citing any evidence.", "Cite claim ids or mark it Gap.")

    work_ids = [r.id for r in cv.work_roles]
    drafted = [r.role_id for r in draft.experience]
    for missing in [r for r in work_ids if r not in drafted]:
        issue("experience", f"Role '{missing}' is missing.", "Include every work role from the CV.")
    for extra in [r for r in drafted if r not in work_ids]:
        issue(f"experience.{extra}", f"'{extra}' is not a work role id.", f"Use one of: {', '.join(work_ids)}")

    covered = {item.requirement_id for item in draft.review}
    for req in analysis.requirements:
        if req.importance == "must" and req.id not in covered:
            issue("review", f"Must-have requirement {req.id} ('{req.text}') is not reviewed.", "Add a review item for it.")

    for i, reason in enumerate(draft.why_company):
        if any(d in reason.title + reason.body for d in DASHES):
            issue(f"why[{i}]", "Uses em or en dashes.", "Rewrite as natural prose without dashes.")
    return issues
