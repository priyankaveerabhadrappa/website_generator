"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { SiteConfig } from "@/lib/types";

interface ReviewSectionProps {
  review: SiteConfig["review"];
  company: string;
}

function matchColor(match: string): string {
  if (match === "Partial") return "text-amber-300";
  if (match === "Gap") return "text-muted";
  return match.startsWith("Exceptional") ? "text-success" : "text-accent-light";
}

function matchLabel(match: string): string {
  if (match === "Strong") return "Strong Match";
  if (match === "Partial") return "Partial Match";
  if (match === "Gap") return "Growing Into";
  return match;
}

function ReviewCard({
  item,
  index,
}: {
  item: SiteConfig["review"]["items"][number];
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="bg-surface border border-border rounded-xl p-6 hover:border-accent/30 transition-colors"
    >
      <div className="mb-3">
        <h3 className="text-foreground font-semibold text-lg mb-1">{item.requirement}</h3>
        <span
          className={`text-xs font-mono uppercase tracking-wider ${matchColor(item.match)}`}
        >
          {matchLabel(item.match)}
        </span>
      </div>
      <p className="text-sm text-muted leading-relaxed">{item.evidence}</p>
    </motion.div>
  );
}

export default function ReviewSection({ review }: ReviewSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <section id="review" className="py-24 px-6">
      <div className="max-w-6xl mx-auto" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-mono text-accent-light uppercase tracking-widest">
            AI Candidate Review
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mt-3 text-foreground">
            Requirements vs. Reality
          </h2>
        </motion.div>
        <div className="grid md:grid-cols-2 gap-6">
          {review.items.map((item, i) => (
            <ReviewCard key={item.requirement} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
