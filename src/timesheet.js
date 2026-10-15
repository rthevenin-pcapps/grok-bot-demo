export function sortEntries(entries) {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date));
}

export function sumHours(entries) {
  return entries.reduce((total, entry) => total + entry.hours, 0);
}

export function entriesForProject(entries, projectId) {
  return sortEntries(entries.filter((e) => e.projectId === projectId));
}
