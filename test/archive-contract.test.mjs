import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

test("Astro archive app contract", () => {
  assert.ok(existsSync("astro.config.mjs"), "Astro config must exist");
  assert.ok(existsSync("src/content.config.ts"), "content collection config must exist");
  assert.ok(existsSync("src/pages/index.astro"), "archive index page must exist");
  assert.ok(existsSync("public/slides"), "slides must be served through Astro public assets");
  assert.ok(existsSync("public/images"), "images must be served through Astro public assets");
});

test("archive UI uses month filters and sort controls instead of tag filters", () => {
  const page = readFileSync("src/pages/index.astro", "utf8");
  assert.match(page, /data-month-filter="all"/);
  assert.match(page, /All months/);
  assert.match(page, /data-sort="newest"/);
  assert.match(page, /data-sort="oldest"/);
  assert.doesNotMatch(page, /data-tag-filter/);
  assert.doesNotMatch(page, /article\[data-tags\]/);
  assert.doesNotMatch(page, /data-kind-filter/);
  assert.doesNotMatch(page, /<input\b/i);
  assert.doesNotMatch(page, /type=["']search["']/i);
});

test("archive Open links use a safe new tab target", () => {
  const page = readFileSync("src/pages/index.astro", "utf8");
  assert.match(page, /<a class="open" href=\{entry\.slideUrl\} target="_blank" rel="noopener noreferrer">Open<\/a>/);
});

test("archive applies the KUN-381 Gallery Wall identity", () => {
  const page = readFileSync("src/pages/index.astro", "utf8");
  assert.match(page, /<title>Tech info slides<\/title>/);
  assert.match(page, /<h1>Tech info slides<\/h1>/);
  assert.match(page, /rel="icon"/);
  assert.match(page, /import\.meta\.env\.BASE_URL/);
  assert.match(page, /const basePath = import\.meta\.env\.BASE_URL\.replace/);
  assert.match(page, /favicon\.svg/);
  assert.doesNotMatch(page, /href="\/favicon\.svg"/);
  assert.match(page, /--bg:\s*#1c1814/);
  assert.match(page, /--accent:\s*#d6a05f/);
  assert.match(page, /font-family:\s*"Times New Roman"/);
});

test("archive cards render as poster-first Gallery Wall items", () => {
  const page = readFileSync("src/pages/index.astro", "utf8");
  assert.match(page, /data-archive-card/);
  assert.match(page, /class="poster"/);
  assert.match(page, /entry\.thumbnailUrl/);
  assert.match(page, /class="poster placeholder"/);
  assert.match(page, /article\[data-archive-card\]/);
});

test("archive favicon is an original documented SVG", () => {
  assert.ok(existsSync("public/favicon.svg"), "favicon SVG must exist");
  const favicon = readFileSync("public/favicon.svg", "utf8");
  assert.match(favicon, /<svg\b/);
  assert.match(favicon, /Tech info slides favicon/);

  const readme = readFileSync("README.md", "utf8");
  assert.match(readme, /Tech info slides/);
  assert.match(readme, /public\/favicon\.svg/);
  assert.match(readme, /Original SVG/);
});

test("archive derives month filters from generatedAt with pubDate fallback", () => {
  const page = readFileSync("src/pages/index.astro", "utf8");
  assert.match(page, /generatedAt\s*\?\?\s*entry\.data\.pubDate/);
  assert.match(page, /toISOString\(\)\.slice\(0,\s*7\)/);
  assert.match(page, /data-month=/);
  assert.match(page, /data-archive-time=/);
});

test("slide content schema keeps tags compatible while allowing generatedAt fallback", () => {
  const config = readFileSync("src/content.config.ts", "utf8");
  assert.match(config, /defineCollection/);
  assert.match(config, /tags:\s*z\.array\(z\.string\(\)\)/);
  assert.match(config, /generatedAt:\s*z\.coerce\.date\(\)\.optional\(\)/);
  assert.match(config, /slideUrl/);
  assert.match(config, /thumbnailUrl/);
});
