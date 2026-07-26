import assert from "node:assert/strict";
import { test } from "node:test";

import { applyArchiveFilterSelection, matchesArchiveFilter } from "../src/lib/archive-filter.mjs";

test("all matches entries regardless of month or featured status", () => {
  assert.equal(matchesArchiveFilter("all", { month: "2026-07", featured: true }), true);
  assert.equal(matchesArchiveFilter("all", { month: "2026-05", featured: false }), true);
});

test("featured matches only entries explicitly marked featured", () => {
  assert.equal(matchesArchiveFilter("featured", { month: "2026-07", featured: true }), true);
  assert.equal(matchesArchiveFilter("featured", { month: "2026-07", featured: false }), false);
  assert.equal(matchesArchiveFilter("featured", { month: "2026-05", featured: true }), true);
  assert.equal(matchesArchiveFilter("featured", { month: "2026-05", featured: false }), false);
});

test("a YYYY-MM filter matches only that exact month regardless of featured status", () => {
  assert.equal(matchesArchiveFilter("2026-07", { month: "2026-07", featured: true }), true);
  assert.equal(matchesArchiveFilter("2026-07", { month: "2026-07", featured: false }), true);
  assert.equal(matchesArchiveFilter("2026-07", { month: "2026-05", featured: true }), false);
  assert.equal(matchesArchiveFilter("2026-07", { month: "2026-05", featured: false }), false);
});

test("selecting Featured resets an existing Oldest sort to Newest", () => {
  assert.deepEqual(applyArchiveFilterSelection("oldest", "featured"), {
    activeFilter: "featured",
    activeSort: "newest",
  });
});
