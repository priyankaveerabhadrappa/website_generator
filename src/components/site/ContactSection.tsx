"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { SiteConfig } from "@/lib/types";

interface ContactSectionProps {
  contact: SiteConfig["contact"];
  company: string;
}

export default function ContactSection({ contact, company }: ContactSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <section id="contact" className="py-24 px-6 bg-surface-light/30">
      <div className="max-w-3xl mx-auto text-center" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="text-xs font-mono text-accent-light uppercase tracking-widest">
            Let&apos;s Talk
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mt-3 text-foreground">
            Ready to Join {company}
          </h2>
          <p className="text-muted mt-4 max-w-lg mx-auto leading-relaxed">
            {contact.locationDetail}{" "}
            {contact.locationAvailability}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={`mailto:${contact.email}`}
              className="w-full sm:w-auto px-8 py-3 bg-accent text-white font-medium rounded-lg hover:bg-accent-light transition-colors glow-accent text-center"
            >
              {contact.email}
            </a>
            <a
              href={contact.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-3 border border-border text-foreground font-medium rounded-lg hover:border-accent/50 hover:bg-accent/5 transition-colors text-center"
            >
              LinkedIn Profile
            </a>
          </div>

          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-muted">
            <span>{contact.phone}</span>
          </div>

          <div className="mt-10 flex items-center justify-center gap-4">
            {contact.languages.map((lang) => (
              <div key={lang.language} className="px-4 py-2 bg-surface border border-border rounded-lg">
                <span className="text-xs text-muted block">{lang.language}</span>
                <span className="text-sm text-foreground font-medium">{lang.level}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5 }}
          className="mt-20 pt-8 border-t border-border"
        >
          <p className="text-xs text-muted font-mono">© Priyanka Veerabhadrappa</p>
        </motion.div>
      </div>
    </section>
  );
}
