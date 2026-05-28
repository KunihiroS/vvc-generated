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

test("archive UI uses tag buttons instead of search input", () => {
  const page = readFileSync("src/pages/index.astro", "utf8");
  assert.match(page, /data-tag-filter/);
  assert.doesNotMatch(page, /<input\b/i);
  assert.doesNotMatch(page, /type=["']search["']/i);
});

test("slide content schema exposes tag-filterable entries", () => {
  const config = readFileSync("src/content.config.ts", "utf8");
  assert.match(config, /defineCollection/);
  assert.match(config, /tags:\s*z\.array\(z\.string\(\)\)/);
  assert.match(config, /slideUrl/);
  assert.match(config, /thumbnailUrl/);
});
