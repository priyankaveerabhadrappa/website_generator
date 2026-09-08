"use client";

import { useState, useEffect, useCallback } from "react";
import { SiteConfigSummary } from "@/lib/types";
import SiteCard from "@/components/dashboard/SiteCard";

const progressMessages = [
  "Analyzing job description...",
  "Extracting requirements...",
  "Matching candidate profile...",
  "Generating review scores...",
  "Crafting motivation section...",
  "Building application website...",
  "Almost there...",
];

export default function DashboardPage() {
  const [jobDescription, setJobDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successSlug, setSuccessSlug] = useState<string | null>(null);
  const [sites, setSites] = useState<SiteConfigSummary[]>([]);

  const loadSites = useCallback(async () => {
    try {
      const res = await fetch("/api/sites");
      if (res.ok) {
        const data = await res.json();
        setSites(data);
      }
    } catch {
      // silent fail on list
    }
  }, []);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  useEffect(() => {
    if (!generating) return;
    const interval = setInterval(() => {
      setProgressIndex((i) => (i + 1) % progressMessages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [generating]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setSuccessSlug(null);
    setProgressIndex(0);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }

      const data = await res.json();
      setSuccessSlug(data.slug);
      setJobDescription("");
      loadSites();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
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

  return (
    <div className="min-h-screen bg-[#0a0a0f] grid-bg">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
            Application <span className="text-accent-light">Generator</span>
          </h1>
          <p className="text-muted mt-3 max-w-lg mx-auto">
            Paste a job description. Get a live, personalized application website.
            Powered by Claude + Next.js.
          </p>
        </div>

        {/* Form */}
        <div className="bg-surface border border-border rounded-xl p-6 mb-8">
          <label className="block text-sm text-foreground font-medium mb-3">
            Job Description
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the full job posting here..."
            disabled={generating}
            className="w-full h-64 bg-surface-light border border-border rounded-lg px-4 py-3 text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent/50 resize-none disabled:opacity-50 transition-colors"
          />

          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={handleGenerate}
              disabled={generating || !jobDescription.trim()}
              className="px-8 py-3 bg-accent text-white font-medium rounded-lg hover:bg-accent-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed glow-accent"
            >
              {generating ? "Generating..." : "Generate Application"}
            </button>

            {generating && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-muted font-mono">
                  {progressMessages[progressIndex]}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Success */}
        {successSlug && (
          <div className="bg-success/10 border border-success/30 rounded-xl p-6 mb-8 text-center">
            <p className="text-success font-semibold mb-2">
              Application site generated!
            </p>
            <a
              href={`/${successSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-light hover:underline font-mono text-sm"
            >
              {`https://priyanka-veerabhadra.com/${successSlug}`}
            </a>
            <p className="text-muted text-xs mt-3">
              Preview it locally, then commit{" "}
              <code className="font-mono">data/sites/{successSlug}.json</code>{" "}
              and push to publish it at the URL above.
            </p>
            <div className="mt-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `https://priyanka-veerabhadra.com/${successSlug}`
                  );
                }}
                className="text-xs text-muted hover:text-foreground transition-colors"
              >
                Copy to clipboard
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-8">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Sites list */}
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
