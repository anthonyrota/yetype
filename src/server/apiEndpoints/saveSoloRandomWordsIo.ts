import { SoloReplayData, isValidSoloReplayData } from '../replayData.js';
import {
  isValidCharactersTypedCorrectly,
  isValidCharactersTypedIncorrectly,
  isValidSecondsTaken,
  isValidTestWordLimit,
  isValidWords,
  isValidWordsTypedCorrectly,
  isValidWordsTypedIncorrectly,
  normalizeCharactersTypedCorrectly,
  normalizeCharactersTypedIncorrectly,
  normalizeSecondsTaken,
  normalizeTestWordLimit,
  normalizeWords,
  normalizeWordsTypedCorrectly,
  normalizeWordsTypedIncorrectly,
} from '../verification.js';

export const saveSoloRandomWordsEndpoint = '/api/savesolowords';

export type SaveSoloRandomWordsRequest = {
  words: string;
  testWordLimit: number;
  secondsTaken: number;
  charactersTypedCorrectly: number;
  charactersTypedIncorrectly: number;
  wordsTypedCorrectly: number;
  wordsTypedIncorrectly: number;
  replayData: SoloReplayData;
};

export function getValidSaveSoloRandomWordsRequest(body: unknown): SaveSoloRandomWordsRequest | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const { words, testWordLimit, secondsTaken, charactersTypedCorrectly, charactersTypedIncorrectly, wordsTypedCorrectly, wordsTypedIncorrectly, replayData } =
    body as {
      words: unknown;
      testWordLimit: unknown;
      secondsTaken: unknown;
      charactersTypedCorrectly: unknown;
      charactersTypedIncorrectly: unknown;
      wordsTypedCorrectly: unknown;
      wordsTypedIncorrectly: unknown;
      replayData: unknown;
    };
  if (
    typeof words !== 'string' ||
    typeof testWordLimit !== 'number' ||
    typeof secondsTaken !== 'number' ||
    typeof charactersTypedCorrectly !== 'number' ||
    typeof charactersTypedIncorrectly !== 'number' ||
    typeof wordsTypedCorrectly !== 'number' ||
    typeof wordsTypedIncorrectly !== 'number'
  ) {
    return null;
  }
  const normalizedWords = normalizeWords(words);
  const normalizedTestWordLimit = normalizeTestWordLimit(testWordLimit);
  const normalizedSecondsTaken = normalizeSecondsTaken(secondsTaken);
  const normalizedCharactersTypedCorrectly = normalizeCharactersTypedCorrectly(charactersTypedCorrectly);
  const normalizedCharactersTypedIncorrectly = normalizeCharactersTypedIncorrectly(charactersTypedIncorrectly);
  const normalizedWordsTypedCorrectly = normalizeWordsTypedCorrectly(wordsTypedCorrectly);
  const normalizedWordsTypedIncorrectly = normalizeWordsTypedIncorrectly(wordsTypedIncorrectly);
  if (
    !isValidWords(normalizedWords) ||
    !isValidTestWordLimit(normalizedTestWordLimit) ||
    !isValidSecondsTaken(normalizedSecondsTaken) ||
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
    testWordLimit: normalizedTestWordLimit,
    secondsTaken: normalizedSecondsTaken,
    charactersTypedCorrectly: normalizedCharactersTypedCorrectly,
    charactersTypedIncorrectly: normalizedCharactersTypedIncorrectly,
    wordsTypedCorrectly: normalizedWordsTypedCorrectly,
    wordsTypedIncorrectly: normalizedWordsTypedIncorrectly,
    replayData,
  };
}

export const enum SaveSoloRandomWordsResponseType {
  Fail = 'fail',
  NotAuthorized = 'notAuthorized',
  Success = 'success',
}

export type SaveSoloRandomWordsResponse = { type: SaveSoloRandomWordsResponseType };

export function isValidSaveSoloRandomWordsResponseJson(responseJson: unknown): responseJson is SaveSoloRandomWordsResponse {
  if (typeof responseJson !== 'object' || responseJson === null) {
    return false;
  }
  const { type } = responseJson as { type: unknown };
  return (
    type === SaveSoloRandomWordsResponseType.Fail || type === SaveSoloRandomWordsResponseType.NotAuthorized || type === SaveSoloRandomWordsResponseType.Success
  );
}
