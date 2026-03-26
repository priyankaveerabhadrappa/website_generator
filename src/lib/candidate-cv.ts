import { readFileSync } from "fs";
import { join } from "path";

let _cachedCv: string | null = null;

export function getCandidateCV(): string {
  if (_cachedCv) return _cachedCv;
  const cvPath = join(process.cwd(), "data", "candidate_cv.md");
  _cachedCv = readFileSync(cvPath, "utf-8");
  return _cachedCv;
}
