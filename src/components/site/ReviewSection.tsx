"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { SiteConfig } from "@/lib/types";

interface ReviewSectionProps {
  review: SiteConfig["review"];
  company: string;
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
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-foreground font-semibold text-lg">{item.requirement}</h3>
          <span
            className={`text-xs font-mono uppercase tracking-wider ${
              item.score >= 96 ? "text-success" : "text-accent-light"
            }`}
          >
            {item.match}
          </span>
        </div>
        <div className="flex-shrink-0">
          <div
            className={`w-14 h-14 rounded-full border-2 flex items-center justify-center text-sm font-bold ${
              item.score >= 96
                ? "border-success text-success"
                : "border-accent-light text-accent-light"
            }`}
          >
            {item.score}
          </div>
        </div>
      </div>
      <div className="h-1.5 bg-surface-light rounded-full overflow-hidden mb-4">
        <motion.div
          initial={{ width: 0 }}
          animate={isInView ? { width: `${item.score}%` } : {}}
          transition={{ duration: 1, delay: index * 0.1 + 0.3, ease: "easeOut" }}
          className={`h-full rounded-full ${item.score >= 96 ? "bg-success" : "bg-accent"}`}
        />
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
          <p className="text-muted mt-3 max-w-xl mx-auto">
            Every requirement from the job posting, matched against real experience.
            No fluff -- just evidence.
          </p>
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
