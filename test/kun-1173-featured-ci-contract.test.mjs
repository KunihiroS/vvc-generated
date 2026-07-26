import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const contentConfig = () => readFileSync("src/content.config.ts", "utf8");
const archivePage = () => readFileSync("src/pages/index.astro", "utf8");

function ciWorkflow() {
  const path = ".github/workflows/ci.yml";
  assert.ok(existsSync(path), `${path} must exist for pull-request validation`);
  return readFileSync(path, "utf8");
}

test("slide content defaults featured to false for existing entries", () => {
  assert.match(
    contentConfig(),
    /featured:\s*z\.boolean\(\)\.default\(false\)/,
    "the slide schema must define featured: z.boolean().default(false)",
  );
});

test("Featured is an exclusive choice in the month-filter control group", () => {
  const page = archivePage();
  const monthControls = page.match(/<nav\s+class="control-group"\s+aria-label="Months">[\s\S]*?<\/nav>/)?.[0] ?? "";

  assert.match(monthControls, /data-month-filter="all"[^>]*>All months<\/button>/);
  assert.match(monthControls, /data-month-filter="featured"[^>]*>Featured<\/button>/);
  assert.match(monthControls, /data-month-filter=\{month\}/);
});

test("every archive card exposes its featured value", () => {
  assert.match(
    archivePage(),
    /<article\s+[^>]*data-archive-card[^>]*data-featured=\{String\(entry\.featured\)\}[^>]*>/,
    "archive cards must expose data-featured as the string value of entry.featured",
  );
});

test("Featured selection hides every card not marked featured", () => {
  const page = archivePage();

  assert.match(page, /activeMonth\s*===\s*["']featured["']/);
  assert.match(page, /getAttribute\(["']data-featured["']\)\s*===\s*["']true["']/);
  assert.match(
    page,
    /activeMonth\s*!==\s*["']featured["'][\s\S]{0,240}getAttribute\(["']data-featured["']\)\s*===\s*["']true["']/,
    "visibility logic must require data-featured=true only when Featured is selected",
  );
});

test("Featured filtering preserves All, month, Newest, and Oldest behavior", () => {
  const page = archivePage();

  assert.match(page, /activeMonth\s*(?:===|!==)\s*["']all["']/);
  assert.match(page, /getAttribute\(["']data-month["']\)\s*!==\s*activeMonth/);
  assert.match(page, /activeSort\s*===\s*["']oldest["']\s*\?\s*1\s*:\s*-1/);
  assert.match(page, /data-sort="newest"/);
  assert.match(page, /data-sort="oldest"/);
});

test("CI workflow validates pull requests with tests and a production build", () => {
  const workflow = ciWorkflow();

  assert.match(workflow, /(?:^|\n)on:\s*\n(?:[ \t]+[^\n]+\n)*?[ \t]+pull_request:\s*(?:\n|$)/);
  assert.match(workflow, /(?:^|\n)[ \t]+-[ \t]+run:\s*npm test\s*(?:\n|$)/);
  assert.match(workflow, /(?:^|\n)[ \t]+-[ \t]+run:\s*npm run build\s*(?:\n|$)/);
});

test("CI workflow has read-only contents permission and no Pages deployment capability", () => {
  const workflow = ciWorkflow();

  assert.match(workflow, /(?:^|\n)permissions:\s*\n[ \t]+contents:\s*read\s*(?:\n|$)/);
  assert.doesNotMatch(workflow, /(?:^|\n)[ \t]+pages:\s*write\s*(?:\n|$)/);
  assert.doesNotMatch(workflow, /(?:^|\n)[ \t]+id-token:\s*write\s*(?:\n|$)/);
  assert.doesNotMatch(workflow, /actions\/upload-pages-artifact/);
  assert.doesNotMatch(workflow, /actions\/deploy-pages/);
  assert.doesNotMatch(workflow, /(?:^|\n)[ \t]{2}deploy:\s*(?:\n|$)/);
});
