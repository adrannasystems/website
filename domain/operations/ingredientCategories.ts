export function sortRanksForCategoryOrder(
  existingIds: readonly string[],
  orderedIds: readonly string[],
): Map<string, number> | null {
  if (existingIds.length !== orderedIds.length) {
    return null;
  } else {
    const remaining = new Set(existingIds);
    const ranks = new Map<string, number>();
    for (const [index, id] of orderedIds.entries()) {
      if (!remaining.delete(id)) {
        return null;
      } else {
        ranks.set(id, index);
      }
    }
    if (remaining.size !== 0) {
      return null;
    } else {
      return ranks;
    }
  }
}
