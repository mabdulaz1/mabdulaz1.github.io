import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sitemapPath = resolve(root, "sitemap.xml");
const sitemap = readFileSync(sitemapPath, "utf8");
const robots = readFileSync(resolve(root, "robots.txt"), "utf8");
const notFound = readFileSync(resolve(root, "404.html"), "utf8");
const bookingScript = readFileSync(resolve(root, "script-v32.js"), "utf8");
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
const unsupportedClaims = [
  "24/7 transfer enquiries",
  "accepts transfer enquiries 24/7",
  "on-time, every time",
  "trained, licensed",
  "vehicle monitoring",
  "emergency readiness",
  "trusted by leading brands",
];

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
  const imageTags = [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
  const h1Count = (html.match(/<h1\b/gi) || []).length;

  if (!title) errors.push(`${path}: missing title`);
  if (!description) errors.push(`${path}: missing meta description`);
  if (title && (title.length < 30 || title.length > 65)) errors.push(`${path}: title length ${title.length}, expected 30-65 characters`);
  if (description && (description.length < 110 || description.length > 165)) errors.push(`${path}: meta description length ${description.length}, expected 110-165 characters`);
  if (!/<html[^>]+lang="en"/i.test(html)) errors.push(`${path}: missing html lang="en"`);
  if (!/<meta[^>]+name="viewport"/i.test(html)) errors.push(`${path}: missing viewport meta tag`);
  for (const property of ["og:title", "og:description", "og:url", "og:image"]) {
    if (!new RegExp(`property="${property}"`, "i").test(html)) errors.push(`${path}: missing ${property}`);
  }
  if (/script\.js(?:["?])/i.test(html)) errors.push(`${path}: references stale script.js instead of versioned booking script`);
  if (!/<script\s+src="\/?script-v32\.js\?v=42"><\/script>/i.test(html)) errors.push(`${path}: must load script-v32.js with the v=42 cache key`);
  if (canonical !== expectedCanonical(path)) {
    errors.push(`${path}: canonical is "${canonical}", expected "${expectedCanonical(path)}"`);
  }
  if (h1Count !== 1) errors.push(`${path}: expected one H1, found ${h1Count}`);
  for (const image of imageTags) {
    if (!/\balt\s*=\s*["'][^"']+["']/i.test(image)) errors.push(`${path}: image is missing meaningful alt text`);
    if (!/\bwidth\s*=\s*["']?\d+/i.test(image) || !/\bheight\s*=\s*["']?\d+/i.test(image)) {
      errors.push(`${path}: image is missing numeric width or height`);
    }
    if (!/\bdecoding\s*=\s*["']async["']/i.test(image)) errors.push(`${path}: image must use decoding="async"`);
  }
  if (imageTags[0] && /\bloading\s*=\s*["']lazy["']/i.test(imageTags[0])) errors.push(`${path}: above-the-fold header image must not be lazy-loaded`);
  if (imageTags.length > 1 && !/\bloading\s*=\s*["']lazy["']/i.test(imageTags.at(-1))) errors.push(`${path}: footer image must be lazy-loaded`);
  for (const claim of unsupportedClaims) {
    if (html.toLowerCase().includes(claim)) errors.push(`${path}: unsupported claim "${claim}"`);
  }
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
if (!/^User-agent:\s*\*/im.test(robots) || !/^Allow:\s*\/$/im.test(robots)) errors.push("robots.txt must allow public crawling");
if (!/^Sitemap:\s*https:\/\/ciaomobility\.me\/sitemap\.xml$/im.test(robots)) errors.push("robots.txt must advertise the canonical sitemap URL");
if (urls.some((url) => !url.startsWith(`${siteOrigin}/`))) errors.push("sitemap.xml contains a URL outside the canonical origin");
if (urls.some((url) => /\/404(?:\.html)?$/i.test(url))) errors.push("404 page must not appear in sitemap.xml");
if (!/<meta\s+name="robots"\s+content="noindex,follow"/i.test(notFound)) errors.push("404.html must contain noindex,follow");
if (/<link\s+rel="canonical"/i.test(notFound)) errors.push("404.html must not declare a canonical URL");
if ((notFound.match(/<h1\b/gi) || []).length !== 1) errors.push("404.html must contain exactly one H1");
if (!/<script\s+src="\/script-v32\.js\?v=42"><\/script>/i.test(notFound)) errors.push("404.html must load the versioned booking script");

if (!/width="180" height="90" decoding="async" fetchpriority="high"/i.test(bookingScript)) errors.push("booking script must preserve optimized header-logo attributes");
if (!/width="190" height="95" loading="lazy" decoding="async"/i.test(bookingScript)) errors.push("booking script must preserve optimized footer-logo attributes");

if (errors.length) {
  console.error(`SEO audit failed with ${errors.length} issue(s):\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log(`SEO audit passed: ${paths.length} sitemap pages, search-ready metadata, valid crawl controls, canonicals and JSON-LD, no unsupported claims, broken links or orphan pages.`);
