export type IconType = "code" | "ai" | "bolt" | "brain" | "rocket" | "heart";

// Older generated sites use "Strong Match" / "Exceptional Match"; newer ones use MatchLevel.
export type MatchLevel = "Strong" | "Partial" | "Gap";

export interface SiteConfig {
  slug: string;
  generatedAt: string;

  candidate: {
    firstName: string;
    lastName: string;
    subtitle: string;
    matchScore: number;
    position: string;
    company: string;
  };

  hero: {
    terminalCommand: string;
    terminalSteps: string[];
  };

  review: {
    items: {
      requirement: string;
      match: MatchLevel | string;
      score: number;
      evidence: string;
      evidenceIds?: string[];
    }[];
  };

  experience: {
    items: {
      title: string;
      company: string;
      location: string;
      period: string;
      highlights: string[];
      tags: string[];
      relevance: "high" | "very-high";
    }[];
  };

  skills: {
    categories: {
      name: string;
      icon: string;
      skills: {
        name: string;
        evidence: string;
        jobRelevant: boolean;
      }[];
    }[];
  };

  whyCompany: {
    reasons: {
      title: string;
      body: string;
      iconType: IconType;
    }[];
  };

  education: {
    degrees: {
      degree: string;
      institution: string;
      location: string;
      period: string;
      thesis: string;
      inProgress: boolean;
    }[];
    research: {
      title: string;
      period: string;
      description: string;
    }[];
  };

  contact: {
    email: string;
    locationDetail: string;
    locationAvailability: string;
    linkedin: string;
    phone?: string;
    languages: { language: string; level: string }[];
    footerText: string;
  };
}

export interface SiteConfigSummary {
  slug: string;
  company: string;
  position: string;
  matchScore: number;
  generatedAt: string;
}
