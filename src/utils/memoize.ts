export function memoize<A extends string | number, R>(fn: (arg: A) => R): (arg: A) => R {
  if (typeof fn !== "function") {
    throw new TypeError("fn must be a function");
  }

  const cache = new Map<A, R>();

  return (arg: A): R => {
    if (cache.has(arg)) {
      return cache.get(arg)!;
    }
    const result = fn(arg);
    cache.set(arg, result);
    return result;
  };
}
