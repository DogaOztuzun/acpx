export function dedupe<T>(arr: T[], keyFn?: (item: T) => unknown): T[] {
  if (arr.length <= 1) {
    return arr;
  }
  const seen = new Set<unknown>();
  const result: T[] = [];
  for (const item of arr) {
    const key = keyFn ? keyFn(item) : item;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}
