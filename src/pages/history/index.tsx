import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { makeApiRequest } from '../../api.js';
import { Checkbox, CheckboxGroup, CheckboxState, FormErrorMessage, InfoButton } from '../../components/Form.js';
import { useAuthenticationGuard } from '../../hooks/useAuthenticationGuard.js';
import { useTitle } from '../../hooks/useTitle.js';
import { AuthenticatedUser, resetAuthenticatedUser } from '../../persistedState/authenticatedUser.js';
import { setTestConfig, testConfig$ } from '../../persistedState/testConfig.js';
import { TypingTestType, validTypingTestTimeLimits, validTypingTestWordLimits } from '../../persistedState/testConfigTypes.js';
import { quotes } from '../../quotes.js';
import { roundTo1Dp } from '../../rounding.js';
import { Route } from '../../routes.js';
import {
  GetPastTestsCursorDirection,
  GetPastTestsFilter,
  GetPastTestsRequest,
  GetPastTestsResponseTest,
  GetPastTestsResponseType,
  getPastTestsEndpoint,
  isValidGetPastTestsResponseJson,
} from '../../server/apiEndpoints/getPastTestsIo.js';
import { isValidQuoteId } from '../../server/verification.js';
import { calculateTestDataToShowToUser } from '../localType/calculateTestDataToShowToUser.js';
import { LocalTypeNavigationState, LocalTypeNavigationStateType } from '../localType/index.js';
import styles from './index.module.css';

const makeQueryKey = (
  selectedTestTypes: CheckboxState,
  selectedTimes: CheckboxState,
  selectedWordLimits: CheckboxState,
  isolatedQuoteId: string | null,
): string => {
  if (isolatedQuoteId !== null) {
    return JSON.stringify(isolatedQuoteId);
  }
  type QueryKeyJson = {
    timeLimit?: number[];
    wordLimit?: number[];
    quote?: true;
  };
  const queryKeyJson: QueryKeyJson = {};
  if (selectedTestTypes.has(TypingTestType.Timed) && validTypingTestTimeLimits.some((timeLimit) => selectedTimes.has(timeLimit))) {
    queryKeyJson.timeLimit = validTypingTestTimeLimits.filter((timeLimit) => selectedTimes.has(timeLimit));
  }
  if (selectedTestTypes.has(TypingTestType.WordLimit) && validTypingTestWordLimits.some((wordLimit) => selectedWordLimits.has(wordLimit))) {
    queryKeyJson.wordLimit = validTypingTestWordLimits.filter((wordLimit) => selectedWordLimits.has(wordLimit));
  }
  if (selectedTestTypes.has(TypingTestType.Quote)) {
    queryKeyJson.quote = true;
  }
  return JSON.stringify(queryKeyJson);
};

const getQueryFilters = (
  selectedTestTypes: CheckboxState,
  selectedTimes: CheckboxState,
  selectedWordLimits: CheckboxState,
  isolatedQuoteId: string | null,
): GetPastTestsFilter[] => {
  if (isolatedQuoteId !== null) {
    return [
      {
        type: TypingTestType.Quote,
        quoteId: isolatedQuoteId,
      },
    ];
  }
  const filters: GetPastTestsFilter[] = [];
  if (selectedTestTypes.has(TypingTestType.Timed)) {
    if (validTypingTestTimeLimits.every((timeLimit) => selectedTimes.has(timeLimit))) {
      filters.push({
        type: TypingTestType.Timed,
        timeLimit: null,
      });
    } else {
      validTypingTestTimeLimits.forEach((timeLimit) => {
        if (selectedTimes.has(timeLimit)) {
          filters.push({
            type: TypingTestType.Timed,
            timeLimit,
          });
        }
      });
    }
  }
  if (selectedTestTypes.has(TypingTestType.WordLimit)) {
    if (validTypingTestWordLimits.every((wordLimit) => selectedWordLimits.has(wordLimit))) {
      filters.push({
        type: TypingTestType.WordLimit,
        wordLimit: null,
      });
    } else {
      validTypingTestWordLimits.forEach((wordLimit) => {
        if (selectedWordLimits.has(wordLimit)) {
          filters.push({
            type: TypingTestType.WordLimit,
            wordLimit,
          });
        }
      });
    }
  }
  if (selectedTestTypes.has(TypingTestType.Quote)) {
    filters.push({
      type: TypingTestType.Quote,
      quoteId: null,
    });
  }
  return filters;
};

