import { SoloReplayData, isValidSoloReplayData } from '../replayData.js';
import {
  isValidCharactersTypedCorrectly,
  isValidCharactersTypedIncorrectly,
  isValidQuoteId,
  isValidSecondsTaken,
  isValidWordsTypedCorrectly,
  isValidWordsTypedIncorrectly,
  normalizeCharactersTypedCorrectly,
  normalizeCharactersTypedIncorrectly,
  normalizeQuoteId,
  normalizeSecondsTaken,
  normalizeWordsTypedCorrectly,
  normalizeWordsTypedIncorrectly,
} from '../verification.js';

export const saveSoloQuoteEndpoint = '/api/savesoloquote';

export type SaveSoloQuoteRequest = {
  quoteId: string;
  secondsTaken: number;
  charactersTypedCorrectly: number;
  charactersTypedIncorrectly: number;
  wordsTypedCorrectly: number;
  wordsTypedIncorrectly: number;
  replayData: SoloReplayData;
};

export function getValidSaveSoloQuoteRequest(body: unknown): SaveSoloQuoteRequest | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const { quoteId, secondsTaken, charactersTypedCorrectly, charactersTypedIncorrectly, wordsTypedCorrectly, wordsTypedIncorrectly, replayData } = body as {
    quoteId: unknown;
    secondsTaken: unknown;
    charactersTypedCorrectly: unknown;
    charactersTypedIncorrectly: unknown;
    wordsTypedCorrectly: unknown;
    wordsTypedIncorrectly: unknown;
    replayData: unknown;
  };
  if (
    typeof quoteId !== 'string' ||
    typeof secondsTaken !== 'number' ||
    typeof charactersTypedCorrectly !== 'number' ||
    typeof charactersTypedIncorrectly !== 'number' ||
    typeof wordsTypedCorrectly !== 'number' ||
    typeof wordsTypedIncorrectly !== 'number'
  ) {
    return null;
  }
  const normalizedQuoteId = normalizeQuoteId(quoteId);
  const normalizedSecondsTaken = normalizeSecondsTaken(secondsTaken);
  const normalizedCharactersTypedCorrectly = normalizeCharactersTypedCorrectly(charactersTypedCorrectly);
  const normalizedCharactersTypedIncorrectly = normalizeCharactersTypedIncorrectly(charactersTypedIncorrectly);
  const normalizedWordsTypedCorrectly = normalizeWordsTypedCorrectly(wordsTypedCorrectly);
  const normalizedWordsTypedIncorrectly = normalizeWordsTypedIncorrectly(wordsTypedIncorrectly);
  if (
    !isValidQuoteId(normalizedQuoteId) ||
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
    quoteId: normalizedQuoteId,
    secondsTaken: normalizedSecondsTaken,
    charactersTypedCorrectly: normalizedCharactersTypedCorrectly,
    charactersTypedIncorrectly: normalizedCharactersTypedIncorrectly,
    wordsTypedCorrectly: normalizedWordsTypedCorrectly,
    wordsTypedIncorrectly: normalizedWordsTypedIncorrectly,
    replayData,
  };
}

export const enum SaveSoloQuoteResponseType {
  Fail = 'fail',
  NotAuthorized = 'notAuthorized',
  Success = 'success',
}

export type SaveSoloQuoteResponse = { type: SaveSoloQuoteResponseType };

export function isValidSaveSoloQuoteResponseJson(responseJson: unknown): responseJson is SaveSoloQuoteResponse {
  if (typeof responseJson !== 'object' || responseJson === null) {
    return false;
  }
  const { type } = responseJson as { type: unknown };
  return type === SaveSoloQuoteResponseType.Fail || type === SaveSoloQuoteResponseType.NotAuthorized || type === SaveSoloQuoteResponseType.Success;
}
