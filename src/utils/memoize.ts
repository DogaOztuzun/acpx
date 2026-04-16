export function memoize<A extends string | number, R>(fn: (arg: A) => R): (arg: A) => R {
  // Type parameter A is constrained to string | number because Map keys must be
  // hashable via Object.is semantics. These primitives work reliably as Map keys.
  if (typeof fn !== "function") {
    throw new TypeError("fn must be a function");
  }

  const cache = new Map<A, R>();

  return (arg: A): R => {
    if (cache.has(arg)) {
      return cache.get(arg) as R;
    }
    const result = fn(arg);
    cache.set(arg, result);
    return result;
  };
}
