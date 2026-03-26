import { SiteConfig, SiteConfigSummary } from "./types";

const IS_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;

function getToken(): string {
  return process.env.BLOB_READ_WRITE_TOKEN!;
}

// ---------- Vercel Blob (private store) ----------
async function blobStore(config: SiteConfig): Promise<void> {
  const { put } = await import("@vercel/blob");
  await put(`sites/${config.slug}.json`, JSON.stringify(config), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    token: getToken(),
  });
}

async function blobReadUrl(url: string): Promise<string> {
  const { get } = await import("@vercel/blob");
  const resp = await get(url, { token: getToken(), access: "private" });
  if (!resp) throw new Error(`Blob not found: ${url}`);
  // Read the stream into a string using Response API
  const response = new Response(resp.stream);
  return response.text();
}

async function blobGet(slug: string): Promise<SiteConfig | null> {
  const { list } = await import("@vercel/blob");
  const result = await list({
    prefix: `sites/${slug}.json`,
    token: getToken(),
  });
  const blob = result.blobs.find((b) => b.pathname === `sites/${slug}.json`);
  if (!blob) return null;
  const text = await blobReadUrl(blob.url);
  return JSON.parse(text);
}

async function blobList(): Promise<SiteConfigSummary[]> {
  const { list } = await import("@vercel/blob");
  const result = await list({
    prefix: "sites/",
    token: getToken(),
  });
  const summaries: SiteConfigSummary[] = [];
  for (const blob of result.blobs) {
    if (!blob.pathname.endsWith(".json")) continue;
    try {
      const text = await blobReadUrl(blob.url);
      const config: SiteConfig = JSON.parse(text);
      summaries.push({
        slug: config.slug,
        company: config.candidate.company,
        position: config.candidate.position,
        matchScore: config.candidate.matchScore,
        generatedAt: config.generatedAt,
      });
    } catch {
      // skip malformed blobs
    }
  }
  return summaries;
}

async function blobDelete(slug: string): Promise<void> {
  const { del, list } = await import("@vercel/blob");
  const result = await list({
    prefix: `sites/${slug}.json`,
    token: getToken(),
  });
  const blob = result.blobs.find((b) => b.pathname === `sites/${slug}.json`);
  if (blob) await del(blob.url, { token: getToken() });
}

// ---------- Filesystem (local dev fallback) ----------
import { existsSync, readFileSync, writeFileSync, unlinkSync, readdirSync } from "fs";
import { join } from "path";

const SITES_DIR = join(process.cwd(), "data", "sites");

function fsStore(config: SiteConfig): void {
  writeFileSync(
    join(SITES_DIR, `${config.slug}.json`),
    JSON.stringify(config, null, 2),
    "utf-8"
  );
}

function fsGet(slug: string): SiteConfig | null {
  const filePath = join(SITES_DIR, `${slug}.json`);
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

function fsList(): SiteConfigSummary[] {
  if (!existsSync(SITES_DIR)) return [];
  return readdirSync(SITES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const config: SiteConfig = JSON.parse(
        readFileSync(join(SITES_DIR, f), "utf-8")
      );
      return {
        slug: config.slug,
        company: config.candidate.company,
        position: config.candidate.position,
        matchScore: config.candidate.matchScore,
        generatedAt: config.generatedAt,
      };
    });
}

function fsDelete(slug: string): void {
  const filePath = join(SITES_DIR, `${slug}.json`);
  if (existsSync(filePath)) unlinkSync(filePath);
}

// ---------- Public API ----------
export async function storeSiteConfig(config: SiteConfig): Promise<void> {
  if (IS_BLOB) {
    await blobStore(config);
  } else {
    fsStore(config);
  }
}

export async function getSiteConfig(
  slug: string
): Promise<SiteConfig | null> {
  if (IS_BLOB) {
    return blobGet(slug);
  }
  return fsGet(slug);
}

export async function listSiteConfigs(): Promise<SiteConfigSummary[]> {
  if (IS_BLOB) {
    return blobList();
  }
  return fsList();
}

export async function deleteSiteConfig(slug: string): Promise<void> {
  if (IS_BLOB) {
    await blobDelete(slug);
  } else {
    fsDelete(slug);
  }
}
