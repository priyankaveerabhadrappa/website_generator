"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { SiteConfig } from "@/lib/types";

interface ExperienceSectionProps {
  experience: SiteConfig["experience"];
}

function ExperienceCard({
  exp,
  index,
}: {
  exp: SiteConfig["experience"]["items"][number];
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-30px" });
  const [expanded, setExpanded] = useState(index < 2);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -30 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="relative pl-8 pb-10 last:pb-0"
    >
      <div className="absolute left-0 top-2 bottom-0 w-px bg-border" />
      <div
        className={`absolute left-0 top-2 w-2.5 h-2.5 rounded-full -translate-x-1 ${
          exp.relevance === "very-high" ? "bg-success glow-success" : "bg-accent"
        }`}
      />
      <div
        className="bg-surface border border-border rounded-xl p-6 cursor-pointer hover:border-accent/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
          <div>
            <h3 className="text-foreground font-semibold">{exp.title}</h3>
            <p className="text-accent-light text-sm">{exp.company}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted flex-shrink-0">
            <span>{exp.period}</span>
            <span className="text-border">|</span>
            <span>{exp.location}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {exp.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 bg-accent/10 text-accent-light rounded-full border border-accent/20"
            >
              {tag}
            </span>
          ))}
        </div>
        <motion.div
          initial={false}
          animate={{ height: expanded ? "auto" : 0, opacity: expanded ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <ul className="space-y-2 mt-2">
            {exp.highlights.map((h, i) => (
              <li key={i} className="text-sm text-muted leading-relaxed flex gap-2">
                <span className="text-accent-light mt-1 flex-shrink-0">&#8250;</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </motion.div>
        <button className="text-xs text-accent-light mt-2 hover:underline">
          {expanded ? "Collapse" : "Expand details"}
        </button>
      </div>
    </motion.div>
  );
}

export default function ExperienceSection({ experience }: ExperienceSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <section id="experience" className="py-24 px-6 bg-surface-light/30">
      <div className="max-w-4xl mx-auto" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-mono text-accent-light uppercase tracking-widest">
            Work History
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mt-3 text-foreground">
            Experience Timeline
          </h2>
          <p className="text-muted mt-3">
            {experience.items.length} roles. All hands-on engineering. Click to expand.
          </p>
        </motion.div>
        <div>
          {experience.items.map((exp, i) => (
            <ExperienceCard key={exp.company + exp.title} exp={exp} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
