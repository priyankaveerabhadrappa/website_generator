import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { SiteConfig } from "./types";
import { getCandidateCV } from "./candidate-cv";
import { buildPrompt } from "./prompt";

const MODEL_ID = "eu.anthropic.claude-sonnet-4-6";

function getBedrockClient(): BedrockRuntimeClient {
  return new BedrockRuntimeClient({
    region: process.env.AWS_REGION || "eu-central-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

function extractJson(text: string): string {
  const match = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (match) return match[1].trim();
  return text.trim();
}

function generateSlug(company: string): string {
  return company
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function generateSiteConfig(
  jobDescription: string
): Promise<SiteConfig> {
  const candidateCV = getCandidateCV();
  const prompt = buildPrompt(jobDescription, candidateCV);

  const client = getBedrockClient();

  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 8192,
    temperature: 0.7,
    messages: [{ role: "user", content: prompt }],
  };

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    body: JSON.stringify(payload),
    contentType: "application/json",
  });

  const response = await client.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));

  let textContent = "";
  for (const block of result.content) {
    if (block.type === "text") {
      textContent = extractJson(block.text);
      break;
    }
  }

  if (!textContent) {
    throw new Error("No text content in LLM response");
  }

  const config: SiteConfig = JSON.parse(textContent);

  if (!config.slug) {
    config.slug = generateSlug(config.candidate?.company || "application");
  }

  config.generatedAt = new Date().toISOString();

  return config;
}
