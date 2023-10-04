import { roundTo2Dp } from '../../rounding.js';

export function calculateTestDataToShowToUser(data: {
  charactersTypedCorrectly: number;
  charactersTypedIncorrectly: number;
  wordsTypedCorrectly: number;
  wordsTypedIncorrectly: number;
  secondsTaken: number;
}): { wpm: number; totalCharacters: number; totalWords: number; accuracy: string } {
  const { charactersTypedCorrectly, secondsTaken, charactersTypedIncorrectly, wordsTypedIncorrectly, wordsTypedCorrectly } = data;
  const wpm = Math.floor((charactersTypedCorrectly * 12) / secondsTaken);
  const totalCharacters = charactersTypedIncorrectly + charactersTypedCorrectly;
  const totalWords = wordsTypedIncorrectly + wordsTypedCorrectly;
  const accuracy = roundTo2Dp((charactersTypedCorrectly / totalCharacters) * 100);
  return {
    wpm,
    totalCharacters,
    totalWords,
    accuracy,
  };
}
