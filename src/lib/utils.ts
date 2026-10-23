export function formatCount(value: number) {
  return Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0);
}

export function formatDuration(value: number) {
  if (!value) return "LIVE";
  const seconds = Math.floor(value);
  return `${seconds >= 3600 ? `${Math.floor(seconds / 3600)}:` : ""}${String(Math.floor(seconds / 60) % 60).padStart(seconds >= 3600 ? 2 : 1, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function avatarColor(name: string) {
  const colors = [
    "#b8d8ae",
    "#b7c8e8",
    "#dbbad6",
    "#e4cc9f",
    "#b8d9d9",
    "#d9b9a8",
  ];
  return colors[
    [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length
  ];
}
