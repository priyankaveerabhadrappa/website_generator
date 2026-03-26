import { notFound } from "next/navigation";
import { getSiteConfig } from "@/lib/storage";
import SiteRenderer from "@/components/site/SiteRenderer";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const config = await getSiteConfig(slug);

  if (!config) {
    return { title: "Not Found" };
  }

  return {
    title: `${config.candidate.firstName} ${config.candidate.lastName} | Application to ${config.candidate.company}`,
    description: `Interactive application for the ${config.candidate.position} position at ${config.candidate.company}. Built with Next.js, TypeScript, React, and Claude Code.`,
    openGraph: {
      title: `${config.candidate.firstName} ${config.candidate.lastName} | Application to ${config.candidate.company}`,
      description: `This is not a regular CV. This is a Next.js app built with Claude Code to show you what I can do.`,
      type: "website",
    },
  };
}

export default async function SitePage({ params }: PageProps) {
  const { slug } = await params;
  const config = await getSiteConfig(slug);

  if (!config) {
    notFound();
  }

  return <SiteRenderer config={config} />;
}
