import { TypingTestType } from '../../persistedState/testConfigTypes.js';
import { SoloReplayData, isValidSoloReplayData } from '../replayData.js';
import {
  isValidCharactersTypedCorrectly,
  isValidCharactersTypedIncorrectly,
  isValidQuoteId,
  isValidSecondsTaken,
  isValidTestTimeSeconds,
  isValidTestWordLimit,
  isValidUuid,
  isValidWords,
  isValidWordsTypedCorrectly,
  isValidWordsTypedIncorrectly,
} from '../verification.js';

export const getPastTestsEndpoint = '/api/getpasttests';

export type GetPastTestsFilter =
  | {
      type: TypingTestType.Timed;
      timeLimit: number | null;
    }
  | {
      type: TypingTestType.WordLimit;
      wordLimit: number | null;
    }
  | {
      type: TypingTestType.Quote;
      quoteId: string | null;
    };

function isGetPastTestsFilter(value: unknown): value is GetPastTestsFilter {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { type } = value as { type: unknown };
  if (type === TypingTestType.Timed) {
    const { timeLimit } = value as { timeLimit: unknown };
    return (typeof timeLimit === 'number' && isValidTestTimeSeconds(timeLimit)) || timeLimit === null;
  }
  if (type === TypingTestType.WordLimit) {
    const { wordLimit } = value as { wordLimit: unknown };
    return (typeof wordLimit === 'number' && isValidTestWordLimit(wordLimit)) || wordLimit === null;
  }
  if (type === TypingTestType.Quote) {
    const { quoteId } = value as { quoteId: unknown };
    return (typeof quoteId === 'string' && isValidQuoteId(quoteId)) || quoteId === null;
  }
  return false;
}

export const enum GetPastTestsCursorDirection {
  Before = 'before',
  After = 'after',
}

export type GetPastTestsRequest = {
  cursor: { direction: GetPastTestsCursorDirection; time: number } | null;
  inclusiveFilters: GetPastTestsFilter[];
};

export function getValidGetPastTestsRequest(body: unknown): GetPastTestsRequest | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const { cursor, inclusiveFilters } = body as { cursor: unknown; inclusiveFilters: unknown };
  if (!Array.isArray(inclusiveFilters) || !inclusiveFilters.every((filter) => isGetPastTestsFilter(filter))) {
    return null;
  }
  if (cursor === null) {
    return {
      cursor: null,
      inclusiveFilters,
    };
  }
  if (typeof cursor !== 'object') {
    return null;
  }
  const { direction, time } = cursor as { direction: unknown; time: unknown };
  if (
    (direction !== GetPastTestsCursorDirection.Before && direction !== GetPastTestsCursorDirection.After) ||
    typeof time !== 'number' ||
    time <= 1695000000000 ||
    time >= Date.now()
  ) {
    return null;
  }
  return {
    cursor: {
      direction,
      time,
    },
    inclusiveFilters,
  };
}

export type GetPastTestsResponseTest =
  | {
      type: TypingTestType.Timed;
      id: string;
      words: string;
      testTimeSeconds: number;
      charactersTypedCorrectly: number;
      charactersTypedIncorrectly: number;
      wordsTypedCorrectly: number;
      wordsTypedIncorrectly: number;
      replayData: SoloReplayData;
      createdAt: number;
    }
  | {
      type: TypingTestType.WordLimit;
      id: string;
      words: string;
      testWordLimit: number;
      secondsTaken: number;
      charactersTypedCorrectly: number;
      charactersTypedIncorrectly: number;
      wordsTypedCorrectly: number;
      wordsTypedIncorrectly: number;
      replayData: SoloReplayData;
      createdAt: number;
    }
  | {
      type: TypingTestType.Quote;
      id: string;
      quoteId: string;
      secondsTaken: number;
      charactersTypedCorrectly: number;
      charactersTypedIncorrectly: number;
      wordsTypedCorrectly: number;
      wordsTypedIncorrectly: number;
      replayData: SoloReplayData;
      createdAt: number;
    };

