"""Builds the SiteConfig JSON consumed by the Next.js renderer.

Facts that must never drift (names, titles, periods, education, contact) come from the CV and
profile.json; only the tailored prose comes from the LLM draft.
"""

from datetime import UTC, datetime

from .cv import CV, slugify
from .schemas import JobAnalysis, SiteDraft

MATCH_SCORE = {"Strong": 90, "Partial": 65, "Gap": 35}
MATCH_WEIGHT = {"Strong": 1.0, "Partial": 0.5, "Gap": 0.0}


def match_score(draft: SiteDraft, analysis: JobAnalysis) -> int:
    importance = {r.id: r.importance for r in analysis.requirements}
    total = earned = 0.0
    for item in draft.review:
        weight = 2.0 if importance.get(item.requirement_id) == "must" else 1.0
        total += weight
        earned += weight * MATCH_WEIGHT[item.match]
    return round(100 * earned / total) if total else 0


def assemble_site(draft: SiteDraft, analysis: JobAnalysis, cv: CV, profile: dict) -> dict:
    drafted = {r.role_id: r for r in draft.experience}
    experience = []
    for role in cv.work_roles:
        d = drafted.get(role.id)
        experience.append(
            {
                "title": role.title,
                "company": role.company,
                "location": role.location,
                "period": role.period,
                "highlights": [h.text for h in d.highlights] if d else [cv.claims[c].text for c in role.claim_ids[:3]],
                "tags": d.tags if d else [],
                "relevance": d.relevance if d else "high",
            }
        )

    return {
        "slug": slugify(analysis.company) or "application",
        "generatedAt": datetime.now(UTC).isoformat(),
        "candidate": {
            **profile["candidate"],
            "subtitle": draft.subtitle,
            "matchScore": match_score(draft, analysis),
            "position": analysis.position,
            "company": analysis.company,
        },
        "hero": {
            "terminalCommand": f"$ appgen review --role='{analysis.short_title}' --company='{analysis.company}'",
            "terminalSteps": [
                "Extracting requirements from the job description...",
                f"Researching {analysis.company}...",
                "Matching requirements to CV evidence over MCP...",
                "Fact-checking every claim against the CV...",
                "Review complete.",
            ],
        },
        "review": {
            "items": [
                {
                    "requirement": item.requirement,
                    "match": item.match,
                    "score": MATCH_SCORE[item.match],
                    "evidence": item.evidence,
                    "evidenceIds": item.evidence_ids,
                }
                for item in draft.review
            ]
        },
        "experience": {"items": experience},
        "skills": {
            "categories": [
                {
                    "name": cat.name,
                    "icon": cat.icon,
                    "skills": [
                        {"name": s.name, "evidence": s.evidence, "jobRelevant": s.job_relevant} for s in cat.skills
                    ],
                }
                for cat in draft.skills
            ]
        },
        "whyCompany": {
            "reasons": [{"title": r.title, "body": r.body, "iconType": r.icon_type} for r in draft.why_company]
        },
        "education": profile["education"],
        "contact": profile["contact"],
    }
