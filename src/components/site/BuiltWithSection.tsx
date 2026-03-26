"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { SiteConfig } from "@/lib/types";

interface BuiltWithSectionProps {
  builtWith: SiteConfig["builtWith"];
}

function ProcessStep({
  step,
  index,
  isLast,
}: {
  step: SiteConfig["builtWith"]["processSteps"][number];
  index: number;
  isLast: boolean;
}) {
  const stepRef = useRef(null);
  const stepInView = useInView(stepRef, { once: true, margin: "-30px" });

  return (
    <motion.div
      ref={stepRef}
      initial={{ opacity: 0, y: 20 }}
      animate={stepInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="relative bg-surface border border-border rounded-xl p-5"
    >
      <span className="text-3xl font-bold text-accent/20 font-mono">{step.step}</span>
      <h3 className="text-foreground font-semibold mt-1">{step.title}</h3>
      <p className="text-xs text-muted mt-2 leading-relaxed">{step.description}</p>
      {!isLast && (
        <div className="hidden lg:block absolute top-1/2 -right-2 w-4 text-border">&#8594;</div>
      )}
    </motion.div>
  );
}

function TechCard({
  tech,
  index,
}: {
  tech: SiteConfig["builtWith"]["techStack"][number];
  index: number;
}) {
  const techRef = useRef(null);
  const techInView = useInView(techRef, { once: true, margin: "-30px" });

  return (
    <motion.div
      ref={techRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={techInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="bg-surface border border-border rounded-xl p-5 hover:border-accent/30 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-foreground font-semibold">{tech.name}</h3>
        <span className="text-[10px] font-mono text-muted uppercase tracking-wider">{tech.category}</span>
      </div>
      <p className="text-sm text-muted">{tech.description}</p>
    </motion.div>
  );
}

export default function BuiltWithSection({ builtWith }: BuiltWithSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <section id="built-with" className="py-24 px-6">
      <div className="max-w-6xl mx-auto" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-mono text-accent-light uppercase tracking-widest">Meta</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-3 text-foreground">How This Was Built</h2>
          <p className="text-muted mt-3 max-w-xl mx-auto">
            This application is itself a demonstration of AI-assisted development.
            Built entirely with Claude Code in a single session.
          </p>
        </motion.div>
        <div className="mb-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {builtWith.processSteps.map((step, i) => (
              <ProcessStep
                key={step.step}
                step={step}
                index={i}
                isLast={i === builtWith.processSteps.length - 1}
              />
            ))}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {builtWith.techStack.map((tech, i) => (
            <TechCard key={tech.name} tech={tech} index={i} />
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 bg-accent/5 border border-accent/20 rounded-xl p-8 text-center"
        >
          <p className="text-accent-light font-mono text-sm mb-2">
            &#47;&#47; A note on AI-assisted development
          </p>
          <p className="text-foreground max-w-2xl mx-auto leading-relaxed">
            {builtWith.aiNoteText}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
