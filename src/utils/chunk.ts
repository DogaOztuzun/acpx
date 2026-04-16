export function chunk<T>(array: T[], size: number): T[][] {
  if (array == null) {
    throw new TypeError("array must not be null or undefined");
  }

  if (!Number.isInteger(size) || size <= 0) {
    throw new TypeError("size must be a positive integer");
  }

  if (array.length === 0) {
    return [];
  }

  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}
