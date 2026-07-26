export function matchesArchiveFilter(activeFilter, entry) {
  if (activeFilter === "all") return true;
  if (activeFilter === "featured") return entry.featured;
  return entry.month === activeFilter;
}
