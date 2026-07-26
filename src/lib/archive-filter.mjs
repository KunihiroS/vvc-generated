export function matchesArchiveFilter(activeFilter, entry) {
  if (activeFilter === "all") return true;
  if (activeFilter === "featured") return entry.featured;
  return entry.month === activeFilter;
}

export function applyArchiveFilterSelection(activeSort, selectedFilter) {
  return {
    activeFilter: selectedFilter,
    activeSort: selectedFilter === "featured" ? "newest" : activeSort,
  };
}
