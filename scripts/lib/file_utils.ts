import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "./config.ts";

export function timestampSlug(d: Date): string {
  const iso = d.toISOString();
  const y = iso.slice(0, 4);
  const m = iso.slice(5, 7);
  const day = iso.slice(8, 10);
  const hh = iso.slice(11, 13);
  const mm = iso.slice(14, 16);
  const ss = iso.slice(17, 19);
  return `${y}${m}${day}_${hh}${mm}${ss}Z`;
}

export function saveFile(outDir: string, filename: string, content: string): string {
  const root = repoRoot();
  const absDir = path.isAbsolute(outDir) ? outDir : path.join(root, outDir);
  fs.mkdirSync(absDir, { recursive: true });
  const p = path.join(absDir, filename);
  fs.writeFileSync(p, content, "utf8");
  return p;
}

/**
 * Find the latest file in a directory matching a given extension.
 * Returns the absolute path to the newest file, or null if no match is found.
 */
export function findLatestFile(dir: string, ext: string): string | null {
  const root = repoRoot();
  const absDir = path.isAbsolute(dir) ? dir : path.join(root, dir);
  if (!fs.existsSync(absDir)) return null;
  const files = fs.readdirSync(absDir)
    .filter((f) => f.endsWith(ext))
    .sort()
    .reverse();
  if (files.length === 0) return null;
  return path.join(absDir, files[0]);
}
