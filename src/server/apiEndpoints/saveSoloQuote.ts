import { useAuthentication } from '../authentication.js';
import { pool } from '../db.js';
import { SaveSoloQuoteResponse, SaveSoloQuoteResponseType, getValidSaveSoloQuoteRequest } from './saveSoloQuoteIo.js';

async function getSaveSoloQuoteResponse(req: import('express').Request): Promise<SaveSoloQuoteResponse> {
  const requestData = getValidSaveSoloQuoteRequest(req.body);
  if (requestData === null) {
    return { type: SaveSoloQuoteResponseType.Fail };
  }
  const { quoteId, secondsTaken, charactersTypedCorrectly, charactersTypedIncorrectly, wordsTypedCorrectly, wordsTypedIncorrectly, replayData } = requestData;
  const authenticationDetails = await useAuthentication(req);
  if (authenticationDetails === null) {
    return { type: SaveSoloQuoteResponseType.NotAuthorized };
  }
  const { userId } = authenticationDetails;
  const id = crypto.randomUUID();
  await pool.query(
    'insert into typing_tests_solo_quote (id, user_id, quote_id, seconds_taken, characters_typed_correctly, characters_typed_incorrectly, words_typed_correctly, words_typed_incorrectly, replay_data, created_at) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
    [
      id,
      userId,
      quoteId,
      secondsTaken,
      charactersTypedCorrectly,
      charactersTypedIncorrectly,
      wordsTypedCorrectly,
      wordsTypedIncorrectly,
      replayData,
      new Date(),
    ],
  );
  return { type: SaveSoloQuoteResponseType.Success };
}

export function handleSaveSoloQuote(req: import('express').Request, res: import('express').Response): void {
  void getSaveSoloQuoteResponse(req)
    .catch((): SaveSoloQuoteResponse => ({ type: SaveSoloQuoteResponseType.Fail }))
    .then((responseJson) => {
      res.status(200).send(responseJson);
    });
}
