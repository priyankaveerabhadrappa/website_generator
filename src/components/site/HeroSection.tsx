"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import ScoreRing from "./ScoreRing";
import { SiteConfig } from "@/lib/types";

interface HeroSectionProps {
  candidate: SiteConfig["candidate"];
  hero: SiteConfig["hero"];
}

export default function HeroSection({ candidate, hero }: HeroSectionProps) {
  const allLines = [hero.terminalCommand, ...hero.terminalSteps];
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [showScore, setShowScore] = useState(false);

  useEffect(() => {
    if (currentLine >= allLines.length) {
      setTimeout(() => setShowScore(true), 400);
      return;
    }
    const line = allLines[currentLine];
    if (currentChar < line.length) {
      const speed = currentLine === 0 ? 30 : 15;
      const timeout = setTimeout(() => setCurrentChar((c) => c + 1), speed);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => {
        setDisplayedLines((prev) => [...prev, line]);
        setCurrentLine((l) => l + 1);
        setCurrentChar(0);
      }, currentLine === 0 ? 600 : 300);
      return () => clearTimeout(timeout);
    }
  }, [currentLine, currentChar, allLines]);

  return (
    <section className="relative min-h-screen flex items-center justify-center grid-bg overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="max-w-4xl mx-auto px-6 pt-24 pb-16 w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="bg-surface border border-border rounded-xl overflow-hidden"
        >
          <div className="flex items-center gap-2 px-4 py-3 bg-surface-light border-b border-border">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
            <span className="ml-3 text-xs text-muted font-mono">
              claude-code ~ candidate-review
            </span>
          </div>
          <div className="p-6 font-mono text-sm leading-relaxed min-h-[220px]">
            {displayedLines.map((line, i) => (
              <div
                key={i}
                className={`${
                  i === 0
                    ? "text-accent-light"
                    : line === "Review complete."
                      ? "text-success"
                      : "text-muted"
                }`}
              >
                {line}
              </div>
            ))}
            {currentLine < allLines.length && (
              <div className={`cursor-blink ${currentLine === 0 ? "text-accent-light" : "text-muted"}`}>
                {allLines[currentLine].slice(0, currentChar)}
              </div>
            )}
          </div>
        </motion.div>

        {showScore && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mt-12 flex flex-col md:flex-row items-center gap-10"
          >
            <ScoreRing score={candidate.matchScore} label="Candidate Match" />
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                <span className="text-foreground">{candidate.firstName}</span>
                <br />
                <span className="text-accent-light">{candidate.lastName}</span>
              </h1>
              <p className="mt-4 text-lg text-muted max-w-lg">
                {candidate.subtitle}
                <br />
                Applying for{" "}
                <span className="text-foreground font-medium">
                  {candidate.position}
                </span>{" "}
                at {candidate.company}.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 justify-center md:justify-start">
                <a
                  href="#review"
                  className="px-6 py-2.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-light transition-colors glow-accent"
                >
                  View Full Review
                </a>
                <a
                  href="#contact"
                  className="px-6 py-2.5 border border-border text-foreground text-sm font-medium rounded-lg hover:border-accent/50 hover:bg-accent/5 transition-colors"
                >
                  Get in Touch
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {showScore && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-5 h-8 border-2 border-border rounded-full flex justify-center pt-1"
          >
            <div className="w-1 h-2 bg-muted rounded-full" />
          </motion.div>
        </motion.div>
      )}
    </section>
  );
}