const dateFormat = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

// https://stackoverflow.com/questions/7641791/javascript-library-for-human-friendly-relative-date-formatting
function prettyDate(time: number): string | null {
  const diff = (new Date().getTime() - time) / 1000;
  const day_diff = Math.floor(diff / 86400);
  if (isNaN(day_diff) || day_diff < 0) {
    return null;
  }
  /* eslint-disable @typescript-eslint/no-unnecessary-condition */
  return (
    (day_diff === 0 &&
      ((diff < 60 && 'just now') ||
        (diff < 120 && '1 minute ago') ||
        (diff < 3600 && Math.floor(diff / 60) + ' minutes ago') ||
        (diff < 7200 && '1 hour ago') ||
        (diff < 86400 && Math.floor(diff / 3600) + ' hours ago'))) ||
    (day_diff === 1 && 'Yesterday') ||
    (day_diff < 7 && day_diff + ' days ago') ||
    (day_diff < 31 && Math.ceil(day_diff / 7) + ' weeks ago') ||
    dateFormat.format(new Date(time))
  );
  /* eslint-enable @typescript-eslint/no-unnecessary-condition */
}

const enum LoadMoreStateType {
  AllLoaded,
  CanLoadMore,
  TryingLoadingMore,
  TriedLoadingMoreAndError,
}

type LoadedResults = {
  tests: GetPastTestsResponseTest[];
  loadMoreState: { type: LoadMoreStateType; cursor: number | null };
};

