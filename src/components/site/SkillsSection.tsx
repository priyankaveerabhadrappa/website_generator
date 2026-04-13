"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { SiteConfig } from "@/lib/types";

interface SkillsSectionProps {
  skills: SiteConfig["skills"];
  company: string;
}

function SkillTag({
  skill,
  index,
  inView,
}: {
  skill: SiteConfig["skills"]["categories"][number]["skills"][number];
  index: number;
  inView: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: index * 0.04 }}
      className={`flex items-baseline gap-1.5 text-sm py-2 border-b border-border/50 last:border-0 ${
        skill.jobRelevant ? "group" : ""
      }`}
    >
      <span
        className={`font-medium shrink-0 ${
          skill.jobRelevant ? "text-success" : "text-foreground"
        }`}
      >
        {skill.name}
      </span>
      {skill.evidence && (
        <>
          <span className="text-border shrink-0">→</span>
          <span className="text-muted text-xs leading-snug">{skill.evidence}</span>
        </>
      )}
      {skill.jobRelevant && (
        <span className="ml-auto shrink-0 text-[10px] px-1.5 py-0.5 bg-success/10 text-success rounded-full border border-success/20 font-mono">
          JOB-RELEVANT
        </span>
      )}
    </motion.div>
  );
}

export default function SkillsSection({ skills, company }: SkillsSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section id="skills" className="py-24 px-6">
      <div className="max-w-6xl mx-auto" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-mono text-accent-light uppercase tracking-widest">
            Technical Profile
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mt-3 text-foreground">
            Skills & Technologies
          </h2>
          <p className="text-muted mt-3">
            Green = directly relevant to what {company} is building.
          </p>
        </motion.div>
        <div className="grid md:grid-cols-2 gap-8">
          {skills.categories.map((category) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="bg-surface border border-border rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-5">
                <span className="w-10 h-10 bg-accent/10 border border-accent/20 rounded-lg flex items-center justify-center text-accent-light font-mono text-sm font-bold">
                  {category.icon}
                </span>
                <h3 className="text-foreground font-semibold text-lg">{category.name}</h3>
              </div>
              <div>
                {category.skills.map((skill, i) => (
                  <SkillTag key={skill.name} skill={skill} index={i} inView={isInView} />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
