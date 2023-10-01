import fs from 'fs';
import path from 'path';
import { describe, test, expect } from '@jest/globals';
import { getOneEditDiff } from './getOneEditDiff.js';

type FailsJson = {
  fails: [before: string, after: string][];
};

const failsJsonPath = path.join(__dirname, 'getOneEditDiff.fails.json');

const readFails = (): FailsJson => {
  const failsJson = fs.readFileSync(failsJsonPath, 'utf8');
  return JSON.parse(failsJson) as FailsJson;
};

const saveFail = (before: string, after: string): void => {
  const failsJson = readFails();
  if (failsJson.fails.some(([failBefore, failAfter]) => failBefore === before && failAfter === after)) {
    return;
  }
  failsJson.fails.push([before, after]);
  fs.writeFileSync(failsJsonPath, JSON.stringify(failsJson), 'utf8');
};

describe('getOneEditDiff', () => {
  test('deleting duplicate chars at end', () => {
    expect(getOneEditDiff('200', '20')).toEqual({ startIndex: 2, endIndex: 3, insertText: '' });
  });

  test('deleting duplicate char at start', () => {
    expect(getOneEditDiff('220', '20')).toEqual({ startIndex: 0, endIndex: 1, insertText: '' });
  });

  test('inserting char at start', () => {
    expect(getOneEditDiff('111', '2111')).toEqual({ startIndex: 0, endIndex: 0, insertText: '2' });
  });

  test('inserting char in middle', () => {
    expect(getOneEditDiff('111', '1121')).toEqual({ startIndex: 2, endIndex: 2, insertText: '2' });
  });

  test('replacing duplicate char in middle', () => {
    expect(getOneEditDiff('111', '121')).toEqual({ startIndex: 1, endIndex: 2, insertText: '2' });
  });

  test('replace in middle with different length', () => {
    expect(getOneEditDiff('14241892', '1634292')).toEqual({ startIndex: 1, endIndex: 6, insertText: '6342' });
  });

  test('delete in middle with repeating pattern', () => {
    expect(getOneEditDiff('123123432123', '123123123')).toEqual({ startIndex: 6, endIndex: 9, insertText: '' });
  });

  test('previous failed cases', () => {
    readFails().fails.forEach(([before, after]) => {
      const diff = getOneEditDiff(before, after);
      const afterDiff = before.slice(0, diff.startIndex) + diff.insertText + before.slice(diff.endIndex);
      expect(afterDiff).toBe(after);
    });
  });

  test('random strings', () => {
    for (let i = 0; i < 1000; i++) {
      const makeRandomStringOfLength = (length: number): string => {
        return Array.from({ length }, () => '123'[Math.floor(Math.random() * 3)]).join('');
      };
      const before = makeRandomStringOfLength(Math.floor(Math.random() * 3) + 3);
      const after = makeRandomStringOfLength(Math.floor(Math.random() * 3) + 3);
      const diff = getOneEditDiff(before, after);
      const afterDiff = before.slice(0, diff.startIndex) + diff.insertText + before.slice(diff.endIndex);
      if (afterDiff !== after) {
        saveFail(before, after);
      }
      expect(afterDiff).toBe(after);
    }
  });
});
