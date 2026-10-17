import { SiteConfig } from "./types";

export type RunStatus =
  | "running"
  | "awaiting_review"
  | "published"
  | "rejected"
  | "failed"
  | "done";

export interface RunEvent {
  node: string;
  at: string;
  detail: string;
}

export interface ReviewIssue {
  ref: string;
  problem: string;
  suggestion: string;
  source: "rules" | "judge";
}

export interface RunUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read?: number;
  cache_write?: number;
  llm_calls?: number;
}

export interface AgentRun {
  id: string;
  status: RunStatus;
  events: RunEvent[];
  error: string | null;
  company: string | null;
  position: string | null;
  slug: string | null;
  usage: RunUsage;
  cost_usd: number;
  max_human_rounds: number;
  review: {
    site_config: SiteConfig;
    issues: ReviewIssue[];
    halted: string | null;
    human_rounds: number;
  } | null;
}

export interface Preference {
  id: number;
  text: string;
}

export async function agentFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/agent/${path}`, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}
