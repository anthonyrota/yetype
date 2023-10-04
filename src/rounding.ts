export function roundTo1Dp(num: number): string {
  return String(Math.round((num + Number.EPSILON) * 10) / 10);
}

export function roundTo2Dp(num: number): string {
  return String(Math.round((num + Number.EPSILON) * 100) / 100);
}
