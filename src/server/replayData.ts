import { maxTestSeconds } from './verification.js';

export type SoloReplayDataEdit =
  | [startIndex: number, endIndex: number, milliseconds: number]
  | [startIndex: number, endIndex: number, milliseconds: number, insertText: string];
export type SoloReplayData = SoloReplayDataEdit[];

export function isValidSoloReplayData(json: unknown): json is SoloReplayData {
  if (!Array.isArray(json)) {
    return false;
  }
  if (json.length === 0) {
    return false;
  }
  let length = 0;
  let millisecondsPassed = 0;
  return json.every((value) => {
    if (!Array.isArray(value)) {
      return false;
    }
    if (value.length !== 3 && value.length !== 4) {
      return false;
    }
    const [startIndex, endIndex, milliseconds, insertText] = value as unknown[];
    if (
      typeof startIndex !== 'number' ||
      typeof endIndex !== 'number' ||
      typeof milliseconds !== 'number' ||
      (insertText !== undefined && (typeof insertText !== 'string' || insertText === '')) ||
      !Number.isInteger(startIndex) ||
      !Number.isInteger(endIndex) ||
      !Number.isInteger(milliseconds) ||
      milliseconds < 0 ||
      milliseconds > maxTestSeconds * 1000 ||
      startIndex < 0 ||
      startIndex > length ||
      endIndex < 0 ||
      endIndex > length ||
      startIndex > endIndex ||
      milliseconds < millisecondsPassed
    ) {
      return false;
    }
    millisecondsPassed = milliseconds;
    length += (insertText === undefined ? 0 : insertText.length) + startIndex - endIndex;
    return true;
  });
}
