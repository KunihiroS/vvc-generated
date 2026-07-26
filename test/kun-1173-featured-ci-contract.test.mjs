import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const contentConfig = () => readFileSync("src/content.config.ts", "utf8");
const archivePage = () => readFileSync("src/pages/index.astro", "utf8");
const readme = () => readFileSync("README.md", "utf8");
const pagesWorkflow = () => readFileSync(".github/workflows/pages.yml", "utf8");

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

  assert.match(page, /import\s+\{\s*matchesArchiveFilter\s*\}/);
  assert.match(page, /matchesArchiveFilter\(activeMonth,\s*\{/);
  assert.match(page, /featured:\s*entry\.getAttribute\(["']data-featured["']\)\s*===\s*["']true["']/);
  assert.match(page, /entry\.hidden\s*=\s*!matchesFilter/);
});

test("Featured filtering preserves All, month, Newest, and Oldest behavior", () => {
  const page = archivePage();

  assert.match(page, /month:\s*entry\.getAttribute\(["']data-month["']\)/);
  assert.match(page, /activeSort\s*===\s*["']oldest["']\s*\?\s*1\s*:\s*-1/);
  assert.match(page, /data-sort="newest"/);
  assert.match(page, /data-sort="oldest"/);
});

test("the live archive explains when the selected filter has no matches", () => {
  const page = archivePage();
  const liveArchive = page.match(/<section\s+class="archive-list"\s+aria-live="polite">[\s\S]*?<\/section>/)?.[0] ?? "";

  assert.match(
    liveArchive,
    /<p[^>]*data-filter-empty[^>]*hidden[^>]*>No slides match this filter\.<\/p>/,
    "the aria-live archive must contain a hidden filtered-empty message",
  );
  assert.match(page, /(?:const|let)\s+filterEmpty\s*=\s*document\.querySelector\(["']\[data-filter-empty\]["']\)/);
  assert.match(page, /(?:let|const)\s+visibleCount\s*=\s*0/);
  assert.match(
    page,
    /entry\.hidden\s*=\s*!matchesFilter\s*;[\s\S]{0,160}if\s*\(\s*(?:matchesFilter|!entry\.hidden)\s*\)\s*visibleCount\s*\+=\s*1/,
    "updateArchive must count cards after applying their visibility state",
  );
  assert.match(
    page,
    /filterEmpty\.hidden\s*=\s*visibleCount\s*>\s*0/,
    "the filtered-empty status must be visible exactly when the visible match count is zero",
  );
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

test("README distinguishes PR validation from every production Pages trigger", () => {
  const productionWorkflow = pagesWorkflow();

  assert.match(productionWorkflow, /push:\s*\n\s+branches:\s*\[main\]/);
  assert.match(productionWorkflow, /workflow_dispatch:/);
  assert.match(readme(), /Pushes to `main` or an explicitly started `workflow_dispatch` run/);
  assert.match(readme(), /Pull requests never deploy Pages/);
});
