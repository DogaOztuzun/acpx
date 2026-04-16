// oxlint-disable typescript/no-explicit-any
export interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
  cancel(): void;
  flush(): void;
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  waitMs: number,
): DebouncedFunction<T> {
  if (waitMs < 0 || !Number.isFinite(waitMs)) {
    throw new RangeError("waitMs must be a non-negative finite number");
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const debounced = (...args: Parameters<T>) => {
    lastArgs = args;
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      if (lastArgs !== null) {
        fn(...lastArgs);
      }
      timer = null;
      lastArgs = null;
    }, waitMs);
  };

  debounced.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
      lastArgs = null;
    }
  };

  debounced.flush = () => {
    if (timer !== null && lastArgs !== null) {
      clearTimeout(timer);
      fn(...lastArgs);
      timer = null;
      lastArgs = null;
    }
  };

  return debounced as DebouncedFunction<T>;
}
