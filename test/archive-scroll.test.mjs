import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const archivePage = () => readFileSync("src/pages/index.astro", "utf8");

function scrollComponent() {
  const path = "src/components/HorizontalScroll.astro";
  assert.ok(existsSync(path), "the production horizontal-scroll component must exist");
  return readFileSync(path, "utf8");
}

// These are production-used source contracts, not browser geometry proofs.
function cssRule(source, selector) {
  const css = source.match(/<style\b[^>]*>([\s\S]*?)<\/style>/)?.[1] ?? "";
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rule = css.match(new RegExp(`(?:^|[}\\s])${escaped}\\s*\\{([^}]*)\\}`))?.[1];
  assert.ok(rule, `production CSS must define ${selector}`);
  return rule;
}

test("archive imports HorizontalScroll and wraps only the existing Months nav", () => {
  const page = archivePage();
  assert.ok(
    /import\s+HorizontalScroll\s+from\s+["']\.\.\/components\/HorizontalScroll\.astro["']/.test(page),
    "archive page must import HorizontalScroll from ../components/HorizontalScroll.astro",
  );
  const wrapper = page.match(/<HorizontalScroll>([\s\S]*?)<\/HorizontalScroll>/);
  assert.ok(wrapper, "archive page must use the imported HorizontalScroll component");
  assert.match(wrapper[1], /<nav class="control-group" aria-label="Months">[\s\S]*?<\/nav>/);
  assert.match(wrapper[1], /data-month-filter="all"/);
  assert.match(wrapper[1], /data-month-filter="featured"/);
  assert.match(wrapper[1], /data-month-filter=\{month\}/);
  assert.doesNotMatch(wrapper[1], /data-sort|Sort order/);
  const afterWrapper = page.slice(wrapper.index + wrapper[0].length);
  assert.match(afterWrapper, /<div class="control-group" aria-label="Sort order">\s*<button data-sort="newest"[\s\S]*?data-sort="oldest"/);
});

test("archive constrains the filter column and separates sort below at narrow widths", () => {
  const page = archivePage();
  const controls = cssRule(page, ".controls");
  assert.match(controls, /display:\s*grid\s*;/);
  assert.match(controls, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto\s*;/);
  assert.match(page, /@media\s*\(max-width:\s*820px\)[\s\S]*?\.controls\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*;/);
  assert.match(cssRule(page, "body"), /min-width:\s*0\s*;/);
  assert.doesNotMatch(cssRule(page, "body"), /overflow-x:\s*(?:hidden|clip)/);
});

test("month filters stay on one line without shrinking or wrapping button text", () => {
  const page = archivePage();
  assert.match(cssRule(page, '.control-group[aria-label="Months"]'), /flex-wrap:\s*nowrap\s*;/);
  const buttonStyles = page.match(/button\[data-month-filter\],\s*button\[data-sort\]\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.match(buttonStyles, /flex-shrink:\s*0\s*;/);
  assert.match(buttonStyles, /white-space:\s*nowrap\s*;/);
});

test("scroll markup keeps native overflow usable with initially hidden directional buttons", () => {
  const component = scrollComponent();
  assert.match(component, /<div class="horizontal-scroll" data-horizontal-scroll>/);
  assert.match(component, /<div class="horizontal-scroll__viewport" data-scroll-viewport>\s*<div class="horizontal-scroll__content" data-scroll-content>\s*<slot\s*\/>/);
  for (const direction of ["back", "forward"]) {
    const button = component.match(new RegExp(`<button\\b[^>]*data-scroll-${direction}[^>]*>`))?.[0] ?? "";
    assert.match(button, /type="button"/);
    assert.match(button, /aria-label="[^"]+"/);
    assert.match(button, /\bhidden\b/);
    assert.match(button, /\bdisabled\b/);
  }
});

test("only the constrained viewport scrolls and max-content remains a single row", () => {
  const component = scrollComponent();
  const root = cssRule(component, ".horizontal-scroll");
  assert.match(root, /display:\s*flex\s*;/);
  assert.match(root, /min-width:\s*0\s*;/);
  assert.match(root, /max-width:\s*100%\s*;/);
  assert.match(root, /width:\s*100%\s*;/);
  assert.doesNotMatch(root, /overflow/);
  const viewport = cssRule(component, ".horizontal-scroll__viewport");
  assert.match(viewport, /min-width:\s*0\s*;/);
  assert.match(viewport, /max-width:\s*100%\s*;/);
  assert.match(viewport, /overflow-x:\s*auto\s*;/);
  assert.match(viewport, /padding:\s*4px\s*;/);
  const content = cssRule(component, ".horizontal-scroll__content");
  assert.match(content, /width:\s*max-content\s*;/);
  assert.match(content, /flex-wrap:\s*nowrap\s*;/);
  assert.match(cssRule(component, ".horizontal-scroll__arrow[hidden]"), /display:\s*none\s*;/);
  assert.match(cssRule(component, ".horizontal-scroll__arrow:focus-visible"), /outline:\s*2px\s+solid/);
  assert.match(cssRule(archivePage(), "button[data-month-filter]:focus-visible"), /outline-offset:\s*2px\s*;/);
});

test("scroll enhancement measures the arrow-free root and rechecks content and visibility changes", () => {
  const component = scrollComponent();
  assert.match(component, /const overflowing\s*=\s*contentWidth\s*\+\s*focusPadding\s*>\s*root\.clientWidth\s*\+\s*1/);
  assert.match(component, /back\.hidden\s*=\s*!overflowing/);
  assert.match(component, /forward\.hidden\s*=\s*!overflowing/);
  assert.match(component, /back\.disabled\s*=\s*!overflowing\s*\|\|\s*viewport\.scrollLeft\s*<=\s*1/);
  assert.match(component, /forward\.disabled\s*=\s*!overflowing\s*\|\|\s*viewport\.scrollLeft\s*>=\s*maxScroll\s*-\s*1/);
  assert.match(component, /new ResizeObserver\(scheduleMeasure\)/);
  assert.match(component, /observer\.observe\(root\)/);
  assert.match(component, /observer\.observe\(content\)/);
  assert.match(component, /document\.fonts\.ready\.then\(scheduleMeasure\)/);
  assert.match(component, /visibilitychange/);
});

test("keyboard focus uses local horizontal scrolling and arrows respect reduced motion", () => {
  const component = scrollComponent();
  assert.match(component, /addEventListener\("focusin"/);
  assert.match(component, /viewport\.scrollBy\(/);
  assert.doesNotMatch(component, /scrollIntoView|preventDefault\(|addEventListener\("(?:wheel|touchmove)"/);
  assert.match(component, /prefers-reduced-motion:\s*reduce/);
  assert.match(component, /behavior:\s*reducedMotion\.matches\s*\?\s*"auto"\s*:\s*"smooth"/);
});
