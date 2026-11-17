"use client";

import { SiteConfigSummary } from "@/lib/types";

interface SiteCardProps {
  site: SiteConfigSummary;
  onDelete: (slug: string) => void;
}

export default function SiteCard({ site, onDelete }: SiteCardProps) {
  const date = new Date(site.generatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="bg-surface border border-border rounded-xl p-5 hover:border-accent/30 transition-colors group">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-foreground font-semibold">{site.company}</h3>
          <p className="text-sm text-muted mt-0.5">{site.position}</p>
        </div>
        <div
          className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
            site.matchScore >= 90
              ? "border-success text-success"
              : "border-accent-light text-accent-light"
          }`}
        >
          {site.matchScore}
        </div>
      </div>

      <p className="text-xs text-muted mb-4">{date}</p>

      <div className="flex items-center gap-2">
        <a
          href={`/${site.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-light transition-colors"
        >
          View Site
        </a>
        <button
          onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/${site.slug}`);
          }}
          className="px-4 py-2 border border-border text-muted text-sm rounded-lg hover:border-accent/50 hover:text-foreground transition-colors"
          title="Copy URL"
        >
          Copy
        </button>
        <button
          onClick={() => onDelete(site.slug)}
          className="px-3 py-2 text-red-400/60 text-sm rounded-lg hover:text-red-400 hover:bg-red-400/10 transition-colors"
          title="Delete"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
