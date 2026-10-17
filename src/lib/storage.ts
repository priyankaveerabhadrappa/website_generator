import { SiteConfig, SiteConfigSummary } from "./types";
import { existsSync, readFileSync, readdirSync, unlinkSync } from "fs";
import { join } from "path";

const SITES_DIR = join(process.cwd(), "data", "sites");

// Configs are written by the local agent service (agent/), committed to the repo and
// prerendered at build time. Deployments have a read-only filesystem.
const IS_READ_ONLY = !!process.env.VERCEL;

const LOCAL_ONLY_MESSAGE =
  "Sites can only be managed locally. Run `npm run dev`, then commit data/sites/ and push to publish.";

function configPath(slug: string): string {
  return join(SITES_DIR, `${slug}.json`);
}

export async function getSiteConfig(slug: string): Promise<SiteConfig | null> {
  const filePath = configPath(slug);
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

export async function listSiteSlugs(): Promise<string[]> {
  if (!existsSync(SITES_DIR)) return [];
  return readdirSync(SITES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -".json".length));
}

export async function listSiteConfigs(): Promise<SiteConfigSummary[]> {
  const summaries: SiteConfigSummary[] = [];
  for (const slug of await listSiteSlugs()) {
    try {
      const config = await getSiteConfig(slug);
      if (!config) continue;
      summaries.push({
        slug: config.slug,
        company: config.candidate.company,
        position: config.candidate.position,
        matchScore: config.candidate.matchScore,
        generatedAt: config.generatedAt,
      });
    } catch {
      // skip malformed configs
    }
  }
  return summaries;
}

export async function deleteSiteConfig(slug: string): Promise<void> {
  if (IS_READ_ONLY) throw new Error(LOCAL_ONLY_MESSAGE);
  const filePath = configPath(slug);
  if (existsSync(filePath)) unlinkSync(filePath);
}
