import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sitemapPath = resolve(root, "sitemap.xml");
const sitemap = readFileSync(sitemapPath, "utf8");
const siteOrigin = "https://ciaomobility.me";
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1].trim());
const paths = urls.map((url) => {
  const pathname = new URL(url).pathname;
  return pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
});
const pathSet = new Set(paths);
const errors = [];
const titles = new Map();
const descriptions = new Map();
const inboundLinks = new Map(paths.map((path) => [path, 0]));

function addDuplicate(map, value, path) {
  if (!value) return;
  map.set(value, [...(map.get(value) || []), path]);
}

function expectedCanonical(path) {
  return `${siteOrigin}/${path === "index.html" ? "" : path}`;
}

function normalizeInternalHref(href, sourcePath) {
  const clean = href.split("#")[0].split("?")[0];
  if (!clean || /^(mailto:|tel:|javascript:|data:)/i.test(clean)) return null;
  if (/^https?:\/\//i.test(clean)) {
    const url = new URL(clean);
    if (url.origin !== siteOrigin) return null;
    return url.pathname === "/" ? "index.html" : url.pathname.replace(/^\//, "");
  }
  if (clean.startsWith("/")) return clean === "/" ? "index.html" : clean.replace(/^\//, "");
  return resolve(dirname(sourcePath), clean).replace(root + "/", "");
}

for (const path of paths) {
  const filePath = resolve(root, path);
  if (!existsSync(filePath)) {
    errors.push(`${path}: listed in sitemap but file is missing`);
    continue;
  }

  const html = readFileSync(filePath, "utf8");
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1].trim() || "";
  const description = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1].trim() || "";
  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1] || "";
  const h1Count = (html.match(/<h1\b/gi) || []).length;

  if (!title) errors.push(`${path}: missing title`);
  if (!description) errors.push(`${path}: missing meta description`);
  if (canonical !== expectedCanonical(path)) {
    errors.push(`${path}: canonical is "${canonical}", expected "${expectedCanonical(path)}"`);
  }
  if (h1Count !== 1) errors.push(`${path}: expected one H1, found ${h1Count}`);
  if (/noindex/i.test(html.match(/<meta\s+name="robots"[^>]*>/i)?.[0] || "")) {
    errors.push(`${path}: sitemap page contains noindex`);
  }

  addDuplicate(titles, title, path);
  addDuplicate(descriptions, description, path);

  for (const match of html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    try {
      JSON.parse(match[1]);
    } catch {
      errors.push(`${path}: invalid JSON-LD`);
    }
  }

  for (const match of html.matchAll(/href="([^"]+)"/gi)) {
    const target = normalizeInternalHref(match[1], filePath);
    if (!target || !target.endsWith(".html")) continue;
    if (!existsSync(resolve(root, target))) errors.push(`${path}: broken internal link to ${target}`);
    if (pathSet.has(target) && target !== path) inboundLinks.set(target, inboundLinks.get(target) + 1);
  }
}

for (const [title, group] of titles) {
  if (group.length > 1) errors.push(`duplicate title "${title}" on: ${group.join(", ")}`);
}
for (const [description, group] of descriptions) {
  if (group.length > 1) errors.push(`duplicate meta description on: ${group.join(", ")}`);
}
for (const [path, count] of inboundLinks) {
  if (path !== "index.html" && count === 0) errors.push(`${path}: sitemap page has no internal inbound link`);
}
if (new Set(urls).size !== urls.length) errors.push("sitemap.xml contains duplicate URLs");

if (errors.length) {
  console.error(`SEO audit failed with ${errors.length} issue(s):\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log(`SEO audit passed: ${paths.length} sitemap pages, unique metadata, valid canonicals and JSON-LD, no broken links or orphan pages.`);
