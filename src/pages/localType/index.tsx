import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Observable, skip } from 'rxjs';
import { makeApiRequest } from '../../api.js';
import { commonWords } from '../../commonWords.js';
import { InfoButton } from '../../components/Form.js';
import { useIsLoggedIn } from '../../hooks/useIsLoggedIn.js';
import { useObservable } from '../../hooks/useObservable.js';
import { useTitle } from '../../hooks/useTitle.js';
import { resetAuthenticatedUser, userAuthenticationStatus$ } from '../../persistedState/authenticatedUser.js';
import { testConfig$ } from '../../persistedState/testConfig.js';
import { TestConfig, TypingTestType } from '../../persistedState/testConfigTypes.js';
import { Quote, quotes } from '../../quotes.js';
import { roundTo1Dp } from '../../rounding.js';
import { Route } from '../../routes.js';
import {
  SaveSoloQuoteRequest,
  SaveSoloQuoteResponse,
  isValidSaveSoloQuoteResponseJson,
  saveSoloQuoteEndpoint,
} from '../../server/apiEndpoints/saveSoloQuoteIo.js';
import {
  SaveSoloRandomTimedRequest,
  SaveSoloRandomTimedResponse,
  isValidSaveSoloRandomTimedResponseJson,
  saveSoloRandomTimedEndpoint,
} from '../../server/apiEndpoints/saveSoloRandomTimedIo.js';
import {
  SaveSoloRandomWordsRequest,
  SaveSoloRandomWordsResponse,
  isValidSaveSoloRandomWordsResponseJson,
  saveSoloRandomWordsEndpoint,
} from '../../server/apiEndpoints/saveSoloRandomWordsIo.js';
import { SoloReplayData, SoloReplayDataEdit, isValidSoloReplayData } from '../../server/replayData.js';
import {
  isValidCharactersTypedCorrectly,
  isValidCharactersTypedIncorrectly,
  isValidQuoteId,
  isValidSecondsTaken,
  isValidWordsTypedCorrectly,
  isValidWordsTypedIncorrectly,
  maxCharacters,
  maxWords,
} from '../../server/verification.js';
import { calculateTestDataToShowToUser } from './calculateTestDataToShowToUser.js';
import { getOneEditDiff } from './getOneEditDiff.js';
import styles from './index.module.css';

const enum TestStateType {
  BeforeStart,
  InProgress,
  Ended,
  TimeTravel,
}

type BeforeStartTestState = {
  type: TestStateType.BeforeStart;
  words: string[];
  quoteId?: string;
};

type InProgressTestState = {
  type: TestStateType.InProgress;
  words: string[];
  quoteId?: string;
  startTime: Date;
};

type EndedTestState = {
  type: TestStateType.Ended;
  words: string[];
  quoteId?: string;
  replayData: SoloReplayData;
  startTime: Date;
  endTime: Date;
};

type TimeTravelTestState = {
  type: TestStateType.TimeTravel;
  words: string[];
  replayData: SoloReplayData;
  startTime: Date;
  isEnded: boolean;
  quoteId?: string;
  charactersTypedCorrectly: number;
  charactersTypedIncorrectly: number;
  wordsTypedCorrectly: number;
  wordsTypedIncorrectly: number;
  secondsTaken: number;
};

type TestState = BeforeStartTestState | InProgressTestState | EndedTestState | TimeTravelTestState;

function selectRandomFromArray<T>(array: T[]): T {
  if (array.length === 0) {
    throw new Error('Cannot select random item from empty array.');
  }
  return array[Math.floor(Math.random() * array.length)];
}

function makeRandomWordList(numWords: number): string[] {
  const words: string[] = [];
  let chars = 0;
  while (words.length < numWords) {
    const word = selectRandomFromArray(commonWords);
    const newChars = chars + chars === 0 ? words.length : words.length + 1;
    if (newChars > maxCharacters) {
      break;
    }
    words.push(word);
    chars = newChars;
  }
  return words;
}

