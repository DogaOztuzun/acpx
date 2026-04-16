export function truncate(str: string, maxLen: number, suffix: string = "..."): string {
  if (str.length === 0) {
    return str;
  }
  if (maxLen <= 0) {
    return suffix;
  }
  if (maxLen <= suffix.length) {
    return suffix.slice(0, maxLen);
  }
  if (str.length <= maxLen) {
    return str;
  }
  return str.slice(0, maxLen - suffix.length) + suffix;
}
