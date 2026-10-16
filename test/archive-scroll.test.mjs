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

test("visual polish keeps unframed SVG chevrons in 36px targets", () => {
  const component = scrollComponent();
  for (const direction of ["back", "forward"]) {
    const contents = component.match(new RegExp(`<button\\b[^>]*data-scroll-${direction}[^>]*>([\\s\\S]*?)<\\/button>`))?.[1] ?? "";
    assert.match(contents, /<svg\b[^>]*aria-hidden="true"[^>]*>/, `${direction} control must render an aria-hidden SVG chevron`);
    assert.match(contents, /focusable="false"/);
    assert.match(contents, /<path\b[^>]*stroke="currentColor"/);
    assert.doesNotMatch(contents, /[←→]/);
  }
  const root = cssRule(component, ".horizontal-scroll");
  assert.match(root, /--scroll-arrow-size:\s*36px\s*;/);
  assert.match(root, /--scroll-gap:\s*4px\s*;/);
  assert.match(root, /gap:\s*var\(--scroll-gap\)\s*;/);
  const arrow = cssRule(component, ".horizontal-scroll__arrow");
  assert.match(arrow, /flex:\s*0\s+0\s+var\(--scroll-arrow-size\)\s*;/);
  assert.match(arrow, /min-height:\s*var\(--scroll-arrow-size\)\s*;/);
  assert.match(arrow, /border:\s*0\s*;/);
  assert.match(arrow, /background:\s*transparent\s*;/);
  assert.match(arrow, /border-radius:\s*4px\s*;/);
  assert.doesNotMatch(arrow, /999|50%/);
});

test("visual polish retains a thin warm native scrollbar with transparent track", () => {
  const component = scrollComponent();
  const viewport = cssRule(component, ".horizontal-scroll__viewport");
  assert.match(viewport, /scrollbar-width:\s*thin\s*;/, "native scrollbar must stay visible and thin");
  assert.match(viewport, /scrollbar-color:\s*var\(--line-strong\)\s+transparent\s*;/);
  const scrollbar = cssRule(component, ".horizontal-scroll__viewport::-webkit-scrollbar");
  const thumb = cssRule(component, ".horizontal-scroll__viewport::-webkit-scrollbar-thumb");
  const height = Number(scrollbar.match(/height:\s*(\d+)px\s*;/)?.[1]);
  const transparentBorder = Number(thumb.match(/border-block:\s*(\d+)px\s+solid\s+transparent\s*;/)?.[1]);
  assert.equal(height, 11, "preserve the native scrollbar drag area");
  assert.equal(height - 2 * transparentBorder, 3, "paint a 3px thumb within the drag area");
  assert.match(thumb, /background-clip:\s*padding-box\s*;/);
  assert.match(cssRule(component, ".horizontal-scroll__viewport::-webkit-scrollbar-track"), /background:\s*transparent\s*;/);
  assert.match(cssRule(component, ".horizontal-scroll__viewport::-webkit-scrollbar-thumb"), /background:\s*var\(--line-strong\)\s*;/);
  assert.doesNotMatch(component, /scrollbar-width:\s*none|::-webkit-scrollbar\s*\{[^}]*display:\s*none/);
});

test("visual polish shows only available directional fades and clears them during focus", () => {
  const component = scrollComponent();
  const root = cssRule(component, ".horizontal-scroll");
  assert.match(root, /position:\s*relative\s*;/, "root must anchor fades without clipping focus outlines");
  assert.match(root, /--scroll-edge-inset:\s*calc\(var\(--scroll-arrow-size\)\s*\+\s*var\(--scroll-gap\)\)\s*;/);
  const fades = cssRule(component, ".horizontal-scroll::before,\n  .horizontal-scroll::after");
  assert.match(fades, /content:\s*""\s*;/);
  assert.match(fades, /position:\s*absolute\s*;/);
  assert.match(fades, /pointer-events:\s*none\s*;/);
  assert.match(fades, /opacity:\s*0\s*;/);
  for (const [pseudo, direction, edge, gradient] of [
    ["before", "back", "left", "right"],
    ["after", "forward", "right", "left"],
  ]) {
    const fade = cssRule(component, `.horizontal-scroll::${pseudo}`);
    assert.match(fade, new RegExp(`${edge}:\\s*var\\(--scroll-edge-inset\\)\\s*;`));
    assert.match(fade, new RegExp(`background:\\s*linear-gradient\\(to ${gradient},\\s*var\\(--bg\\),\\s*transparent\\)\\s*;`));
    assert.match(cssRule(component, `.horizontal-scroll[data-scroll-${direction}-available]::${pseudo}`), /opacity:\s*\.85\s*;/);
    assert.match(component, new RegExp(`root\\.toggleAttribute\\("data-scroll-${direction}-available",\\s*!${direction === "back" ? "back" : "forward"}\\.disabled\\)`));
  }
  const focusedFades = cssRule(component, ".horizontal-scroll:focus-within::before,\n  .horizontal-scroll:focus-within::after");
  assert.match(focusedFades, /opacity:\s*0\s*;/);
  assert.ok(component.indexOf(".horizontal-scroll:focus-within::before") > component.indexOf(".horizontal-scroll[data-scroll-forward-available]::after"), "focus suppression must win over directional fade visibility");
  const markup = component.split("<style>")[0];
  assert.doesNotMatch(markup, /data-scroll-(?:back|forward)-available/, "no-JS markup must not enable fades");
});

test("visual polish tightens toolbar row spacing without reducing the column gap", () => {
  assert.match(cssRule(archivePage(), ".controls"), /gap:\s*10px\s+14px\s*;/, "toolbar must use 10px row gap and retain 14px column gap");
});


test("precise scrollbar sizing retains the platform and forced-colors fallback", () => {
  const component = scrollComponent();
  const precise = component.match(/@supports selector\(::-webkit-scrollbar\)\s*\{\s*@media\s*\(forced-colors:\s*none\)\s*\{\s*\.horizontal-scroll__viewport\s*\{([^}]*)\}/)?.[1];
  assert.ok(precise, "limit precise scrollbar styling to supported engines outside forced colors");
  assert.match(precise, /scrollbar-width:\s*auto\s*;/);
  assert.match(precise, /scrollbar-color:\s*auto\s*;/);
  assert.match(cssRule(component, ".horizontal-scroll__viewport::-webkit-scrollbar-button"), /display:\s*none\s*;/);
});