function makeBeforeStartTestState(testConfig: TestConfig, quoteId: string | null): TestState {
  switch (testConfig.type) {
    case TypingTestType.Timed: {
      return {
        type: TestStateType.BeforeStart,
        words: makeRandomWordList(maxWords),
      };
    }
    case TypingTestType.WordLimit: {
      const { wordLimit } = testConfig;
      return {
        type: TestStateType.BeforeStart,
        words: makeRandomWordList(wordLimit),
      };
    }
    case TypingTestType.Quote: {
      let quote: Quote;
      if (quoteId === null) {
        quote = selectRandomFromArray(quotes);
      } else {
        const quoteMaybe = quotes.find((quote) => quote.id === quoteId);
        if (quoteMaybe === undefined) {
          throw new Error(`No quote with id ${quoteId} exists.`);
        }
        quote = quoteMaybe;
      }
      return {
        type: TestStateType.BeforeStart,
        words: quote.text.split(/\s+/g),
        quoteId: quote.id,
      };
    }
  }
}

function getDateSeconds(date: Date): number {
  return date.getTime() / 1000;
}

function getTestInfo(testConfig: TestConfig, testState: TestState, numDoneWords: number): string {
  switch (testConfig.type) {
    case TypingTestType.Timed: {
      const { timeLimit } = testConfig;
      if (testState.type === TestStateType.BeforeStart) {
        return String(timeLimit);
      }
      if (testState.type === TestStateType.Ended) {
        return '0';
      }
      const secondsRemaining = Math.ceil(Math.max(0, getDateSeconds(testState.startTime) + timeLimit - getDateSeconds(new Date())));
      return String(secondsRemaining);
    }
    case TypingTestType.WordLimit: {
      const { wordLimit } = testConfig;
      return `${numDoneWords}/${wordLimit}`;
    }
    case TypingTestType.Quote: {
      return `${numDoneWords}/${testState.words.length}`;
    }
  }
}

function isTestDone(testConfig: TestConfig, testState: Extract<TestState, { type: TestStateType.InProgress }>, numDoneWords: number): boolean {
  switch (testConfig.type) {
    case TypingTestType.Timed: {
      const { timeLimit } = testConfig;
      return getDateSeconds(new Date()) >= getDateSeconds(testState.startTime) + timeLimit;
    }
    case TypingTestType.WordLimit: {
      const { wordLimit } = testConfig;
      return numDoneWords === (wordLimit as number);
    }
    case TypingTestType.Quote: {
      return numDoneWords === testState.words.length;
    }
  }
}

type EndedTestData = {
  testConfig: TestConfig;
  testState: EndedTestState | TimeTravelTestState;
  charactersTypedCorrectly: number;
  charactersTypedIncorrectly: number;
  wordsTypedCorrectly: number;
  wordsTypedIncorrectly: number;
  secondsTaken: number;
};

function getEndedTestData(testConfig: TestConfig, testState: EndedTestState | TimeTravelTestState, doneWords: string[]): EndedTestData {
  const doneWordsIsCorrect = doneWords.map((word, i) => testState.words[i] === word);
  if (testState.type === TestStateType.TimeTravel) {
    return {
      testConfig,
      testState,
      charactersTypedCorrectly: testState.charactersTypedCorrectly,
      charactersTypedIncorrectly: testState.charactersTypedIncorrectly,
      wordsTypedCorrectly: testState.wordsTypedCorrectly,
      wordsTypedIncorrectly: testState.wordsTypedIncorrectly,
      secondsTaken: testState.secondsTaken,
    };
  }
  const charactersTypedCorrectly = doneWordsIsCorrect.map((isCorrect, i) => (isCorrect ? testState.words[i].length + 1 : 0)).reduce((p, c) => p + c, 0);
  const charactersTypedIncorrectly = doneWordsIsCorrect.map((isCorrect, i) => (isCorrect ? 0 : testState.words[i].length + 1)).reduce((p, c) => p + c, 0);
  const wordsTypedCorrectly = doneWordsIsCorrect.filter((isCorrect) => isCorrect).length;
  const wordsTypedIncorrectly = doneWordsIsCorrect.filter((isCorrect) => !isCorrect).length;
  return {
    testConfig,
    testState,
    charactersTypedCorrectly,
    charactersTypedIncorrectly,
    wordsTypedCorrectly,
    wordsTypedIncorrectly,
    secondsTaken: testConfig.type === TypingTestType.Timed ? testConfig.timeLimit : getDateSeconds(testState.endTime) - getDateSeconds(testState.startTime),
  };
}

function findFirstAtOrAfterIndex<T>(array: T[], predicate: (value: T, i: number) => boolean, index: number): number {
  for (let i = index; i < array.length; i++) {
    const item = array[i];
    if (predicate(item, i)) {
      return i;
    }
  }
  return -1;
}