export function HistoryPageContent(props: { authenticatedUser: AuthenticatedUser }): JSX.Element | null {
  const location = useLocation();
  const locationState: unknown = location.state;
  const initialIsolatedQuoteId = typeof locationState === 'string' && isValidQuoteId(locationState) ? locationState : null;
  const { authenticatedUser } = props;
  const { token } = authenticatedUser;
  const [selectedTestTypes, setSelectedTestTypes] = useState<CheckboxState>(new Set([TypingTestType.Timed, TypingTestType.WordLimit, TypingTestType.Quote]));
  const [selectedTimes, setSelectedTimes] = useState<CheckboxState>(new Set(validTypingTestTimeLimits));
  const [selectedWordLimits, setSelectedWordLimits] = useState<CheckboxState>(new Set(validTypingTestWordLimits));
  const [isolatedQuoteId, setIsolatedQuoteId] = useState<string | null>(initialIsolatedQuoteId);
  const [loadedResults, setLoadedResults] = useState<LoadedResults>({ tests: [], loadMoreState: { type: LoadMoreStateType.TryingLoadingMore, cursor: null } });
  const [forceQueryIndex, setForceQueryIndex] = useState<number>(0);
  const navigate = useNavigate();
  const queryKey = makeQueryKey(selectedTestTypes, selectedTimes, selectedWordLimits, isolatedQuoteId);
  const queryCache = useRef(new Map<string, LoadedResults>());
  const resetQuery = (): void => {
    setLoadedResults({ tests: [], loadMoreState: { type: LoadMoreStateType.TryingLoadingMore, cursor: null } });
  };
  const refreshCache = (): void => {
    queryCache.current.clear();
    resetQuery();
    setForceQueryIndex((i) => i + 1);
  };
  const loadMore = (): void => {
    setLoadedResults({
      tests: loadedResults.tests,
      loadMoreState: { type: LoadMoreStateType.TryingLoadingMore, cursor: loadedResults.tests[loadedResults.tests.length - 1].createdAt },
    });
  };
  // Alternatively we can use useLayoutEffect instead of useEffect below but this avoids an unnecessary second reconciliation.
  const presetCachedResultToAvoidFlicker = (
    newSelectedTestTypes: CheckboxState,
    newSelectedTimes: CheckboxState,
    newSelectedWordLimits: CheckboxState,
    newIsolatedQuoteId: string | null,
  ): void => {
    const newQueryKey = makeQueryKey(newSelectedTestTypes, newSelectedTimes, newSelectedWordLimits, newIsolatedQuoteId);
    if (newQueryKey === queryKey) {
      return;
    }
    const cachedLoadedResults = queryCache.current.get(newQueryKey);
    if (cachedLoadedResults !== undefined && cachedLoadedResults.loadMoreState.cursor === loadedResults.loadMoreState.cursor) {
      setLoadedResults(cachedLoadedResults);
      return;
    }
  };
  useEffect(() => {
    if (loadedResults.loadMoreState.type !== LoadMoreStateType.TryingLoadingMore) {
      return;
    }
    const cachedLoadedResults = queryCache.current.get(queryKey);
    if (cachedLoadedResults !== undefined && cachedLoadedResults.loadMoreState.cursor === loadedResults.loadMoreState.cursor) {
      setLoadedResults(cachedLoadedResults);
      return;
    }
    const bodyJson: GetPastTestsRequest = {
      cursor: loadedResults.loadMoreState.cursor === null ? null : { direction: GetPastTestsCursorDirection.Before, time: loadedResults.loadMoreState.cursor },
      inclusiveFilters: getQueryFilters(selectedTestTypes, selectedTimes, selectedWordLimits, isolatedQuoteId),
    };
    const onError = (): void => {
      const newLoadedResults: LoadedResults = {
        tests: loadedResults.tests,
        loadMoreState: { type: LoadMoreStateType.TriedLoadingMoreAndError, cursor: loadedResults.loadMoreState.cursor },
      };
      setLoadedResults(newLoadedResults);
    };
    const subscription = makeApiRequest(getPastTestsEndpoint, {
      isValidResponseJson: isValidGetPastTestsResponseJson,
      body: JSON.stringify(bodyJson),
      token,
    }).subscribe({
      next(responseJson) {
        switch (responseJson.type) {
          case GetPastTestsResponseType.Fail: {
            onError();
            break;
          }
          case GetPastTestsResponseType.NotAuthorized: {
            resetAuthenticatedUser();
            break;
          }
          case GetPastTestsResponseType.TooManyFilters: {
            onError();
            break;
          }
          case GetPastTestsResponseType.Success: {
            const { tests, hasMore } = responseJson;
            const newTests = loadedResults.tests.concat(tests);
            const newLoadedResults: LoadedResults = {
              tests: newTests,
              loadMoreState: { type: hasMore ? LoadMoreStateType.CanLoadMore : LoadMoreStateType.AllLoaded, cursor: loadedResults.loadMoreState.cursor },
            };
            queryCache.current.set(queryKey, newLoadedResults);
            setLoadedResults(newLoadedResults);
            break;
          }
        }
      },
      error(_error) {
        onError();
      },
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [queryKey, loadedResults.loadMoreState.cursor, forceQueryIndex]);
  return (
    <div className={styles.container}>
      <p className={styles.filter__title}>
        Filters
        <InfoButton isInline onClick={refreshCache}>
          Refresh
        </InfoButton>
      </p>
      {isolatedQuoteId === null ? (
        <div className={styles.filter}>
          <CheckboxGroup
            label="Test Type"
            value={selectedTestTypes}
            onChange={(value) => {
              resetQuery();
              setSelectedTestTypes(value);
              presetCachedResultToAvoidFlicker(value, selectedTimes, selectedWordLimits, isolatedQuoteId);
            }}
          >
            <Checkbox value={TypingTestType.Timed}>Timed</Checkbox>
            <Checkbox value={TypingTestType.WordLimit}>Word Limit</Checkbox>
            <Checkbox value={TypingTestType.Quote}>Quote</Checkbox>
          </CheckboxGroup>
          {selectedTestTypes.has(TypingTestType.Timed) && (
            <CheckboxGroup
              label="Times"
              value={selectedTimes}
              onChange={(value) => {
                resetQuery();
                setSelectedTimes(value);
                presetCachedResultToAvoidFlicker(selectedTestTypes, value, selectedWordLimits, isolatedQuoteId);
              }}
            >
              {validTypingTestTimeLimits.map((timeLimit) => (
                <Checkbox value={timeLimit} key={timeLimit}>
                  {timeLimit}s
                </Checkbox>
              ))}
            </CheckboxGroup>
          )}
          {selectedTestTypes.has(TypingTestType.WordLimit) && (
            <CheckboxGroup
              label="Words"
              value={selectedWordLimits}
              onChange={(value) => {
                resetQuery();
                setSelectedWordLimits(value);
                presetCachedResultToAvoidFlicker(selectedTestTypes, selectedTimes, value, isolatedQuoteId);
              }}
            >
              {validTypingTestWordLimits.map((wordLimit) => (
                <Checkbox value={wordLimit} key={wordLimit}>
                  {wordLimit}
                </Checkbox>
              ))}
            </CheckboxGroup>
          )}
        </div>
      ) : (
        <div className={styles['isolated-quote']}>
          <span className={styles['isolated-quote__label']}>Quote</span> {isolatedQuoteId.slice(0, 8)}
          <InfoButton
            isInline
            onClick={() => {
              resetQuery();
              setIsolatedQuoteId(null);
              presetCachedResultToAvoidFlicker(selectedTestTypes, selectedTimes, selectedWordLimits, null);
            }}
          >
            Clear
          </InfoButton>
        </div>
      )}
      <div className={styles.result}>
        {loadedResults.tests.length === 0 &&
          loadedResults.loadMoreState.cursor === null &&
          loadedResults.loadMoreState.type === LoadMoreStateType.TryingLoadingMore &&
          'Loading...'}
        {loadedResults.tests.map((test) => {
          const { type, id, charactersTypedCorrectly, charactersTypedIncorrectly, wordsTypedCorrectly, wordsTypedIncorrectly, createdAt, replayData } = test;
          let testTypeLabel: string;
          let wordsPreview: string;
          let testSecondsTaken: number;
          const wordsPreviewLength = 200;
          switch (type) {
            case TypingTestType.Timed: {
              const { words, testTimeSeconds } = test;
              testTypeLabel = `Timed ${testTimeSeconds}s`;
              wordsPreview = words;
              testSecondsTaken = testTimeSeconds;
              break;
            }
            case TypingTestType.WordLimit: {
              const { words, testWordLimit, secondsTaken } = test;
              testTypeLabel = `Words ${testWordLimit}`;
              wordsPreview = words;
              testSecondsTaken = secondsTaken;
              break;
            }
            case TypingTestType.Quote: {
              const { quoteId, secondsTaken } = test;
              testTypeLabel = `Quote`;
              const quote = quotes.find((quote) => quote.id === quoteId);
              if (quote === undefined) {
                throw new Error(`Quote with id ${quoteId} doesn't exist.`); // I can handle this but cbb.
              } else {
                wordsPreview = quote.text;
              }
              testSecondsTaken = secondsTaken;
              break;
            }
          }
          const { wpm, totalWords } = calculateTestDataToShowToUser({
            charactersTypedCorrectly,
            charactersTypedIncorrectly,
            wordsTypedCorrectly,
            wordsTypedIncorrectly,
            secondsTaken: testSecondsTaken,
          });
          const relativeDate = prettyDate(createdAt);
          const preview = wordsPreview.length > wordsPreviewLength ? `${wordsPreview.slice(0, wordsPreviewLength)}...` : wordsPreview;
          return (
            <div className={styles['result-item']} key={id}>
              <div className={styles['result-item__top-info']}>
                <div className={styles['result-item__top-info-left']}>
                  <div>{testTypeLabel}</div>
                  <div>{wpm}wpm</div>
                  {type !== TypingTestType.WordLimit && <div>{totalWords} words</div>}
                  {type !== TypingTestType.Timed && <div>{roundTo1Dp(testSecondsTaken)}s</div>}
                  {type === TypingTestType.Quote && (
                    <>
                      {isolatedQuoteId !== test.quoteId && (
                        <button
                          className={styles['result-item__button']}
                          onClick={() => {
                            resetQuery();
                            setIsolatedQuoteId(test.quoteId);
                            presetCachedResultToAvoidFlicker(selectedTestTypes, selectedTimes, selectedWordLimits, test.quoteId);
                          }}
                        >
                          See History
                        </button>
                      )}
                      <button
                        className={styles['result-item__button']}
                        onClick={() => {
                          setTestConfig({ ...testConfig$.value, type: TypingTestType.Quote });
                          const navigationState: LocalTypeNavigationState = {
                            type: LocalTypeNavigationStateType.PlayQuote,
                            quoteId: test.quoteId,
                          };
                          navigate(Route.LocalType, {
                            state: navigationState,
                          });
                        }}
                      >
                        Type Quote
                      </button>
                    </>
                  )}
                </div>
                <div>{relativeDate}</div>
              </div>
              <div className={styles['result-item__preview']}>
                <div className={styles['result-item__preview-excerpt']}>{preview}</div>
                <InfoButton
                  isInline
                  onClick={() => {
                    let words: string[];
                    let quoteId: string | undefined;
                    if (type === TypingTestType.Quote) {
                      quoteId = test.quoteId;
                      const quote = quotes.find((quote) => quote.id === quoteId);
                      if (quote === undefined) {
                        throw new Error(`No quote with id ${quoteId} exists.`);
                      }
                      words = quote.text.split(/\s+/g);
                    } else {
                      words = test.words.split(/\s+/g);
                    }
                    switch (type) {
                      case TypingTestType.Timed: {
                        setTestConfig({
                          type: TypingTestType.Timed,
                          timeLimit: test.testTimeSeconds,
                          wordLimit: testConfig$.value.wordLimit,
                        });
                        break;
                      }
                      case TypingTestType.WordLimit: {
                        setTestConfig({
                          type: TypingTestType.WordLimit,
                          timeLimit: testConfig$.value.timeLimit,
                          wordLimit: test.testWordLimit,
                        });
                        break;
                      }
                      case TypingTestType.Quote: {
                        setTestConfig({
                          ...testConfig$.value,
                          type: TypingTestType.Quote,
                        });
                        break;
                      }
                    }
                    const navigationState: LocalTypeNavigationState = {
                      type: LocalTypeNavigationStateType.TimeTravel,
                      words,
                      quoteId,
                      charactersTypedCorrectly,
                      charactersTypedIncorrectly,
                      wordsTypedCorrectly,
                      wordsTypedIncorrectly,
                      secondsTaken: type === TypingTestType.Timed ? test.testTimeSeconds : test.secondsTaken,
                      replayData,
                    };
                    navigate(Route.LocalType, {
                      state: navigationState,
                    });
                  }}
                >
                  Time Travel
                </InfoButton>
              </div>
            </div>
          );
        })}
        {loadedResults.tests.length > 0 &&
          (loadedResults.loadMoreState.type === LoadMoreStateType.CanLoadMore || loadedResults.loadMoreState.type === LoadMoreStateType.TryingLoadingMore) && (
            <InfoButton
              className={styles['load-more-button']}
              onClick={loadMore}
              disabled={loadedResults.loadMoreState.type === LoadMoreStateType.TryingLoadingMore}
            >
              Load More
            </InfoButton>
          )}
        {loadedResults.loadMoreState.type === LoadMoreStateType.TriedLoadingMoreAndError && <FormErrorMessage>Error loading more...</FormErrorMessage>}
      </div>
    </div>
  );
}

export function HistoryPage(): JSX.Element | null {
  useTitle('History');
  const authenticatedUser = useAuthenticationGuard();
  if (authenticatedUser === null) {
    return null;
  }
  return <HistoryPageContent authenticatedUser={authenticatedUser} />;
}