function isGetPastTestsResponseTest(value: unknown): value is GetPastTestsResponseTest {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { type, id, charactersTypedCorrectly, charactersTypedIncorrectly, wordsTypedCorrectly, wordsTypedIncorrectly, replayData, createdAt } = value as {
    type: unknown;
    id: unknown;
    charactersTypedCorrectly: unknown;
    charactersTypedIncorrectly: unknown;
    wordsTypedCorrectly: unknown;
    wordsTypedIncorrectly: unknown;
    replayData: unknown;
    createdAt: unknown;
  };
  if (
    (type !== TypingTestType.Timed && type !== TypingTestType.WordLimit && type !== TypingTestType.Quote) ||
    typeof id !== 'string' ||
    typeof charactersTypedCorrectly !== 'number' ||
    typeof charactersTypedIncorrectly !== 'number' ||
    typeof wordsTypedCorrectly !== 'number' ||
    typeof wordsTypedIncorrectly !== 'number' ||
    !isValidSoloReplayData(replayData) ||
    !(typeof createdAt === 'number') ||
    !isValidUuid(id) ||
    !isValidCharactersTypedCorrectly(charactersTypedCorrectly) ||
    !isValidCharactersTypedIncorrectly(charactersTypedIncorrectly) ||
    !isValidWordsTypedCorrectly(wordsTypedCorrectly) ||
    !isValidWordsTypedIncorrectly(wordsTypedIncorrectly)
  ) {
    return false;
  }
  if (type === TypingTestType.Timed) {
    const { words, testTimeSeconds } = value as { words: unknown; testTimeSeconds: unknown };
    return typeof words === 'string' && isValidWords(words) && typeof testTimeSeconds === 'number' && isValidTestTimeSeconds(testTimeSeconds);
  }
  if (type === TypingTestType.WordLimit) {
    const { words, testWordLimit, secondsTaken } = value as { words: unknown; testWordLimit: unknown; secondsTaken: unknown };
    return (
      typeof words === 'string' &&
      isValidWords(words) &&
      typeof testWordLimit === 'number' &&
      isValidTestWordLimit(testWordLimit) &&
      typeof secondsTaken === 'number' &&
      isValidSecondsTaken(secondsTaken)
    );
  }
  const { quoteId, secondsTaken } = value as { quoteId: unknown; secondsTaken: unknown };
  return typeof quoteId === 'string' && typeof secondsTaken === 'number' && isValidUuid(quoteId) && isValidSecondsTaken(secondsTaken);
}

export const enum GetPastTestsResponseType {
  Fail = 'fail',
  NotAuthorized = 'notAuthorized',
  TooManyFilters = 'tooManyFilters',
  Success = 'success',
}

export type GetPastTestsResponse =
  | { type: GetPastTestsResponseType.Fail }
  | { type: GetPastTestsResponseType.NotAuthorized }
  | { type: GetPastTestsResponseType.TooManyFilters }
  | {
      type: GetPastTestsResponseType.Success;
      tests: GetPastTestsResponseTest[];
      hasMore: boolean;
    };

export function isValidGetPastTestsResponseJson(responseJson: unknown): responseJson is GetPastTestsResponse {
  if (typeof responseJson !== 'object' || responseJson === null) {
    return false;
  }
  const { type } = responseJson as { type: unknown };
  if (
    type !== GetPastTestsResponseType.Fail &&
    type !== GetPastTestsResponseType.NotAuthorized &&
    type !== GetPastTestsResponseType.TooManyFilters &&
    type !== GetPastTestsResponseType.Success
  ) {
    return false;
  }
  if (type === GetPastTestsResponseType.Success) {
    const { tests, hasMore } = responseJson as { tests: unknown; hasMore: boolean };
    return Array.isArray(tests) && tests.every(isGetPastTestsResponseTest) && typeof hasMore === 'boolean';
  }
  return true;
}