const totalLines = 3;

export const enum LocalTypeNavigationStateType {
  PlayQuote,
  TimeTravel,
}

export type LocalTypeNavigationState =
  | {
      type: LocalTypeNavigationStateType.PlayQuote;
      quoteId: string;
    }
  | {
      type: LocalTypeNavigationStateType.TimeTravel;
      words: string[];
      quoteId?: string;
      replayData: SoloReplayData;
      charactersTypedCorrectly: number;
      charactersTypedIncorrectly: number;
      wordsTypedCorrectly: number;
      wordsTypedIncorrectly: number;
      secondsTaken: number;
    };

function isNavigationState(navigationState: unknown): navigationState is LocalTypeNavigationState {
  if (typeof navigationState !== 'object' || navigationState === null) {
    return false;
  }
  const { type } = navigationState as { type: unknown };
  if (type === LocalTypeNavigationStateType.PlayQuote) {
    const { quoteId } = navigationState as { quoteId: unknown };
    return typeof quoteId === 'string' && isValidQuoteId(quoteId);
  }
  if (type === LocalTypeNavigationStateType.TimeTravel) {
    const { words, quoteId, replayData, charactersTypedCorrectly, charactersTypedIncorrectly, wordsTypedCorrectly, wordsTypedIncorrectly, secondsTaken } =
      navigationState as {
        words: unknown;
        quoteId: unknown;
        replayData: unknown;
        charactersTypedCorrectly: unknown;
        charactersTypedIncorrectly: unknown;
        wordsTypedCorrectly: unknown;
        wordsTypedIncorrectly: unknown;
        secondsTaken: unknown;
      };
    return (
      Array.isArray(words) &&
      words.every((word) => typeof word === 'string') &&
      (quoteId === undefined || (typeof quoteId === 'string' && isValidQuoteId(quoteId))) &&
      isValidSoloReplayData(replayData) &&
      typeof charactersTypedCorrectly === 'number' &&
      isValidCharactersTypedCorrectly(charactersTypedCorrectly) &&
      typeof charactersTypedIncorrectly === 'number' &&
      isValidCharactersTypedIncorrectly(charactersTypedIncorrectly) &&
      typeof wordsTypedCorrectly === 'number' &&
      isValidWordsTypedCorrectly(wordsTypedCorrectly) &&
      typeof wordsTypedIncorrectly === 'number' &&
      isValidWordsTypedIncorrectly(wordsTypedIncorrectly) &&
      typeof secondsTaken === 'number' &&
      isValidSecondsTaken(secondsTaken)
    );
  }
  return false;
}

