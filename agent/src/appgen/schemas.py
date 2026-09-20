from typing import Literal

from pydantic import BaseModel, Field

MatchLevel = Literal["Strong", "Partial", "Gap"]
IconType = Literal["code", "ai", "bolt", "brain", "rocket", "heart"]
SkillIcon = Literal["{ }", ">>", "AI", "$>"]


class Requirement(BaseModel):
    id: str = Field(description="Short stable id: r1, r2, ...")
    text: str = Field(description="The requirement, paraphrased concisely from the job description")
    importance: Literal["must", "nice"]
    keywords: list[str] = Field(description="2-6 search keywords to find matching CV evidence")


class JobAnalysis(BaseModel):
    """Structured reading of the job description."""

    company: str
    position: str = Field(description="Exact job title from the posting")
    short_title: str = Field(description="Job title in at most 4 words")
    company_website: str | None = Field(
        default=None, description="Company homepage URL only if it appears in the job description"
    )
    requirements: list[Requirement] = Field(min_length=5, max_length=8)
    company_signals: list[str] = Field(
        description="Specific facts about the company, product, mission or culture stated in the job description"
    )


class SourcedFact(BaseModel):
    fact: str
    source_url: str


class CompanyBrief(BaseModel):
    """What was learned about the company from its own website."""

    summary: str
    facts: list[SourcedFact] = Field(max_length=10)


class RequirementEvidence(BaseModel):
    requirement_id: str
    claim_ids: list[str] = Field(description="CV claim ids that support this requirement; empty if none")
    assessment: MatchLevel = Field(
        description="Strong: CV directly demonstrates it. Partial: related or smaller-scale experience. Gap: no real evidence."
    )
    rationale: str = Field(description="One sentence explaining the assessment")


class EvidenceMap(BaseModel):
    """Evidence found in the CV for each requirement."""

    items: list[RequirementEvidence]


class ReviewItemDraft(BaseModel):
    requirement_id: str
    requirement: str
    match: MatchLevel
    evidence: str = Field(description="2-3 sentences. For Gap/Partial, state honestly what exists and what is missing")
    evidence_ids: list[str]


class Highlight(BaseModel):
    text: str
    evidence_ids: list[str] = Field(min_length=1)


class RoleDraft(BaseModel):
    role_id: str = Field(description="The [role id] from the CV, e.g. nordfeld-logistics")
    highlights: list[Highlight] = Field(min_length=2, max_length=5)
    tags: list[str] = Field(max_length=8)
    relevance: Literal["high", "very-high"]


class SkillDraft(BaseModel):
    name: str
    evidence: str = Field(description="Under 8 words, e.g. 'university AI chatbot · 15k users'")
    evidence_ids: list[str] = Field(min_length=1)
    job_relevant: bool


class SkillCategoryDraft(BaseModel):
    name: str
    icon: SkillIcon
    skills: list[SkillDraft] = Field(min_length=3, max_length=8)


class ReasonDraft(BaseModel):
    title: str
    body: str = Field(description="2-3 sentences linking something specific about the company to the candidate")
    icon_type: IconType
    evidence_ids: list[str] = Field(description="CV claim ids for the candidate half of the reason")
    company_basis: str = Field(
        description="The exact company fact this reason relies on, copied from the job description or company brief"
    )


class SiteDraft(BaseModel):
    """All LLM-written content of the application site."""

    subtitle: str = Field(description="One line summarising the candidate's strengths relevant to this role")
    subtitle_evidence_ids: list[str] = Field(min_length=1)
    review: list[ReviewItemDraft] = Field(min_length=5, max_length=8)
    experience: list[RoleDraft]
    skills: list[SkillCategoryDraft] = Field(min_length=4, max_length=4)
    why_company: list[ReasonDraft] = Field(min_length=5, max_length=6)


class _Candidate(BaseModel):
    firstName: str
    lastName: str
    subtitle: str
    matchScore: int
    position: str
    company: str


class _ReviewItem(BaseModel):
    requirement: str
    match: str
    score: int
    evidence: str


class _Experience(BaseModel):
    title: str
    company: str
    location: str
    period: str
    highlights: list[str]
    tags: list[str]
    relevance: Literal["high", "very-high"]


class _Skill(BaseModel):
    name: str
    evidence: str
    jobRelevant: bool


class _SkillCategory(BaseModel):
    name: str
    icon: str
    skills: list[_Skill]


class _Reason(BaseModel):
    title: str
    body: str
    iconType: IconType


class SiteConfigModel(BaseModel):
    """Mirror of the SiteConfig TypeScript interface, used to validate any generated site."""

    slug: str
    candidate: _Candidate
    hero: dict
    review: dict[Literal["items"], list[_ReviewItem]]
    experience: dict[Literal["items"], list[_Experience]]
    skills: dict[Literal["categories"], list[_SkillCategory]]
    whyCompany: dict[Literal["reasons"], list[_Reason]]
    education: dict
    contact: dict


class StatementFix(BaseModel):
    ref: str = Field(description="The ref of the flagged statement, exactly as given")
    text: str = Field(
        description="Replacement text. For review[i] the evidence; for experience the highlight; for skills only "
        "the short evidence phrase; for why[i] the body"
    )
    evidence_ids: list[str] = Field(min_length=1)
    match: MatchLevel | None = Field(default=None, description="Only for review[i], if the label must change")
    title: str | None = Field(default=None, description="Only for why[i], if the title must change")


class DraftPatch(BaseModel):
    """Fixes for flagged statements only."""

    fixes: list[StatementFix]


class ClaimIssue(BaseModel):
    ref: str = Field(description="Reference of the checked statement, e.g. review[2] or experience.nordfeld-logistics[1]")
    fails: bool = Field(description="True only if the statement fails the check; never list passing statements")
    problem: str
    suggestion: str


class FactCheckReport(BaseModel):
    """Statements that are not fully supported by their cited sources."""

    issues: list[ClaimIssue]
