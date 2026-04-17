export function pick<T extends object>(obj: T, keys: (keyof T)[]): Partial<T> {
  const result = {} as Partial<T>;
  for (const key of keys) {
    if (Object.hasOwn(obj, key)) {
      result[key] = obj[key];
    }
  }
  return result;
}
