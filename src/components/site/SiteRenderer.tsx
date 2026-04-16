"use client";

import { SiteConfig } from "@/lib/types";
import Navigation from "./Navigation";
import HeroSection from "./HeroSection";
import ReviewSection from "./ReviewSection";
import ExperienceSection from "./ExperienceSection";
import SkillsSection from "./SkillsSection";
import WhyCompanySection from "./WhyCompanySection";
import EducationSection from "./EducationSection";
import ContactSection from "./ContactSection";

interface SiteRendererProps {
  config: SiteConfig;
}

export default function SiteRenderer({ config }: SiteRendererProps) {
  const { candidate } = config;

  return (
    <main className="min-h-screen">
      <Navigation candidate={candidate} />
      <HeroSection candidate={candidate} hero={config.hero} />
      <ReviewSection review={config.review} company={candidate.company} />
      <ExperienceSection experience={config.experience} />
      <SkillsSection skills={config.skills} company={candidate.company} />
      <WhyCompanySection whyCompany={config.whyCompany} company={candidate.company} />
      <EducationSection education={config.education} />
      <ContactSection contact={config.contact} company={candidate.company} />
    </main>
  );
}
