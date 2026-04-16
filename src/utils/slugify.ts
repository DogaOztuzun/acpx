export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Note: Non-ASCII characters (e.g., accented letters) are stripped by the
// first replace since they do not match the allowed character set [a-z0-9\s-].
