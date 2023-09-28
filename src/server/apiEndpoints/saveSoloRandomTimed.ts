import { useAuthentication } from '../authentication.js';
import { pool } from '../db.js';
import { SaveSoloRandomTimedResponse, SaveSoloRandomTimedResponseType, getValidSaveSoloRandomTimedRequest } from './saveSoloRandomTimedIo.js';

async function getSaveSoloRandomTimedResponse(req: import('express').Request): Promise<SaveSoloRandomTimedResponse> {
  const requestData = getValidSaveSoloRandomTimedRequest(req.body);
  if (requestData === null) {
    return { type: SaveSoloRandomTimedResponseType.Fail };
  }
  const { words, testTimeSeconds, charactersTypedCorrectly, charactersTypedIncorrectly, wordsTypedCorrectly, wordsTypedIncorrectly, replayData } = requestData;
  const authenticationDetails = await useAuthentication(req);
  if (authenticationDetails === null) {
    return { type: SaveSoloRandomTimedResponseType.NotAuthorized };
  }
  const { userId } = authenticationDetails;
  const id = crypto.randomUUID();
  await pool.query(
    'insert into typing_tests_solo_random_timed (id, user_id, words, test_time_seconds, characters_typed_correctly, characters_typed_incorrectly, words_typed_correctly, words_typed_incorrectly, replay_data, created_at) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
    [
      id,
      userId,
      words,
      testTimeSeconds,
      charactersTypedCorrectly,
      charactersTypedIncorrectly,
      wordsTypedCorrectly,
      wordsTypedIncorrectly,
      replayData,
      new Date(),
    ],
  );
  return { type: SaveSoloRandomTimedResponseType.Success };
}

export function handleSaveSoloRandomTimed(req: import('express').Request, res: import('express').Response): void {
  void getSaveSoloRandomTimedResponse(req)
    .catch((): SaveSoloRandomTimedResponse => ({ type: SaveSoloRandomTimedResponseType.Fail }))
    .then((responseJson) => {
      res.status(200).send(responseJson);
    });
}
