import { TypingTestType } from '../../persistedState/testConfigTypes.js';
import { useAuthentication } from '../authentication.js';
import { pool } from '../db.js';
import { isValidSoloReplayData } from '../replayData.js';
import {
  isValidCharactersTypedCorrectly,
  isValidCharactersTypedIncorrectly,
  isValidQuoteId,
  isValidSecondsTaken,
  isValidTestTimeSeconds,
  isValidTestWordLimit,
  isValidWords,
  isValidWordsTypedCorrectly,
  isValidWordsTypedIncorrectly,
} from '../verification.js';
import {
  GetPastTestsCursorDirection,
  GetPastTestsResponse,
  GetPastTestsResponseTest,
  GetPastTestsResponseType,
  getValidGetPastTestsRequest,
} from './getPastTestsIo.js';

const numResults = 30;
const maxFilters = 5;

async function getGetPastTestsResponse(req: import('express').Request): Promise<GetPastTestsResponse> {
  const requestData = getValidGetPastTestsRequest(req.body);
  if (requestData === null) {
    return { type: GetPastTestsResponseType.Fail };
  }
  const { cursor, inclusiveFilters } = requestData;
  const authenticationDetails = await useAuthentication(req);
  if (authenticationDetails === null) {
    return { type: GetPastTestsResponseType.NotAuthorized };
  }
  const { userId } = authenticationDetails;
  let timeLimitFilter: Set<number> | true | null = null;
  let wordLimitFilter: Set<number> | true | null = null;
  let quoteIdFilter: Set<string> | true | null = null;
  for (let i = 0; i < inclusiveFilters.length; i++) {
    const inclusiveFilter = inclusiveFilters[i];
    switch (inclusiveFilter.type) {
      case TypingTestType.Timed: {
        if (timeLimitFilter === true) {
          break;
        }
        const { timeLimit } = inclusiveFilter;
        if (timeLimit === null) {
          timeLimitFilter = true;
          break;
        }
        if (timeLimitFilter === null) {
          timeLimitFilter = new Set();
        }
        timeLimitFilter.add(timeLimit);
        break;
      }
      case TypingTestType.WordLimit: {
        if (wordLimitFilter === true) {
          break;
        }
        const { wordLimit } = inclusiveFilter;
        if (wordLimit === null) {
          wordLimitFilter = true;
          break;
        }
        if (wordLimitFilter === null) {
          wordLimitFilter = new Set();
        }
        wordLimitFilter.add(wordLimit);
        break;
      }
      case TypingTestType.Quote: {
        if (quoteIdFilter === true) {
          break;
        }
        const { quoteId } = inclusiveFilter;
        if (quoteId === null) {
          quoteIdFilter = true;
          break;
        }
        if (quoteIdFilter === null) {
          quoteIdFilter = new Set();
        }
        quoteIdFilter.add(quoteId);
        break;
      }
    }
  }
  if (timeLimitFilter === null && wordLimitFilter === null && quoteIdFilter === null) {
    return { type: GetPastTestsResponseType.Success, tests: [], hasMore: false };
  }
  const filterCount =
    (timeLimitFilter === null ? 0 : timeLimitFilter === true ? 1 : timeLimitFilter.size) +
    (wordLimitFilter === null ? 0 : wordLimitFilter === true ? 1 : wordLimitFilter.size) +
    (quoteIdFilter === null ? 0 : quoteIdFilter === true ? 1 : quoteIdFilter.size);
  if (filterCount > maxFilters) {
    return { type: GetPastTestsResponseType.TooManyFilters };
  }
  const selects: string[] = [];
  const querySubstitutions: unknown[] = [];
  const makeQuerySubstitution = (value: unknown): string => {
    querySubstitutions.push(value);
    return `$${querySubstitutions.length}`;
  };
  const cursorQueryPart =
    cursor === null
      ? ''
      : ` and created_at ${cursor.direction === GetPastTestsCursorDirection.After ? '>' : '<'} ${makeQuerySubstitution(new Date(cursor.time))}`;
  const whereQueryPart = ` where user_id = ${makeQuerySubstitution(userId)}${cursorQueryPart}`;
  if (timeLimitFilter !== null) {
    // eslint-disable-next-line max-len
    let query = `select 0 as type, id, words as words_or_quote_id, null as test_word_limit_or_null, test_time_seconds::real as test_time_seconds_or_seconds_taken, characters_typed_correctly, characters_typed_incorrectly, words_typed_correctly, words_typed_incorrectly, replay_data, created_at from typing_tests_solo_random_timed${whereQueryPart}`;
    if (timeLimitFilter !== true) {
      query += ` and test_time_seconds in (${[...timeLimitFilter].map((timeLimit) => makeQuerySubstitution(timeLimit)).join(', ')})`;
    }
    selects.push(query);
  }
  if (wordLimitFilter !== null) {
    // eslint-disable-next-line max-len
    let query = `select 1 as type, id, words as words_or_quote_id, test_word_limit as test_word_limit_or_null, seconds_taken as test_time_seconds_or_seconds_taken, characters_typed_correctly, characters_typed_incorrectly, words_typed_correctly, words_typed_incorrectly, replay_data, created_at from typing_tests_solo_random_words${whereQueryPart}`;
    if (wordLimitFilter !== true) {
      query += ` and test_word_limit in (${[...wordLimitFilter].map((wordLimit) => makeQuerySubstitution(wordLimit)).join(', ')})`;
    }
    selects.push(query);
  }
  if (quoteIdFilter !== null) {
    // eslint-disable-next-line max-len
    let query = `select 2 as type, id, quote_id::text as words_or_quote_id, null as test_word_limit_or_null, seconds_taken as test_time_seconds_or_seconds_taken, characters_typed_correctly, characters_typed_incorrectly, words_typed_correctly, words_typed_incorrectly, replay_data, created_at from typing_tests_solo_quote${whereQueryPart}`;
    if (quoteIdFilter !== true) {
      query += ` and quote_id in (${[...quoteIdFilter].map((quoteId) => makeQuerySubstitution(quoteId)).join(', ')})`;
    }
    selects.push(query);
  }
  let query = selects.length === 1 ? selects[0] : selects.map((select) => `(${select})`).join(' union all ');
  query += ` order by created_at desc limit ${makeQuerySubstitution(numResults + 1)}`;
  const queryResult = await pool.query(query, querySubstitutions);
  const hasMore = queryResult.rowCount === numResults + 1;
  const tests: GetPastTestsResponseTest[] = [];
  const numRowsToIter = Math.min(queryResult.rows.length, numResults);
  for (let i = 0; i < numRowsToIter; i++) {
    const row: unknown = queryResult.rows[i];
    if (typeof row !== 'object' || row === null) {
      return { type: GetPastTestsResponseType.Fail };
    }
    const {
      type,
      id,
      words_or_quote_id,
      test_word_limit_or_null,
      test_time_seconds_or_seconds_taken,
      characters_typed_correctly,
      characters_typed_incorrectly,
      words_typed_correctly,
      words_typed_incorrectly,
      replay_data,
      created_at,
    } = row as {
      type: unknown;
      id: unknown;
      words_or_quote_id: unknown;
      test_word_limit_or_null: unknown;
      test_time_seconds_or_seconds_taken: unknown;
      characters_typed_correctly: unknown;
      characters_typed_incorrectly: unknown;
      words_typed_correctly: unknown;
      words_typed_incorrectly: unknown;
      replay_data: unknown;
      created_at: unknown;
    };
    if (
      (type !== 0 && type !== 1 && type !== 2) ||
      typeof id !== 'string' ||
      typeof words_or_quote_id !== 'string' ||
      (typeof test_word_limit_or_null !== 'number' && test_word_limit_or_null !== null) ||
      typeof test_time_seconds_or_seconds_taken !== 'number' ||
      typeof characters_typed_correctly !== 'number' ||
      !isValidCharactersTypedCorrectly(characters_typed_correctly) ||
      typeof characters_typed_incorrectly !== 'number' ||
      !isValidCharactersTypedIncorrectly(characters_typed_incorrectly) ||
      typeof words_typed_correctly !== 'number' ||
      !isValidWordsTypedCorrectly(words_typed_correctly) ||
      typeof words_typed_incorrectly !== 'number' ||
      !isValidWordsTypedIncorrectly(words_typed_incorrectly) ||
      !isValidSoloReplayData(replay_data) ||
      !(created_at instanceof Date)
    ) {
      return { type: GetPastTestsResponseType.Fail };
    }
    const createdAtNumber = created_at.getTime();
    switch (type) {
      case 0: {
        if (!isValidWords(words_or_quote_id) || test_word_limit_or_null !== null || !isValidTestTimeSeconds(test_time_seconds_or_seconds_taken)) {
          return { type: GetPastTestsResponseType.Fail };
        }
        tests.push({
          type: TypingTestType.Timed,
          id,
          words: words_or_quote_id,
          testTimeSeconds: test_time_seconds_or_seconds_taken,
          charactersTypedCorrectly: characters_typed_correctly,
          charactersTypedIncorrectly: characters_typed_incorrectly,
          wordsTypedCorrectly: words_typed_correctly,
          wordsTypedIncorrectly: words_typed_incorrectly,
          replayData: replay_data,
          createdAt: createdAtNumber,
        });
        break;
      }
      case 1: {
        if (
          !isValidWords(words_or_quote_id) ||
          test_word_limit_or_null === null ||
          !isValidTestWordLimit(test_word_limit_or_null) ||
          !isValidSecondsTaken(test_time_seconds_or_seconds_taken)
        ) {
          return { type: GetPastTestsResponseType.Fail };
        }
        tests.push({
          type: TypingTestType.WordLimit,
          id,
          words: words_or_quote_id,
          testWordLimit: test_word_limit_or_null,
          secondsTaken: test_time_seconds_or_seconds_taken,
          charactersTypedCorrectly: characters_typed_correctly,
          charactersTypedIncorrectly: characters_typed_incorrectly,
          wordsTypedCorrectly: words_typed_correctly,
          wordsTypedIncorrectly: words_typed_incorrectly,
          replayData: replay_data,
          createdAt: createdAtNumber,
        });
        break;
      }
      case 2: {
        if (!isValidQuoteId(words_or_quote_id) || test_word_limit_or_null !== null || !isValidSecondsTaken(test_time_seconds_or_seconds_taken)) {
          return { type: GetPastTestsResponseType.Fail };
        }
        tests.push({
          type: TypingTestType.Quote,
          id,
          quoteId: words_or_quote_id,
          secondsTaken: test_time_seconds_or_seconds_taken,
          charactersTypedCorrectly: characters_typed_correctly,
          charactersTypedIncorrectly: characters_typed_incorrectly,
          wordsTypedCorrectly: words_typed_correctly,
          wordsTypedIncorrectly: words_typed_incorrectly,
          replayData: replay_data,
          createdAt: createdAtNumber,
        });
        break;
      }
    }
  }
  return { type: GetPastTestsResponseType.Success, tests, hasMore };
}

export function handleGetPastTests(req: import('express').Request, res: import('express').Response): void {
  void getGetPastTestsResponse(req)
    .catch((): GetPastTestsResponse => ({ type: GetPastTestsResponseType.Fail }))
    .then((responseJson) => {
      res.status(200).send(responseJson);
    });
}
