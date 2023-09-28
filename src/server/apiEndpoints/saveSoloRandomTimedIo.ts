import { SoloReplayData, isValidSoloReplayData } from '../replayData.js';
import {
  isValidCharactersTypedCorrectly,
  isValidCharactersTypedIncorrectly,
  isValidTestTimeSeconds,
  isValidWords,
  isValidWordsTypedCorrectly,
  isValidWordsTypedIncorrectly,
  normalizeCharactersTypedCorrectly,
  normalizeCharactersTypedIncorrectly,
  normalizeTestTimeSeconds,
  normalizeWords,
  normalizeWordsTypedCorrectly,
  normalizeWordsTypedIncorrectly,
} from '../verification.js';

export const saveSoloRandomTimedEndpoint = '/api/savesolorandomtimed';

export type SaveSoloRandomTimedRequest = {
  words: string;
  testTimeSeconds: number;
  charactersTypedCorrectly: number;
  charactersTypedIncorrectly: number;
  wordsTypedCorrectly: number;
  wordsTypedIncorrectly: number;
  replayData: SoloReplayData;
};

export function getValidSaveSoloRandomTimedRequest(body: unknown): SaveSoloRandomTimedRequest | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const { words, testTimeSeconds, charactersTypedCorrectly, charactersTypedIncorrectly, wordsTypedCorrectly, wordsTypedIncorrectly, replayData } = body as {
    words: unknown;
    testTimeSeconds: unknown;
    charactersTypedCorrectly: unknown;
    charactersTypedIncorrectly: unknown;
    wordsTypedCorrectly: unknown;
    wordsTypedIncorrectly: unknown;
    replayData: unknown;
  };
  if (
    typeof words !== 'string' ||
    typeof testTimeSeconds !== 'number' ||
    typeof charactersTypedCorrectly !== 'number' ||
    typeof charactersTypedIncorrectly !== 'number' ||
    typeof wordsTypedCorrectly !== 'number' ||
    typeof wordsTypedIncorrectly !== 'number'
  ) {
    return null;
  }
  const normalizedWords = normalizeWords(words);
  const normalizedTestTimeSeconds = normalizeTestTimeSeconds(testTimeSeconds);
  const normalizedCharactersTypedCorrectly = normalizeCharactersTypedCorrectly(charactersTypedCorrectly);
  const normalizedCharactersTypedIncorrectly = normalizeCharactersTypedIncorrectly(charactersTypedIncorrectly);
  const normalizedWordsTypedCorrectly = normalizeWordsTypedCorrectly(wordsTypedCorrectly);
  const normalizedWordsTypedIncorrectly = normalizeWordsTypedIncorrectly(wordsTypedIncorrectly);
  if (
    !isValidWords(normalizedWords) ||
    !isValidTestTimeSeconds(normalizedTestTimeSeconds) ||
    !isValidCharactersTypedCorrectly(normalizedCharactersTypedCorrectly) ||
    !isValidCharactersTypedIncorrectly(normalizedCharactersTypedIncorrectly) ||
    !isValidWordsTypedCorrectly(normalizedWordsTypedCorrectly) ||
    !isValidWordsTypedIncorrectly(normalizedWordsTypedIncorrectly) ||
    !isValidSoloReplayData(replayData)
  ) {
    return null;
  }
  return {
    words: normalizedWords,
    testTimeSeconds: normalizedTestTimeSeconds,
    charactersTypedCorrectly: normalizedCharactersTypedCorrectly,
    charactersTypedIncorrectly: normalizedCharactersTypedIncorrectly,
    wordsTypedCorrectly: normalizedWordsTypedCorrectly,
    wordsTypedIncorrectly: normalizedWordsTypedIncorrectly,
    replayData,
  };
}

export const enum SaveSoloRandomTimedResponseType {
  Fail = 'fail',
  NotAuthorized = 'notAuthorized',
  Success = 'success',
}

export type SaveSoloRandomTimedResponse = { type: SaveSoloRandomTimedResponseType };

export function isValidSaveSoloRandomTimedResponseJson(responseJson: unknown): responseJson is SaveSoloRandomTimedResponse {
  if (typeof responseJson !== 'object' || responseJson === null) {
    return false;
  }
  const { type } = responseJson as { type: unknown };
  return (
    type === SaveSoloRandomTimedResponseType.Fail || type === SaveSoloRandomTimedResponseType.NotAuthorized || type === SaveSoloRandomTimedResponseType.Success
  );
}
