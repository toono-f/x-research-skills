/**
 * Publish Fighters news posts to X.
 *
 * Reads the latest fighters-post output and publishes to X via API v2.
 * Requires --confirm flag for actual posting (safety measure).
 *
 * Requires:
 *   X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET in env or .env
 *
 * Usage:
 *   npx tsx scripts/fighters_post_publish.ts --dry-run
 *   npx tsx scripts/fighters_post_publish.ts --mode single --pick 1 --confirm
 *   npx tsx scripts/fighters_post_publish.ts --mode thread --confirm
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { resolveXPostConfig } from "./lib/config.ts";
import { findLatestFile } from "./lib/file_utils.ts";
import { postTweet, postThread } from "./lib/x_post_client.ts";

function parseArgs(argv: string[]) {
  const args = {
    mode: "single" as "single" | "thread",
    pick: 1,
    input: "",
    post_dir: "data/fighters-post",
    confirm: false,
    dry_run: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => (i + 1 < argv.length ? argv[++i] : "");
    if (a === "--mode") {
      const v = next().trim().toLowerCase();
      args.mode = v === "thread" ? "thread" : "single";
    } else if (a === "--pick") args.pick = Number(next());
    else if (a === "--input") args.input = next();
    else if (a === "--post-dir") args.post_dir = next() || args.post_dir;
    else if (a === "--confirm") args.confirm = true;
    else if (a === "--dry-run") args.dry_run = true;
    else if (a === "-h" || a === "--help") {
      // eslint-disable-next-line no-console
      console.log(`Usage:
  tsx scripts/fighters_post_publish.ts --mode single --confirm
  tsx scripts/fighters_post_publish.ts --mode thread --confirm
  tsx scripts/fighters_post_publish.ts --dry-run

Options:
  --mode single|thread   posting mode (default: single)
  --pick N               which single-post draft to use, 1-3 (default: 1)
  --input FILE           path to post draft file (default: auto-detect latest)
  --post-dir DIR         directory to search for latest post draft (default: data/fighters-post)
  --confirm              required flag to actually post (safety measure)
  --dry-run              show what would be posted without sending
`);
      process.exit(0);
    }
  }

  if (!Number.isFinite(args.pick) || args.pick < 1) args.pick = 1;
  if (args.pick > 3) args.pick = 3;
  return args;
}

/**
 * Extract post texts from the draft markdown.
 * Returns { singles: string[], thread: string[] }
 */
function parseDraftFile(content: string): {
  singles: string[];
  thread: string[];
} {
  const singles: string[] = [];
  const thread: string[] = [];

  // Extract code blocks (``` delimited) from each pattern section
  const codeBlockPattern = /```\n([\s\S]*?)```/g;

  // Split by pattern sections
  const patternAMatch = content.match(
    /## パターンA[:：].*?\n([\s\S]*?)(?=## パターンB|$)/,
  );
  const patternBMatch = content.match(/## パターンB[:：].*?\n([\s\S]*?)$/);

  if (patternAMatch) {
    const section = patternAMatch[1];
    let match;
    while ((match = codeBlockPattern.exec(section)) !== null) {
      const text = match[1].trim();
      if (text) singles.push(text);
    }
  }

  if (patternBMatch) {
    const section = patternBMatch[1];
    // Reset regex state
    codeBlockPattern.lastIndex = 0;
    let match;
    while ((match = codeBlockPattern.exec(section)) !== null) {
      const text = match[1].trim();
      if (text) thread.push(text);
    }
  }

  return { singles, thread };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cfg = resolveXPostConfig();

  // Load draft file
  let draftPath: string;
  if (args.input) {
    draftPath = path.isAbsolute(args.input) ? args.input : path.resolve(args.input);
  } else {
    const latest = findLatestFile(args.post_dir, ".txt");
    if (!latest) {
      // eslint-disable-next-line no-console
      console.error(
        `No .txt files found in ${args.post_dir}. Run grok_fighters_post.ts first.`,
      );
      process.exit(2);
    }
    draftPath = latest;
  }

  if (!fs.existsSync(draftPath)) {
    // eslint-disable-next-line no-console
    console.error(`Draft file not found: ${draftPath}`);
    process.exit(2);
  }

  const draftContent = fs.readFileSync(draftPath, "utf8");
  // eslint-disable-next-line no-console
  console.error(`Draft source: ${draftPath}`);

  const { singles, thread } = parseDraftFile(draftContent);

  if (args.mode === "single") {
    const idx = args.pick - 1;
    if (idx >= singles.length) {
      // eslint-disable-next-line no-console
      console.error(
        `Draft has ${singles.length} single posts. --pick ${args.pick} is out of range.`,
      );
      process.exit(2);
    }

    const text = singles[idx];
    // eslint-disable-next-line no-console
    console.log(`\n--- Single Post (Draft #${args.pick}) ---`);
    // eslint-disable-next-line no-console
    console.log(text);
    // eslint-disable-next-line no-console
    console.log("---\n");

    if (args.dry_run) {
      // eslint-disable-next-line no-console
      console.log("[DRY RUN] Would post the above text.");
      return;
    }

    if (!args.confirm) {
      // eslint-disable-next-line no-console
      console.error("Add --confirm to actually post. Use --dry-run to preview.");
      process.exit(1);
    }

    validateConfig(cfg);
    const result = await postTweet(cfg, text);
    // eslint-disable-next-line no-console
    console.log(`Posted! Tweet ID: ${result.id}`);
    // eslint-disable-next-line no-console
    console.log(`URL: https://x.com/i/status/${result.id}`);
  } else {
    if (thread.length === 0) {
      // eslint-disable-next-line no-console
      console.error("No thread posts found in draft file.");
      process.exit(2);
    }

    // eslint-disable-next-line no-console
    console.log(`\n--- Thread (${thread.length} posts) ---`);
    thread.forEach((t, i) => {
      // eslint-disable-next-line no-console
      console.log(`\n[${i + 1}/${thread.length}]`);
      // eslint-disable-next-line no-console
      console.log(t);
    });
    // eslint-disable-next-line no-console
    console.log("\n---\n");

    if (args.dry_run) {
      // eslint-disable-next-line no-console
      console.log("[DRY RUN] Would post the above thread.");
      return;
    }

    if (!args.confirm) {
      // eslint-disable-next-line no-console
      console.error("Add --confirm to actually post. Use --dry-run to preview.");
      process.exit(1);
    }

    validateConfig(cfg);
    const results = await postThread(cfg, thread);
    // eslint-disable-next-line no-console
    console.log(`Thread posted! ${results.length} tweets.`);
    results.forEach((r, i) => {
      // eslint-disable-next-line no-console
      console.log(`  [${i + 1}] ID: ${r.id} — https://x.com/i/status/${r.id}`);
    });
  }
}

function validateConfig(cfg: { api_key: string; api_secret: string; access_token: string; access_token_secret: string }) {
  const missing: string[] = [];
  if (!cfg.api_key) missing.push("X_API_KEY");
  if (!cfg.api_secret) missing.push("X_API_SECRET");
  if (!cfg.access_token) missing.push("X_ACCESS_TOKEN");
  if (!cfg.access_token_secret) missing.push("X_ACCESS_TOKEN_SECRET");

  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error(`Missing X API credentials: ${missing.join(", ")}`);
    // eslint-disable-next-line no-console
    console.error("Set them in .env or environment variables.");
    process.exit(2);
  }
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error(String(err));
  process.exit(1);
});
