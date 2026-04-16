export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    throw new RangeError("min must be less than or equal to max");
  }
  // NaN compares falsy to both < and >, so NaN values pass through unchanged
  // which is IEEE 754 compliant and consistent with standard numeric expectations
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}
