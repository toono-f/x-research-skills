import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_BASE_URL = "https://api.x.ai";
const DEFAULT_MODEL = "grok-4-1-fast-reasoning";

export function repoRoot(): string {
  // lib/ の2階層上がリポジトリルート
  const __filename = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(__filename), "../..");
}

export function loadDotenv(dotenvPath: string): Record<string, string> {
  if (!fs.existsSync(dotenvPath)) return {};
  const out: Record<string, string> = {};
  const lines = fs.readFileSync(dotenvPath, "utf8").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if (!k) continue;
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

export interface XaiConfig {
  xai_api_key: string;
  xai_base_url: string;
  xai_model: string;
}

export function resolveXaiConfig(overrides: {
  xai_api_key?: string;
  xai_base_url?: string;
  xai_model?: string;
}): XaiConfig {
  const dotenv = loadDotenv(path.join(repoRoot(), ".env"));
  const get = (envKey: string, cli: string | undefined, fallback: string) =>
    cli || process.env[envKey] || dotenv[envKey] || fallback;

  return {
    xai_api_key: get("XAI_API_KEY", overrides.xai_api_key, ""),
    xai_base_url: get("XAI_BASE_URL", overrides.xai_base_url, DEFAULT_BASE_URL).replace(/\/+$/, ""),
    xai_model: get("XAI_MODEL", overrides.xai_model, DEFAULT_MODEL),
  };
}
