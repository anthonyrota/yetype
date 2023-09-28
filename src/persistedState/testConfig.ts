import { BehaviorSubject } from 'rxjs';
import { typingSettingsStorageKey } from './storageKeys.js';

export const enum TypingTestTimeLimits {
  Fifteen = 15,
  Sixty = 60,
  OneTwenty = 120,
}

export const enum TypingTestWordLimits {
  Ten = 10,
  Forty = 40,
  TwoHundred = 200,
}

export const enum TypingTestType {
  Timed = 'timed',
  WordLimit = 'wordLimit',
  Quote = 'quote',
}

export const validTypingTestTimeLimits = [TypingTestTimeLimits.Fifteen, TypingTestTimeLimits.Sixty, TypingTestTimeLimits.OneTwenty];

export const validTypingTestWordLimits = [TypingTestWordLimits.Ten, TypingTestWordLimits.Forty, TypingTestWordLimits.TwoHundred];

export type TestConfig = {
  type: TypingTestType;
  timeLimit: TypingTestTimeLimits;
  wordLimit: TypingTestWordLimits;
};

function storeTestConfig(testConfig: TestConfig | null): void {
  if (testConfig === null) {
    localStorage.removeItem(typingSettingsStorageKey);
    return;
  }
  try {
    localStorage.setItem(typingSettingsStorageKey, JSON.stringify(testConfig));
  } catch (error) {
    console.log('localStorage error', error);
  }
}

function loadTestConfig(): TestConfig | null {
  const typingSettingsRaw = localStorage.getItem(typingSettingsStorageKey);
  if (typingSettingsRaw === null) {
    return null;
  }
  let testConfig: unknown;
  try {
    testConfig = JSON.parse(typingSettingsRaw);
  } catch {
    storeTestConfig(null);
    return null;
  }
  if (
    typeof testConfig === 'object' &&
    testConfig !== null &&
    'type' in testConfig &&
    (testConfig.type === TypingTestType.Timed || testConfig.type === TypingTestType.WordLimit || testConfig.type === TypingTestType.Quote) &&
    'timeLimit' in testConfig &&
    (validTypingTestTimeLimits as unknown[]).includes(testConfig.timeLimit) &&
    'wordLimit' in testConfig &&
    (validTypingTestWordLimits as unknown[]).includes(testConfig.wordLimit)
  ) {
    return testConfig as TestConfig;
  }
  return null;
}

export const testConfig$ = new BehaviorSubject<TestConfig>(
  loadTestConfig() ?? { type: TypingTestType.Quote, timeLimit: TypingTestTimeLimits.Sixty, wordLimit: TypingTestWordLimits.Forty },
);

export function setTestConfig(testConfig: TestConfig): void {
  storeTestConfig(testConfig);
  testConfig$.next(testConfig);
}
