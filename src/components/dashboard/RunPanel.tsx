"use client";

import { useState } from "react";
import { AgentRun } from "@/lib/agent";

const STEP_LABELS: Record<string, string> = {
  analyze_job: "Requirements",
  research_company: "Company research",
  gather_evidence: "CV evidence (MCP)",
  write: "Writer",
  fact_check: "Fact-check",
  assemble: "Assemble",
  publish: "Publish",
};

const MATCH_STYLES: Record<string, string> = {
  Strong: "text-success border-success/30 bg-success/10",
  Partial: "text-amber-300 border-amber-300/30 bg-amber-300/10",
  Gap: "text-muted border-border bg-surface-light",
};

interface RunPanelProps {
  run: AgentRun;
  onDecision: (action: "approve" | "revise" | "reject", feedback?: string) => Promise<void>;
  onDismiss: () => void;
}

export default function RunPanel({ run, onDecision, onDismiss }: RunPanelProps) {
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const review = run.status === "awaiting_review" ? run.review : null;
  const finished = ["published", "rejected", "failed", "done"].includes(run.status);

  const decide = async (action: "approve" | "revise" | "reject") => {
    setBusy(true);
    try {
      await onDecision(action, action === "revise" ? feedback : undefined);
      if (action === "revise") setFeedback("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-6 mb-8">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-foreground font-semibold">
            {run.company ? `${run.position} at ${run.company}` : "New application"}
          </h2>
          <p className="text-xs text-muted font-mono mt-1">
            run {run.id} · {run.status.replace("_", " ")} · {run.usage.llm_calls ?? 0} LLM calls · $
            {run.cost_usd.toFixed(2)}
          </p>
        </div>
        {finished && (
          <button onClick={onDismiss} className="text-xs text-muted hover:text-foreground">
            Dismiss
          </button>
        )}
      </div>

      <ol className="space-y-2 mb-6">
        {run.events.map((event, i) => (
          <li key={i} className="flex gap-3 text-sm">
            <span className="w-36 flex-shrink-0 text-accent-light font-mono text-xs pt-0.5">
              {STEP_LABELS[event.node] ?? event.node}
            </span>
            <span className="text-muted">{event.detail}</span>
          </li>
        ))}
        {run.status === "running" && (
          <li className="flex items-center gap-2 text-sm text-muted">
            <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            Working…
          </li>
        )}
      </ol>

      {run.status === "failed" && <p className="text-red-400 text-sm">{run.error}</p>}

      {run.status === "published" && run.slug && (
        <div className="bg-success/10 border border-success/30 rounded-lg p-4 text-center">
          <p className="text-success font-semibold mb-1">Published</p>
          <a
            href={`/${run.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-light hover:underline font-mono text-sm"
          >
            {`/${run.slug}`}
          </a>
          <p className="text-muted text-xs mt-2">
            Commit <code className="font-mono">data/sites/{run.slug}.json</code> and push to publish it.
          </p>
        </div>
      )}

      {review && (
        <div className="border-t border-border pt-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-foreground font-medium">Review before publishing</h3>
            <a
              href={`/preview/${run.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent-light hover:underline"
            >
              Open full preview
            </a>
          </div>

          <div className="space-y-2 mb-5">
            {review.site_config.review.items.map((item) => (
              <div key={item.requirement} className="flex items-start gap-3 text-sm">
                <span
                  className={`w-16 flex-shrink-0 text-center text-[10px] font-mono uppercase py-0.5 rounded border ${
                    MATCH_STYLES[item.match] ?? MATCH_STYLES.Strong
                  }`}
                >
                  {item.match}
                </span>
                <span className="text-foreground/90">{item.requirement}</span>
              </div>
            ))}
          </div>

          {review.halted && (
            <p className="text-amber-300 text-sm mb-3">
              Stopped by the {review.halted.replace("_", " ")} circuit breaker with issues still open.
            </p>
          )}
          {review.issues.length > 0 ? (
            <div className="mb-5">
              <p className="text-sm text-foreground mb-2">
                {review.issues.length} statement(s) the fact-checker could not verify:
              </p>
              <ul className="space-y-2">
                {review.issues.map((issue, i) => (
                  <li key={i} className="text-xs bg-surface-light border border-border rounded-lg p-3">
                    <span className="font-mono text-accent-light">{issue.ref}</span>{" "}
                    <span className="text-muted">({issue.source})</span>
                    <p className="text-foreground/80 mt-1">{issue.problem}</p>
                    <p className="text-muted mt-1">Suggestion: {issue.suggestion}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-success text-sm mb-5">Every statement passed the fact-check.</p>
          )}

          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Feedback for a revision, e.g. 'Lead with the evaluation work' or 'Fix the flagged statements'"
            disabled={busy || review.human_rounds >= run.max_human_rounds}
            className="w-full h-20 bg-surface-light border border-border rounded-lg px-3 py-2 text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent/50 resize-none disabled:opacity-50 mb-3"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => decide("approve")}
              disabled={busy}
              className="px-6 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-light transition-colors disabled:opacity-40"
            >
              Approve &amp; publish
            </button>
            <button
              onClick={() => decide("revise")}
              disabled={busy || !feedback.trim() || review.human_rounds >= run.max_human_rounds}
              className="px-6 py-2 border border-border text-foreground text-sm rounded-lg hover:border-accent/50 transition-colors disabled:opacity-40"
            >
              Request changes ({run.max_human_rounds - review.human_rounds} left)
            </button>
            <button
              onClick={() => decide("reject")}
              disabled={busy}
              className="px-4 py-2 text-red-400/70 text-sm rounded-lg hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
