/**
 * X API v2 posting client with OAuth 1.0a signature.
 *
 * Uses only node:crypto — no external dependencies.
 */

import crypto from "node:crypto";
import type { XPostConfig } from "./config.ts";

const X_API_BASE = "https://api.x.com";
const TWEET_ENDPOINT = "/2/tweets";

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

function buildOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string,
): string {
  const sortedKeys = Object.keys(params).sort();
  const paramString = sortedKeys
    .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join("&");

  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramString),
  ].join("&");

  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;

  return crypto
    .createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");
}

function buildAuthHeader(
  method: string,
  url: string,
  cfg: XPostConfig,
): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: cfg.api_key,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: cfg.access_token,
    oauth_version: "1.0",
  };

  const signature = buildOAuthSignature(
    method,
    url,
    oauthParams,
    cfg.api_secret,
    cfg.access_token_secret,
  );

  oauthParams["oauth_signature"] = signature;

  const headerParts = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(", ");

  return `OAuth ${headerParts}`;
}

export interface TweetResult {
  id: string;
  text: string;
}

/**
 * Post a single tweet. Optionally reply to another tweet.
 */
export async function postTweet(
  cfg: XPostConfig,
  text: string,
  replyToId?: string,
): Promise<TweetResult> {
  const url = `${X_API_BASE}${TWEET_ENDPOINT}`;
  const body: Record<string, unknown> = { text };
  if (replyToId) {
    body.reply = { in_reply_to_tweet_id: replyToId };
  }

  const authHeader = buildAuthHeader("POST", url, cfg);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(body),
  });

  const resText = await res.text();
  if (!res.ok) {
    throw new Error(`X API error ${res.status}: ${resText.slice(0, 2000)}`);
  }

  const json = JSON.parse(resText) as { data?: { id?: string; text?: string } };
  return {
    id: json.data?.id ?? "",
    text: json.data?.text ?? text,
  };
}

/**
 * Post a thread (array of texts). Each post replies to the previous one.
 * Returns all tweet results in order.
 */
export async function postThread(
  cfg: XPostConfig,
  texts: string[],
): Promise<TweetResult[]> {
  const results: TweetResult[] = [];
  let lastId: string | undefined;

  for (const text of texts) {
    const result = await postTweet(cfg, text, lastId);
    results.push(result);
    lastId = result.id;
  }

  return results;
}
