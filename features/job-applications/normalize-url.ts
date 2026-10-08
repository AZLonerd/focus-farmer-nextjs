const TRACKING_PARAMS = new Set([
  "fbclid", "gclid", "mc_cid", "mc_eid", "ref", "source", "gh_src", "lever-source",
]);

/** Removes URL decoration that does not identify a different job posting. */
export function normalizeJobUrl(value: string) {
  const url = new URL(value);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("utm_") || TRACKING_PARAMS.has(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }
  url.searchParams.sort();
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const port = url.port ? `:${url.port}` : "";
  const path = url.pathname.replace(/\/+$/, "");
  return `${url.protocol.toLowerCase()}//${host}${port}${path}${url.search}`.toLowerCase();
}
