export const enum TypingTestType {
  Timed = 'timed',
  WordLimit = 'wordLimit',
  Quote = 'quote',
}

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

export const validTypingTestTimeLimits = [TypingTestTimeLimits.Fifteen, TypingTestTimeLimits.Sixty, TypingTestTimeLimits.OneTwenty];

export const validTypingTestWordLimits = [TypingTestWordLimits.Ten, TypingTestWordLimits.Forty, TypingTestWordLimits.TwoHundred];

export type TestConfig = {
  type: TypingTestType;
  timeLimit: TypingTestTimeLimits;
  wordLimit: TypingTestWordLimits;
};
