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
