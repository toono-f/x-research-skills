export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

export async function postJson(
  url: string,
  headers: Record<string, string>,
  payload: Json,
  timeoutMs: number,
): Promise<unknown> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: ac.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 4000)}`);
    }
    return JSON.parse(text) as unknown;
  } finally {
    clearTimeout(t);
  }
}

export function extractText(resp: unknown): string {
  if (resp && typeof resp === "object") {
    const r = resp as { [k: string]: unknown };
    const out = r["output"];
    if (Array.isArray(out)) {
      const parts: string[] = [];
      for (const item of out) {
        if (!item || typeof item !== "object") continue;
        const content = (item as { [k: string]: unknown })["content"];
        if (!Array.isArray(content)) continue;
        for (const c of content) {
          if (!c || typeof c !== "object") continue;
          const t = (c as { [k: string]: unknown })["text"];
          if (typeof t === "string" && t.trim()) parts.push(t);
        }
      }
      if (parts.length) return parts.join("\n").trim();
    }
    for (const k of ["output_text", "text", "content"]) {
      const v = r[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return JSON.stringify(resp, null, 2);
}

export interface XaiRequestOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
  tools?: Json[];
  timeoutMs?: number;
}

export async function xaiRequest(opts: XaiRequestOptions): Promise<{ raw: unknown; text: string }> {
  const url = `${opts.baseUrl}/v1/responses`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${opts.apiKey}`,
  };
  const payload: Json = {
    model: opts.model,
    input: opts.prompt,
    tools: (opts.tools ?? [{ type: "x_search" }]) as Json,
  };
  const raw = await postJson(url, headers, payload, opts.timeoutMs ?? 180_000);
  const text = extractText(raw);
  return { raw, text };
}
