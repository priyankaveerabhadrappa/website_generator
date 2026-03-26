import { NextResponse } from "next/server";
import { generateSiteConfig } from "@/lib/llm";
import { storeSiteConfig, getSiteConfig } from "@/lib/storage";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { jobDescription } = await request.json();

    if (!jobDescription || typeof jobDescription !== "string") {
      return NextResponse.json(
        { error: "jobDescription is required" },
        { status: 400 }
      );
    }

    const config = await generateSiteConfig(jobDescription);

    // Handle slug collision
    let slug = config.slug;
    let attempt = 1;
    while (await getSiteConfig(slug)) {
      attempt++;
      slug = `${config.slug}-${attempt}`;
    }
    config.slug = slug;

    await storeSiteConfig(config);

    return NextResponse.json({
      slug: config.slug,
      url: `/${config.slug}`,
      company: config.candidate.company,
      matchScore: config.candidate.matchScore,
    });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