export function LocalTypePage(): JSX.Element {
  useTitle('YeType');
  const testConfig = useObservable(testConfig$);
  const location = useLocation();
  const locationState: unknown = location.state;
  let initialQuoteId: string | null = null;
  let initialTestState: TestState | null = null;
  if (isNavigationState(locationState)) {
    switch (locationState.type) {
      case LocalTypeNavigationStateType.PlayQuote: {
        const { quoteId } = locationState;
        if (testConfig.type === TypingTestType.Quote) {
          initialQuoteId = quoteId;
        }
        break;
      }
      case LocalTypeNavigationStateType.TimeTravel: {
        const { words, quoteId, replayData, charactersTypedCorrectly, charactersTypedIncorrectly, wordsTypedCorrectly, wordsTypedIncorrectly, secondsTaken } =
          locationState;
        if (testConfig.type === TypingTestType.Quote ? quoteId === undefined : quoteId !== undefined) {
          break;
        }
        initialTestState = {
          type: TestStateType.TimeTravel,
          words,
          quoteId,
          replayData,
          startTime: new Date(),
          charactersTypedCorrectly,
          charactersTypedIncorrectly,
          wordsTypedCorrectly,
          wordsTypedIncorrectly,
          secondsTaken,
          isEnded: false,
        };
        break;
      }
    }
  }
  const [specificQuoteId, setSpecificQuoteId] = useState<string | null>(initialQuoteId);
  const [testState, setTestState] = useState(() => initialTestState ?? makeBeforeStartTestState(testConfig, specificQuoteId));
  const [firstLineStartIndex, setFirstLineStartIndex] = useState(0);
  const [lineEndIndices, setLineEndIndices] = useState<number[] | null>(null);
  const [doneWords, setDoneWords] = useState<string[]>([]);
  const [testInfo, setTestInfo] = useState(() => getTestInfo(testConfig, testState, doneWords.length));
  const [inputText, setInputText] = useState('');
  const replayDataRef = useRef<SoloReplayData>([]);
  const wordsElementRef = useRef<HTMLDivElement>(null);
  const restart = (newTestConfig: TestConfig, newSpecificQuoteId: string | null): void => {
    if (newTestConfig.type !== TypingTestType.Quote) {
      setSpecificQuoteId(null);
    }
    const newTestState = makeBeforeStartTestState(newTestConfig, newSpecificQuoteId);
    const newDoneWords: string[] = [];
    setTestState(newTestState);
    setFirstLineStartIndex(0);
    setLineEndIndices(null);
    setDoneWords(newDoneWords);
    setTestInfo(getTestInfo(newTestConfig, newTestState, newDoneWords.length));
    setInputText('');
    replayDataRef.current = [];
  };
  const lineEndIndicesRef = useRef<number[] | null>(null);
  useEffect(() => {
    lineEndIndicesRef.current = lineEndIndices;
  }, [lineEndIndices]);
  const endTimeTravel = (): void => {
    if (testState.type !== TestStateType.TimeTravel) {
      throw new Error("Can't cancel time travel when not time traveling");
    }
    const newTestState: TestState = {
      ...testState,
      isEnded: true,
    };
    if ('quoteId' in testState) {
      newTestState.quoteId = testState.quoteId;
    }
    setTestState(newTestState);
    setFirstLineStartIndex(0);
    setLineEndIndices(null);
    setDoneWords([]);
    setTestInfo('');
    setInputText('');
  };
  useEffect(() => {
    if (testState.type !== TestStateType.TimeTravel) {
      return;
    }
    const { startTime, replayData, isEnded } = testState;
    if (isEnded) {
      return;
    }
    let lastEditIndex = -1;
    let str = '';
    let isDone = false;
    const step = (): void => {
      const millisecondsPassed = Date.now() - startTime.getTime();
      if (lastEditIndex === replayData.length - 1) {
        isDone = true;
        cancelId = window.setTimeout(endTimeTravel, 200);
        return;
      }
      const newLastEditIndex = findFirstAtOrAfterIndex(
        replayData,
        (replayDataEdit, i) => millisecondsPassed >= replayDataEdit[2] && (i === replayData.length - 1 || millisecondsPassed < replayData[i + 1][2]),
        Math.max(lastEditIndex, 0),
      );
      if (newLastEditIndex === lastEditIndex) {
        cancelId = requestAnimationFrame(step);
        return;
      }
      for (let i = lastEditIndex + 1; i <= newLastEditIndex; i++) {
        const [startIndex, endIndex, _, insertText = ''] = replayData[i];
        str = str.slice(0, startIndex) + insertText + str.slice(endIndex);
      }
      lastEditIndex = newLastEditIndex;
      if (str === '') {
        setFirstLineStartIndex(0);
        setDoneWords([]);
        setInputText('');
        cancelId = requestAnimationFrame(step);
        return;
      }
      const splitStr = str.split(/\s+/g);
      const typedWords = splitStr.slice(0, -1);
      const currentWord = splitStr[splitStr.length - 1];
      const newDoneWords = typedWords;
      setDoneWords(newDoneWords);
      setInputText(currentWord);
      testPushNextLine(newDoneWords.length, lineEndIndicesRef.current);
      setTestInfo(getTestInfo(testConfig, testState, newDoneWords.length));
      cancelId = requestAnimationFrame(step);
    };
    let cancelId = requestAnimationFrame(step);
    return () => {
      if (isDone) {
        window.clearTimeout(cancelId);
      } else {
        cancelAnimationFrame(cancelId);
      }
    };
  }, [testState]);
  useEffect(() => {
    const subscription = testConfig$.pipe(skip(1)).subscribe({
      next(newTestConfig) {
        restart(newTestConfig, specificQuoteId);
      },
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [specificQuoteId]);
  const finishTest = (testState: InProgressTestState, doneWords: string[]): void => {
    clearTestCheckIntervalRef.current?.();
    const newTestState: TestState = {
      type: TestStateType.Ended,
      replayData: replayDataRef.current,
      startTime: testState.startTime,
      endTime: new Date(),
      words: testState.words,
    };
    if ('quoteId' in testState) {
      newTestState.quoteId = testState.quoteId;
    }
    setTestState(newTestState);
    setFirstLineStartIndex(0);
    setLineEndIndices(null);
    setDoneWords(doneWords);
    setTestInfo('');
    setInputText('');
    replayDataRef.current = [];
  };
  useEffect(() => {
    if (testState.type !== TestStateType.Ended) {
      return;
    }
    const { authenticatedUser } = userAuthenticationStatus$.value;
    if (authenticatedUser === null) {
      return;
    }
    if (doneWords.length === 0) {
      return;
    }
    const { token } = authenticatedUser;
    let postObservable: Observable<SaveSoloRandomTimedResponse | SaveSoloQuoteResponse | SaveSoloRandomWordsResponse>;
    const { charactersTypedCorrectly, charactersTypedIncorrectly, wordsTypedCorrectly, wordsTypedIncorrectly, secondsTaken } = getEndedTestData(
      testConfig,
      testState,
      doneWords,
    );
    const { replayData } = testState;
    switch (testConfig.type) {
      case TypingTestType.Timed: {
        const { timeLimit } = testConfig;
        const request: SaveSoloRandomTimedRequest = {
          words: testState.words.slice(0, doneWords.length).join(' '),
          testTimeSeconds: timeLimit,
          charactersTypedCorrectly,
          charactersTypedIncorrectly,
          wordsTypedCorrectly,
          wordsTypedIncorrectly,
          replayData,
        };
        postObservable = makeApiRequest(saveSoloRandomTimedEndpoint, {
          isValidResponseJson: isValidSaveSoloRandomTimedResponseJson,
          body: JSON.stringify(request),
          token,
        });
        break;
      }
      case TypingTestType.WordLimit: {
        const { wordLimit } = testConfig;
        const request: SaveSoloRandomWordsRequest = {
          words: testState.words.slice(0, doneWords.length).join(' '),
          testWordLimit: wordLimit,
          secondsTaken,
          charactersTypedCorrectly,
          charactersTypedIncorrectly,
          wordsTypedCorrectly,
          wordsTypedIncorrectly,
          replayData,
        };
        postObservable = makeApiRequest(saveSoloRandomWordsEndpoint, {
          isValidResponseJson: isValidSaveSoloRandomWordsResponseJson,
          body: JSON.stringify(request),
          token,
        });
        break;
      }
      case TypingTestType.Quote: {
        if (testState.quoteId === undefined) {
          throw new Error('Expected quote id.');
        }
        const request: SaveSoloQuoteRequest = {
          quoteId: testState.quoteId,
          secondsTaken,
          charactersTypedCorrectly,
          charactersTypedIncorrectly,
          wordsTypedCorrectly,
          wordsTypedIncorrectly,
          replayData,
        };
        postObservable = makeApiRequest(saveSoloQuoteEndpoint, {
          isValidResponseJson: isValidSaveSoloQuoteResponseJson,
          body: JSON.stringify(request),
          token,
        });
        break;
      }
    }
    postObservable.subscribe({
      next(responseJson) {
        switch (responseJson.type) {
          case 'fail': {
            break;
          }
          case 'notAuthorized': {
            if (userAuthenticationStatus$.value.authenticatedUser?.token === token) {
              resetAuthenticatedUser();
            }
            break;
          }
          case 'success': {
            break;
          }
        }
      },
    });
  }, [testState.type]);
  const clearTestCheckIntervalRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (testState.type !== TestStateType.InProgress) {
      clearTestCheckIntervalRef.current = null;
      return;
    }
    const id = setInterval(() => {
      if (isTestDone(testConfig, testState, doneWords.length)) {
        finishTest(testState, doneWords);
        return;
      }
      setTestInfo(getTestInfo(testConfig, testState, doneWords.length));
    });
    const stop = (): void => {
      clearInterval(id);
    };
    clearTestCheckIntervalRef.current = stop;
    return stop;
  }, [testConfig, testState, doneWords]);
  const firstWordRef = useRef<HTMLSpanElement>(null);
  const currentWordRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (testState.type === TestStateType.Ended || (testState.type === TestStateType.TimeTravel && testState.isEnded)) {
      return;
    }
    const onResize = (): void => {
      setLineEndIndices(null);
    };
    const listenerOptions: AddEventListenerOptions = { passive: true };
    window.addEventListener('resize', onResize, listenerOptions);
    return () => {
      window.removeEventListener('resize', onResize, listenerOptions);
    };
  }, [testState.type, doneWords.length]);
  useLayoutEffect(() => {
    if (testState.type === TestStateType.Ended || (testState.type === TestStateType.TimeTravel && testState.isEnded) || lineEndIndices !== null) {
      return;
    }
    const newLineEndIndices: number[] = [];
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const wordsElement = wordsElementRef.current!;
    let lastBoundingRect = (wordsElement.childNodes[0] as HTMLElement).getBoundingClientRect();
    for (let i = 1; i < wordsElement.childNodes.length; i++) {
      const childNode = wordsElement.childNodes[i] as HTMLElement;
      const boundingRect = childNode.getBoundingClientRect();
      if (boundingRect.top >= lastBoundingRect.bottom) {
        newLineEndIndices.push(firstLineStartIndex + i - 1);
        if (newLineEndIndices.length === 3) {
          break;
        }
      }
      lastBoundingRect = boundingRect;
    }
    if (newLineEndIndices.length < 3) {
      newLineEndIndices.push(testState.words.length - 1);
    } else if (
      firstLineStartIndex !== doneWords.length &&
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (currentWordRef.current === null || currentWordRef.current.getBoundingClientRect().top >= firstWordRef.current!.getBoundingClientRect().bottom)
    ) {
      setFirstLineStartIndex(doneWords.length);
      return;
    }
    setLineEndIndices(newLineEndIndices);
  }, [lineEndIndices, firstLineStartIndex, testState]);
  let wordsElement: JSX.Element | null = null;
  if (testState.type !== TestStateType.Ended && (testState.type !== TestStateType.TimeTravel || !testState.isEnded)) {
    if (lineEndIndices === null) {
      const words = testState.words.slice(firstLineStartIndex, firstLineStartIndex + 120);
      wordsElement = (
        <div className={styles.words} ref={wordsElementRef}>
          {words.map((word, i) => {
            const wordIndex = firstLineStartIndex + i;
            return (
              <span className={styles.words__word} key={wordIndex} ref={i === 0 ? firstWordRef : wordIndex === doneWords.length ? currentWordRef : null}>
                {word}
              </span>
            );
          })}
        </div>
      );
    } else {
      wordsElement = (
        <div className={`${styles.words} ${styles['words--measured']}`} ref={wordsElementRef}>
          {lineEndIndices.map((lineEndIndex, i) => {
            const lineStartIndex = i === 0 ? firstLineStartIndex : lineEndIndices[i - 1] + 1;
            const lineWords = testState.words.slice(lineStartIndex, lineEndIndex + 1);
            return (
              <div className={styles.words__line} key={lineEndIndex}>
                {lineWords.map((word, j) => {
                  const wordIndex = lineStartIndex + j;
                  return (
                    <span
                      className={[
                        styles.words__word,
                        wordIndex === doneWords.length
                          ? styles['words__word--current']
                          : wordIndex < doneWords.length
                          ? doneWords[wordIndex] === testState.words[wordIndex]
                            ? styles['words__word--correct']
                            : styles['words__word--incorrect']
                          : false,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      key={wordIndex}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
            );
          })}
          {lineEndIndices.length < totalLines
            ? Array.from({ length: totalLines - lineEndIndices.length }, (_, i) => (
                <div className={styles.words__line} aria-hidden key={i}>
                  <span className={`${styles.words__word} ${styles['words__word--placeholder']}`}>placeholder</span>
                </div>
              ))
            : null}
        </div>
      );
    }
  }
  const inputRef = useRef<HTMLInputElement>(null);
  const restartRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (testState.type === TestStateType.BeforeStart) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      inputRef.current!.focus();
    } else if (testState.type === TestStateType.Ended || (testState.type === TestStateType.TimeTravel && testState.isEnded)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      restartRef.current!.focus();
    }
  }, [testState]);
  const testPushNextLine = (doneWordsCount: number, lineEndIndices_: number[] | null = lineEndIndices): void => {
    if (lineEndIndices_ === null) {
      throw new Error('lineEndIndices should not be null.');
    }
    if (lineEndIndices_[lineEndIndices_.length - 1] === testState.words.length - 1) {
      return;
    }
    for (let i = lineEndIndices_.length - 1; i >= 0; i--) {
      const lastWordIndex = lineEndIndices_[i];
      if (doneWordsCount > lastWordIndex) {
        setFirstLineStartIndex(lastWordIndex + 1);
        setLineEndIndices(null);
      }
    }
  };
  const onInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    let currentTestState = testState;
    if (currentTestState.type === TestStateType.Ended || currentTestState.type === TestStateType.TimeTravel) {
      throw new Error("Test shouldn't be ended here.");
    }
    if (currentTestState.type === TestStateType.BeforeStart) {
      currentTestState = {
        type: TestStateType.InProgress,
        startTime: new Date(),
        words: testState.words,
      };
      if ('quoteId' in testState) {
        currentTestState.quoteId = testState.quoteId;
      }
      setTestState(currentTestState);
    }
    const editMilliseconds = testState.type === TestStateType.BeforeStart ? 0 : Date.now() - testState.startTime.getTime();
    if (isTestDone(testConfig, currentTestState, doneWords.length)) {
      // I doubt react would call an onInputChange after the test is finished (which would clear replayData breaking the immediate replay) because the state
      // would be changed to remove the input field.
      finishTest(currentTestState, doneWords);
      return;
    }
    const currentInputText = event.target.value.trimStart();
    const diff = getOneEditDiff(inputText, currentInputText);
    let firstLineWordCharStartIndex = 0;
    for (let i = 0; i < doneWords.length; i++) {
      firstLineWordCharStartIndex += doneWords[i].length + 1;
    }
    const editStartIndex = firstLineWordCharStartIndex + diff.startIndex;
    const editEndIndex = firstLineWordCharStartIndex + diff.endIndex;
    const edit: SoloReplayDataEdit =
      diff.insertText === '' ? [editStartIndex, editEndIndex, editMilliseconds] : [editStartIndex, editEndIndex, editMilliseconds, diff.insertText];
    replayDataRef.current.push(edit);
    if (!/\s+/.test(currentInputText)) {
      setInputText(currentInputText);
      return;
    }
    const words = currentInputText.split(/\s+/g);
    const newDoneWords = [...doneWords];
    for (let i = 0; i < words.length - 1; i++) {
      const word = words[i];
      newDoneWords.push(word);
      if (newDoneWords.length === testState.words.length) {
        finishTest(currentTestState, newDoneWords);
        return;
      }
    }
    testPushNextLine(newDoneWords.length);
    setInputText(words[words.length - 1]);
    setDoneWords(newDoneWords);
    setTestInfo(getTestInfo(testConfig, testState, newDoneWords.length));
  };
  let mainElement: JSX.Element;
  if (testState.type === TestStateType.Ended || (testState.type === TestStateType.TimeTravel && testState.isEnded)) {
    const endedTestData = getEndedTestData(testConfig, testState, doneWords);
    const onTimeTravelClick = (): void => {
      const newTestState: TestState = {
        type: TestStateType.TimeTravel,
        words: testState.words,
        replayData: testState.replayData,
        startTime: new Date(),
        charactersTypedCorrectly: endedTestData.charactersTypedCorrectly,
        charactersTypedIncorrectly: endedTestData.charactersTypedIncorrectly,
        wordsTypedCorrectly: endedTestData.wordsTypedCorrectly,
        wordsTypedIncorrectly: endedTestData.wordsTypedIncorrectly,
        secondsTaken: endedTestData.secondsTaken,
        isEnded: false,
      };
      if ('quoteId' in testState) {
        newTestState.quoteId = testState.quoteId;
      }
      setTestState(newTestState);
      setFirstLineStartIndex(0);
      setLineEndIndices(null);
      setDoneWords([]);
      setTestInfo(getTestInfo(testConfig, newTestState, 0));
      setInputText('');
    };
    mainElement = (
      <Result
        data={endedTestData}
        restartButtonProps={{
          onClick: () => {
            setSpecificQuoteId(null);
            restart(testConfig, null);
          },
          onKeyUp: (e: React.KeyboardEvent) => {
            if (e.code === 'Space') {
              e.preventDefault();
            }
          },
        }}
        restartButtonRef={restartRef}
        onTimeTravelClick={onTimeTravelClick}
        makeSpecificQuote={() => {
          if (testConfig.type !== TypingTestType.Quote) {
            throw new Error('Test type should be quote.');
          }
          if (testState.quoteId === undefined) {
            throw new Error('Expected quote id.');
          }
          setSpecificQuoteId(testState.quoteId);
          restart(testConfig, testState.quoteId);
        }}
      />
    );
  } else {
    const isTimeTravel = testState.type === TestStateType.TimeTravel;
    mainElement = (
      <div className={styles.controls}>
        <input className={styles.controls__input} value={inputText} onChange={onInputChange} ref={inputRef} disabled={isTimeTravel} />
        <div className={styles.controls__info}>{testInfo}</div>
        <button
          className={styles.controls__button}
          onClick={() => {
            restart(testConfig, specificQuoteId);
          }}
          ref={restartRef}
        >
          New Test
        </button>
        {isTimeTravel && (
          <button className={styles.controls__button} onClick={endTimeTravel}>
            End
          </button>
        )}
        {!isTimeTravel && specificQuoteId !== null && (
          <button
            className={styles.controls__button}
            onClick={() => {
              setSpecificQuoteId(null);
              restart(testConfig, null);
            }}
          >
            Clear Quote
          </button>
        )}
      </div>
    );
  }
  return (
    <>
      {wordsElement}
      {mainElement}
    </>
  );
}

function Result(props: {
  data: EndedTestData;
  restartButtonProps: React.ButtonHTMLAttributes<HTMLButtonElement>;
  restartButtonRef: React.RefObject<HTMLButtonElement>;
  onTimeTravelClick: () => void;
  makeSpecificQuote: () => void;
}): JSX.Element {
  const isLoggedIn = useIsLoggedIn();
  const { data, restartButtonProps, restartButtonRef, onTimeTravelClick, makeSpecificQuote } = props;
  const { testConfig, testState, charactersTypedCorrectly, charactersTypedIncorrectly, wordsTypedCorrectly, wordsTypedIncorrectly, secondsTaken } = data;
  const { wpm, totalCharacters, totalWords, accuracy } = calculateTestDataToShowToUser({
    charactersTypedCorrectly,
    charactersTypedIncorrectly,
    wordsTypedCorrectly,
    wordsTypedIncorrectly,
    secondsTaken,
  });
  let maybeQuoteFragment: JSX.Element | null = null;
  const navigate = useNavigate();
  if (testConfig.type === TypingTestType.Quote) {
    if (testState.quoteId === undefined) {
      throw new Error('Expected quote id.');
    }
    maybeQuoteFragment = (
      <>
        <InfoButton onClick={makeSpecificQuote}>Repeat Quote</InfoButton>
        {isLoggedIn && (
          <InfoButton
            onClick={() => {
              navigate(Route.History, {
                state: testState.quoteId,
              });
            }}
          >
            See Quote History
          </InfoButton>
        )}
      </>
    );
  }
  return (
    <div className={styles.result__container}>
      <div className={styles.result}>
        <p className={styles.result__label}>Result</p>
        <table className={styles.result__table}>
          <thead>
            <tr>
              <th className={styles['result__table-title-cell']} colSpan={2}>
                {wpm} wpm
              </th>
            </tr>
          </thead>
          <tbody>
            {testConfig.type !== TypingTestType.Timed && (
              <tr>
                <td className={styles['result__table-cell']}>Time taken</td>
                <td className={styles['result__table-cell']}>{roundTo1Dp(secondsTaken)}s</td>
              </tr>
            )}
            <tr>
              <td className={styles['result__table-cell']}>Characters</td>
              <td className={styles['result__table-cell']}>
                {totalCharacters} (<span className={styles.result__correct}>{charactersTypedCorrectly}</span>/
                <span className={styles.result__incorrect}>{charactersTypedIncorrectly}</span>)
              </td>
            </tr>
            <tr>
              <td className={styles['result__table-cell']}>Words</td>
              <td className={styles['result__table-cell']}>
                {totalWords} (<span className={styles.result__correct}>{wordsTypedCorrectly}</span>/
                <span className={styles.result__incorrect}>{wordsTypedIncorrectly}</span>)
              </td>
            </tr>
            <tr>
              <td className={styles['result__table-cell']}>Accuracy</td>
              <td className={styles['result__table-cell']}>{accuracy}%</td>
            </tr>
          </tbody>
        </table>
        <InfoButton {...restartButtonProps} ref={restartButtonRef}>
          New Test
        </InfoButton>
        {maybeQuoteFragment}
        <InfoButton onClick={onTimeTravelClick}>Time Travel</InfoButton>
      </div>
    </div>
  );
}
