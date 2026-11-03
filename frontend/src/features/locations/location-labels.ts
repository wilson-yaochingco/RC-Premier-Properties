/** Count label shared by the atlas ledger and the location stories. */
export function homesLabel(count: number): string {
  return `${count.toLocaleString("en-PH")} ${count === 1 ? "home" : "homes"}`;
}
