import { useAuthentication } from '../authentication.js';
import { pool } from '../db.js';
import { SaveSoloRandomWordsResponse, SaveSoloRandomWordsResponseType, getValidSaveSoloRandomWordsRequest } from './saveSoloRandomWordsIo.js';

async function getSaveSoloRandomWordsResponse(req: import('express').Request): Promise<SaveSoloRandomWordsResponse> {
  const requestData = getValidSaveSoloRandomWordsRequest(req.body);
  if (requestData === null) {
    return { type: SaveSoloRandomWordsResponseType.Fail };
  }
  const { words, testWordLimit, secondsTaken, charactersTypedCorrectly, charactersTypedIncorrectly, wordsTypedCorrectly, wordsTypedIncorrectly, replayData } =
    requestData;
  const authenticationDetails = await useAuthentication(req);
  if (authenticationDetails === null) {
    return { type: SaveSoloRandomWordsResponseType.NotAuthorized };
  }
  const { userId } = authenticationDetails;
  const id = crypto.randomUUID();
  await pool.query(
    'insert into typing_tests_solo_random_words (id, user_id, words, test_word_limit, seconds_taken, characters_typed_correctly, characters_typed_incorrectly, words_typed_correctly, words_typed_incorrectly, replay_data, created_at) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
    [
      id,
      userId,
      words,
      testWordLimit,
      secondsTaken,
      charactersTypedCorrectly,
      charactersTypedIncorrectly,
      wordsTypedCorrectly,
      wordsTypedIncorrectly,
      JSON.stringify(replayData),
      new Date(),
    ],
  );
  return { type: SaveSoloRandomWordsResponseType.Success };
}

export function handleSaveSoloRandomWords(req: import('express').Request, res: import('express').Response): void {
  void getSaveSoloRandomWordsResponse(req)
    .catch((): SaveSoloRandomWordsResponse => ({ type: SaveSoloRandomWordsResponseType.Fail }))
    .then((responseJson) => {
      res.status(200).send(responseJson);
    });
}
