"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { SiteConfig } from "@/lib/types";

interface EducationSectionProps {
  education: SiteConfig["education"];
}

export default function EducationSection({ education }: EducationSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-mono text-accent-light uppercase tracking-widest">
            Academic Background
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mt-3 text-foreground">
            Education & Research
          </h2>
        </motion.div>
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {education.degrees.map((edu, i) => (
            <motion.div
              key={edu.degree}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-surface border border-border rounded-xl p-6"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-foreground font-semibold">{edu.degree}</h3>
                {edu.inProgress && (
                  <span className="text-[10px] px-2 py-0.5 bg-success/10 text-success rounded-full border border-success/20 font-mono flex-shrink-0">
                    IN PROGRESS
                  </span>
                )}
              </div>
              <p className="text-accent-light text-sm">{edu.institution}</p>
              <p className="text-xs text-muted mt-1">
                {edu.period} | {edu.location}
              </p>
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Thesis</p>
                <p className="text-sm text-foreground/80 leading-relaxed italic">
                  &ldquo;{edu.thesis}&rdquo;
                </p>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {education.research.map((r, i) => (
            <motion.div
              key={r.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
              className="bg-surface-light/50 border border-border rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-foreground font-medium text-sm">{r.title}</h4>
                <span className="text-xs text-muted font-mono">{r.period}</span>
              </div>
              <p className="text-sm text-muted leading-relaxed">{r.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
