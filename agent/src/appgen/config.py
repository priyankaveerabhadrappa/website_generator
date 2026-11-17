import os
from pathlib import Path

from dotenv import load_dotenv

AGENT_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = AGENT_DIR.parent
DATA_DIR = REPO_ROOT / "data"
SITES_DIR = DATA_DIR / "sites"
SAMPLE_DIR = DATA_DIR / "sample"


def _data_file(name: str) -> Path:
    """Your own data/<name> if present (gitignored), otherwise the committed sample in data/sample/."""
    own = DATA_DIR / name
    return own if own.exists() else SAMPLE_DIR / name


CV_PATH = _data_file("candidate_cv.md")
PROFILE_PATH = _data_file("profile.json")
STATE_DIR = AGENT_DIR / ".state"

# The Next.js app keeps AWS credentials in .env.local; reuse them so both halves share one setup.
# Variables already set in the environment (e.g. AWS_PROFILE) take precedence.
load_dotenv(REPO_ROOT / ".env.local", override=False)

AWS_REGION = os.getenv("AWS_REGION", "eu-central-1")
MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "eu.anthropic.claude-sonnet-4-6")
JUDGE_MODEL_ID = os.getenv("BEDROCK_JUDGE_MODEL_ID", MODEL_ID)

# USD per million tokens, used only for reporting.
PRICE_INPUT_PER_M = float(os.getenv("PRICE_INPUT_PER_M", "3.0"))
PRICE_OUTPUT_PER_M = float(os.getenv("PRICE_OUTPUT_PER_M", "15.0"))
PRICE_CACHE_READ_PER_M = float(os.getenv("PRICE_CACHE_READ_PER_M", "0.3"))
PRICE_CACHE_WRITE_PER_M = float(os.getenv("PRICE_CACHE_WRITE_PER_M", "3.75"))

# Circuit breakers.
MAX_FACTCHECK_REVISIONS = int(os.getenv("MAX_FACTCHECK_REVISIONS", "3"))
MAX_HUMAN_REVISIONS = int(os.getenv("MAX_HUMAN_REVISIONS", "3"))
MAX_EVIDENCE_TOOL_CALLS = int(os.getenv("MAX_EVIDENCE_TOOL_CALLS", "20"))
MAX_RESEARCH_FETCHES = int(os.getenv("MAX_RESEARCH_FETCHES", "3"))
MAX_DUPLICATE_TOOL_CALLS = 2
MAX_STRUCTURED_RETRIES = 2
TOKEN_BUDGET = int(os.getenv("TOKEN_BUDGET", "400000"))
RECURSION_LIMIT = 40
