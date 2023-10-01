export function getOneEditDiff(before: string, after: string): { startIndex: number; endIndex: number; insertText: string } {
  if (before === '') {
    return { startIndex: 0, endIndex: 0, insertText: after };
  }
  let firstUnequalCharIndex = -1;
  for (let i = 0; i < before.length; i++) {
    if (i >= after.length) {
      return { startIndex: after.length, endIndex: before.length, insertText: '' };
    }
    if (before[i] !== after[i]) {
      firstUnequalCharIndex = i;
      break;
    }
  }
  if (firstUnequalCharIndex === -1) {
    return { startIndex: before.length, endIndex: before.length, insertText: after.slice(before.length) };
  }
  let lastUnequalCharIndexFromEnd = -1;
  for (let i = 0; i < before.length; i++) {
    if (i >= after.length) {
      return { startIndex: 0, endIndex: before.length - after.length, insertText: '' };
    }
    if (before[before.length - i - 1] !== after[after.length - i - 1]) {
      lastUnequalCharIndexFromEnd = i;
      break;
    }
  }
  if (lastUnequalCharIndexFromEnd === -1) {
    return { startIndex: 0, endIndex: 0, insertText: after.slice(0, after.length - before.length) };
  }
  if (firstUnequalCharIndex + lastUnequalCharIndexFromEnd > after.length) {
    return {
      startIndex: firstUnequalCharIndex,
      endIndex: firstUnequalCharIndex + before.length - after.length,
      insertText: '',
    };
  }
  return {
    startIndex: firstUnequalCharIndex,
    endIndex: before.length - lastUnequalCharIndexFromEnd,
    insertText: after.slice(firstUnequalCharIndex, after.length - lastUnequalCharIndexFromEnd),
  };
}
