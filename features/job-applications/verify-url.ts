import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const ROLE_TERMS = /\b(job|position|career|employment|hiring|apply now|full[- ]time|part[- ]time)\b/i;
const DETAIL_TERMS = /\b(responsibilities|qualifications|requirements|salary|compensation|apply now|what you will do|what you.ll bring|employment type)\b/i;
const ROLE_SLUG_TERMS = /\b(engineer|engineering|developer|development|intern|internship|designer|design|analyst|manager|scientist|researcher|recruiter|accountant|counsel|sales|marketing|product|support|technician|architect|operations|writer|editor|associate|director|specialist|coordinator|consultant|security|nurse|teacher|professor|lawyer|attorney|mechanic|chef|driver|representative|executive|assistant|principal|staff|lead|software|data|finance|human[- ]resources|hr|legal|customer[- ]success)\b/i;
const EXCLUDED_HOSTS = new Set(["localhost", "metadata.google.internal"]);

function verifyFromJobUrl(url: URL) {
  let pathParts: string[];
  try {
    pathParts = decodeURIComponent(url.pathname).split("/").filter(Boolean);
  } catch {
    return null;
  }
  const marker = pathParts.findIndex((part) => /^(jobs?|careers?|positions?|roles?|openings?)$/i.test(part));
  if (marker < 0) return null;
  const rolePart = pathParts.slice(marker + 1).filter((part) => !/^\d+$/.test(part)).at(-1) || "";
  const slug = rolePart.replace(/[-_]+/g, " ").replace(/\.(html?|aspx?)$/i, "").trim();
  const words = slug.split(/\s+/).filter((word) => /[a-z]/i.test(word));
  const hasJobId = pathParts.slice(marker + 1).some((part) => /^\d{4,}$/.test(part)) ||
    ["gh_jid", "job_id", "jobid", "requisitionid", "reqid"].some((key) => url.searchParams.has(key));
  if (words.length < 2 || !ROLE_SLUG_TERMS.test(slug) || (!hasJobId && words.length < 3)) return null;
  const suggestedTitle = words.map((word) => {
    const lower = word.toLowerCase();
    if (/^(usa|us|uk|eu|ai|hr|it)$/.test(lower)) return lower.toUpperCase();
    if (/^\d{4}$/.test(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(" ");
  return { verifiedUrl: url.toString(), suggestedTitle, verificationMethod: "link" as const };
}

function isPrivateAddress(address: string) {
  if (address.includes(":")) {
    const value = address.toLowerCase();
    if (value.startsWith("::ffff:")) return isPrivateAddress(value.slice(7));
    return value === "::1" || value === "::" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80:") || value.startsWith("ff") || value.startsWith("2001:db8:");
  }
  const [a, b] = address.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19));
}

async function assertPublicHttpUrl(value: string) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error("Use a public http or https job posting link.");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (EXCLUDED_HOSTS.has(host) || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("That host cannot be checked.");
  const addressLookup: Promise<Array<{ address: string }>> = isIP(host)
    ? Promise.resolve([{ address: host }])
    : lookup(host, { all: true, verbatim: true });
  let dnsTimeout: ReturnType<typeof setTimeout> | undefined;
  let addresses: Array<{ address: string }>;
  try {
    addresses = await Promise.race([
      addressLookup,
      new Promise<never>((_, reject) => {
        dnsTimeout = setTimeout(() => reject(new Error("The job site's address lookup timed out.")), 3000);
      }),
    ]);
  } finally {
    if (dnsTimeout) clearTimeout(dnsTimeout);
  }
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error("That link must point to a public website.");
  return url;
}

/** Fetches a bounded HTML response and looks for common job posting signals. */
export async function verifyJobPosting(rawUrl: string) {
  if (rawUrl.length > 2048) throw new Error("The link is too long.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    let url = await assertPublicHttpUrl(rawUrl);
    let response: Response | undefined;
    for (let redirects = 0; redirects <= 3; redirects++) {
      response = await fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "user-agent": "FocusFarmerJobLinkChecker/1.0", accept: "text/html,application/xhtml+xml" },
      });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get("location");
      if (!location) throw new Error("The job site returned an incomplete redirect.");
      url = await assertPublicHttpUrl(new URL(location, url).toString());
    }
    if (response?.status === 403) {
      const linkCheck = verifyFromJobUrl(url);
      if (linkCheck) return linkCheck;
      throw new Error("The site blocked the page check, and the link doesn't clearly identify a specific job posting.");
    }
    if (!response || !response.ok) throw new Error(`The link returned ${response?.status || "no response"}.`);
    if (!(response.headers.get("content-type") || "").toLowerCase().includes("text/html")) throw new Error("The link did not return a web page.");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("The job page could not be read.");
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (bytes < 512_000) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      const chunk = value.subarray(0, 512_000 - bytes);
      chunks.push(chunk);
      bytes += chunk.length;
      if (chunk.length !== value.length) break;
    }
    await reader.cancel().catch(() => undefined);
    const html = new TextDecoder().decode(Buffer.concat(chunks));
    const text = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ");
    const structuredJob = /JobPosting|"@type"\s*:\s*"JobPosting"/i.test(html);
    if (!structuredJob && !(ROLE_TERMS.test(text) && DETAIL_TERMS.test(text))) throw new Error("We couldn't find enough job posting details on that page. Check the link and try again.");
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();
    return { verifiedUrl: url.toString(), suggestedTitle: title?.slice(0, 180) || "", verificationMethod: "page" as const };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("The job site took too long to respond.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
