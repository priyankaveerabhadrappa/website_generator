"use client";

import { useCallback, useEffect, useState } from "react";
import { agentFetch, Preference } from "@/lib/agent";

export default function PreferencesPanel() {
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    agentFetch<Preference[]>("preferences")
      .then((data) => {
        setPreferences(data);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load preferences"));
  }, []);

  useEffect(load, [load]);

  const add = async () => {
    if (!text.trim()) return;
    await agentFetch("preferences", { method: "POST", body: JSON.stringify({ text }) });
    setText("");
    load();
  };

  const remove = async (id: number) => {
    await agentFetch(`preferences/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-6 mb-8">
      <h2 className="text-foreground font-medium mb-1">Writer preferences</h2>
      <p className="text-xs text-muted mb-4">
        Remembered across applications and given to the writer agent on every run.
      </p>
      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
      <ul className="space-y-2 mb-4">
        {preferences.map((p) => (
          <li key={p.id} className="flex items-start justify-between gap-3 text-sm text-foreground/90">
            <span>{p.text}</span>
            <button onClick={() => remove(p.id)} className="text-muted hover:text-red-400" title="Remove">
              &times;
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="e.g. Never claim production LangGraph experience"
          className="flex-1 bg-surface-light border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent/50"
        />
        <button
          onClick={add}
          disabled={!text.trim()}
          className="px-4 py-2 border border-border text-sm text-foreground rounded-lg hover:border-accent/50 disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}
