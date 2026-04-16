/**
 * Generates an array of numbers from start to end, exclusive, by step.
 *
 * Note: Floating-point step values may accumulate precision errors over
 * multiple iterations. Results should be verified with approximate
 * comparison (e.g., within Number.EPSILON) when used in equality tests.
 */
export function range(start: number, end: number, step: number = 1): number[] {
  if (step === 0) {
    throw new RangeError("step cannot be zero");
  }

  if (Number.isNaN(start) || Number.isNaN(end) || Number.isNaN(step)) {
    throw new TypeError("start, end, and step must be numbers");
  }

  const result: number[] = [];

  if (step > 0) {
    for (let i = start; i < end; i += step) {
      result.push(i);
    }
  } else {
    for (let i = start; i > end; i += step) {
      result.push(i);
    }
  }

  return result;
}
