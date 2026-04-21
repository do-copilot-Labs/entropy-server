import { randomBytes } from "node:crypto";
import type { UrlCapturePayload } from "../types/url";
import { BasicError } from "./http/error";

const TRACKING_PARAM_PREFIXES = ["utm_"];
const TRACKING_PARAM_KEYS = new Set(["fbclid", "gclid", "msclkid", "xsec_source", "spm", "_source"]);

const SHORT_ID_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const SHORT_ID_LENGTH = 10;

export const generateShortId = () => {
  const bytes = randomBytes(SHORT_ID_LENGTH);
  let result = "";
  for (let i = 0; i < SHORT_ID_LENGTH; i++) {
    const byte = bytes[i] ?? 0;
    result += SHORT_ID_ALPHABET[byte % SHORT_ID_ALPHABET.length];
  }
  return result;
};

export const normalizeUrl = (raw: string) => {
  const value = raw?.trim().replace(/^`|`$/g, "");
  if (!value) {
    throw new BasicError("INPUT_REQUIRED", { message: "URL is required" });
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new BasicError("INPUT_INVALID_FORMAT", { message: "Invalid URL format" });
  }

  parsed.protocol = parsed.protocol.toLowerCase();
  parsed.hostname = parsed.hostname.toLowerCase();

  if ((parsed.protocol === "http:" && parsed.port === "80") || (parsed.protocol === "https:" && parsed.port === "443")) {
    parsed.port = "";
  }

  if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  }

  const params = [...parsed.searchParams.entries()]
    .filter(([key, val]) => {
      if (!val) return false;
      if (TRACKING_PARAM_KEYS.has(key)) return false;
      return !TRACKING_PARAM_PREFIXES.some((prefix) => key.startsWith(prefix));
    })
    .sort(([a], [b]) => a.localeCompare(b));

  parsed.search = "";
  for (const [key, val] of params) {
    parsed.searchParams.append(key, val);
  }

  return {
    canonicalUrl: parsed.toString(),
    domain: parsed.hostname,
    originalUrl: value,
  };
};

export const buildUrlMetadata = (
  payload: UrlCapturePayload,
  normalized: { originalUrl: string },
) => ({
  byline: payload.byline ?? null,
  dir: payload.dir ?? null,
  lang: payload.lang ?? null,
  length: payload.length ?? null,
  excerpt: payload.excerpt ?? null,
  publishedTime: payload.publishedTime ?? null,
  originalUrl: normalized.originalUrl,
});