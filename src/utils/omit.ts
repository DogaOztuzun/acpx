export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    if (Object.hasOwn(obj, key)) {
      delete (result as Record<string, unknown>)[key as string];
    }
  }
  return result as Omit<T, K>;
}