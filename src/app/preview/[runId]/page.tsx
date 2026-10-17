"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { agentFetch, AgentRun } from "@/lib/agent";
import SiteRenderer from "@/components/site/SiteRenderer";

export default function PreviewPage() {
  const { runId } = useParams<{ runId: string }>();
  const [run, setRun] = useState<AgentRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    agentFetch<AgentRun>(`runs/${runId}`)
      .then(setRun)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load run"));
  }, [runId]);

  if (error) return <p className="p-10 text-red-400">{error}</p>;
  if (!run) return <p className="p-10 text-muted">Loading preview…</p>;
  if (!run.review) {
    return <p className="p-10 text-muted">This run is not waiting for review ({run.status}).</p>;
  }
  return <SiteRenderer config={run.review.site_config} />;
}
