"use client";

import { useState, useEffect, useCallback } from "react";
import { SiteConfigSummary } from "@/lib/types";
import { agentFetch, AgentRun } from "@/lib/agent";
import SiteCard from "@/components/dashboard/SiteCard";
import RunPanel from "@/components/dashboard/RunPanel";
import PreferencesPanel from "@/components/dashboard/PreferencesPanel";

const RUN_KEY = "appgen:activeRun";
const POLL_MS = 2000;

async function fetchSites(): Promise<SiteConfigSummary[] | null> {
  try {
    const res = await fetch("/api/sites");
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export default function DashboardPage() {
  const [jobDescription, setJobDescription] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [runId, setRunId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem(RUN_KEY)
  );
  const [run, setRun] = useState<AgentRun | null>(null);
  const [pollKey, setPollKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sites, setSites] = useState<SiteConfigSummary[]>([]);

  const loadSites = useCallback(() => {
    fetchSites().then((data) => data && setSites(data));
  }, []);

  useEffect(loadSites, [loadSites]);

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const data = await agentFetch<AgentRun>(`runs/${runId}`);
        if (cancelled) return;
        setRun(data);
        setError(null);
        if (data.status === "published") loadSites();
        if (data.status === "running") timer = setTimeout(poll, POLL_MS);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not reach the agent service");
        timer = setTimeout(poll, POLL_MS * 3);
      }
    };
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [runId, pollKey, loadSites]);

  const trackRun = (id: string | null) => {
    if (id) localStorage.setItem(RUN_KEY, id);
    else localStorage.removeItem(RUN_KEY);
    setRun(null);
    setRunId(id);
  };

  const handleGenerate = async () => {
    setError(null);
    try {
      const { run_id } = await agentFetch<{ run_id: string }>("runs", {
        method: "POST",
        body: JSON.stringify({ job_description: jobDescription, company_url: companyUrl || null }),
      });
      setJobDescription("");
      setCompanyUrl("");
      trackRun(run_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const handleDecision = async (action: "approve" | "revise" | "reject", feedback?: string) => {
    if (!runId) return;
    try {
      await agentFetch(`runs/${runId}/review`, {
        method: "POST",
        body: JSON.stringify({ action, feedback }),
      });
      setRun((prev) => (prev ? { ...prev, status: "running", review: null } : prev));
      setPollKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decision failed");
    }
  };

  const handleDelete = async (slug: string) => {
    try {
      await fetch(`/api/sites/${slug}`, { method: "DELETE" });
      setSites((prev) => prev.filter((s) => s.slug !== slug));
    } catch {
      // silent fail
    }
  };

  const busy = run?.status === "running" || run?.status === "awaiting_review";

  return (
    <div className="min-h-screen bg-[#0a0a0f] grid-bg">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
            Application <span className="text-accent-light">Generator</span>
          </h1>
          <p className="text-muted mt-3 max-w-lg mx-auto">
            Paste a job description. A team of agents researches the company, maps every
            requirement to CV evidence, writes the site and fact-checks it before you approve.
          </p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6 mb-8">
          <label className="block text-sm text-foreground font-medium mb-3">
            Job Description
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the full job posting here..."
            disabled={busy}
            className="w-full h-64 bg-surface-light border border-border rounded-lg px-4 py-3 text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent/50 resize-none disabled:opacity-50 transition-colors"
          />
          <label className="block text-sm text-foreground font-medium mt-4 mb-2">
            Company website <span className="text-muted font-normal">(optional, enables research)</span>
          </label>
          <input
            value={companyUrl}
            onChange={(e) => setCompanyUrl(e.target.value)}
            placeholder="https://www.example.com"
            disabled={busy}
            className="w-full bg-surface-light border border-border rounded-lg px-4 py-2 text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent/50 disabled:opacity-50"
          />

          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={handleGenerate}
              disabled={busy || !jobDescription.trim()}
              className="px-8 py-3 bg-accent text-white font-medium rounded-lg hover:bg-accent-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed glow-accent"
            >
              {busy ? "Run in progress" : "Generate Application"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-8">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {run && (
          <RunPanel run={run} onDecision={handleDecision} onDismiss={() => trackRun(null)} />
        )}

        <PreferencesPanel />

        {sites.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-6">
              Generated Applications
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {sites
                .sort(
                  (a, b) =>
                    new Date(b.generatedAt).getTime() -
                    new Date(a.generatedAt).getTime()
                )
                .map((site) => (
                  <SiteCard
                    key={site.slug}
                    site={site}
                    onDelete={handleDelete}
                  />
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
