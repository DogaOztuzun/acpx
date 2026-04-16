const UNIT_LABELS = ["B", "KB", "MB", "GB", "TB", "PB"] as const;

export function formatBytes(bytes: number): string {
  if (Number.isNaN(bytes)) {
    return "NaN";
  }
  if (bytes < 0) {
    return `-${formatBytes(-bytes)}`;
  }
  if (bytes === 0) {
    return "0 B";
  }

  const unitIndex = Math.floor(Math.log(bytes) / Math.log(1024));
  const unit = UNIT_LABELS[Math.min(unitIndex, UNIT_LABELS.length - 1)];
  const value = bytes / Math.pow(1024, unitIndex);

  return `${value % 1 === 0 ? value : value.toFixed(2)} ${unit}`;
}
