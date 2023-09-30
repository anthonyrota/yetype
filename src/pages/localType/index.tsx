import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Observable, skip } from 'rxjs';
import { makeApiRequest } from '../../api.js';
import { commonWords } from '../../commonWords.js';
import { useObservable } from '../../hooks/useObservable.js';
import { useTitle } from '../../hooks/useTitle.js';
import { resetAuthenticatedUser, userAuthenticationStatus$ } from '../../persistedState/authenticatedUser.js';
import { TestConfig, TypingTestType, testConfig$ } from '../../persistedState/testConfig.js';
import { quotes } from '../../quotes.js';
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
import { SoloReplayData, SoloReplayDataEdit } from '../../server/replayData.js';
import { maxCharacters, maxWords } from '../../server/verification.js';
import styles from './index.module.css';

const enum TestStateType {
  BeforeStart,
  InProgress,
  Ended,
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
  startTime: Date;
  endTime: Date;
};

type TestState = BeforeStartTestState | InProgressTestState | EndedTestState;

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

function makeBeforeStartTestState(testConfig: TestConfig): TestState {
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
      const quote = selectRandomFromArray(quotes);
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

function getTestInfo(testConfig: TestConfig, testState: TestState, doneWords: boolean[]): string {
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
      return `${doneWords.length}/${wordLimit}`;
    }
    case TypingTestType.Quote: {
      return `${doneWords.length}/${testState.words.length}`;
    }
  }
}

function isTestDone(testConfig: TestConfig, testState: Extract<TestState, { type: TestStateType.InProgress }>, doneWords: boolean[]): boolean {
  switch (testConfig.type) {
    case TypingTestType.Timed: {
      const { timeLimit } = testConfig;
      return getDateSeconds(new Date()) >= getDateSeconds(testState.startTime) + timeLimit;
    }
    case TypingTestType.WordLimit: {
      const { wordLimit } = testConfig;
      return doneWords.length === (wordLimit as number);
    }
    case TypingTestType.Quote: {
      return doneWords.length === testState.words.length;
    }
  }
}

function getOneEditDiff(before: string, after: string): { startIndex: number; endIndex: number; insertText: string } {
  if (before === '') {
    return { startIndex: 0, endIndex: 0, insertText: after };
  }
  let firstUnequalCharIndex = -1;
  for (let i = 0; i < before.length; i++) {
    if (i > after.length) {
      return { startIndex: after.length, endIndex: before.length, insertText: '' };
    }
    if (before[i] !== after[i]) {
      firstUnequalCharIndex = i;
      break;
    }
  }
  if (firstUnequalCharIndex === -1) {
    return { startIndex: before.length, endIndex: before.length, insertText: after.slice(before.length) };
  }
  let lastUnequalCharIndexFromEnd = -1;
  for (let i = 0; i < before.length; i++) {
    if (i > after.length) {
      return { startIndex: 0, endIndex: before.length - after.length, insertText: '' };
    }
    if (before[before.length - i - 1] !== after[after.length - i - 1]) {
      lastUnequalCharIndexFromEnd = i;
      break;
    }
  }
  if (lastUnequalCharIndexFromEnd === -1) {
    return { startIndex: 0, endIndex: 0, insertText: after.slice(0, after.length - before.length) };
  }
  return {
    startIndex: firstUnequalCharIndex,
    endIndex: before.length - lastUnequalCharIndexFromEnd,
    insertText: after.slice(firstUnequalCharIndex, -lastUnequalCharIndexFromEnd),
  };
}

export function LocalTypePage(): JSX.Element {
  useTitle('YeType');
  const testConfig = useObservable(testConfig$);
  const [testState, setTestState] = useState(() => makeBeforeStartTestState(testConfig));
  const [firstLineStartIndex, setFirstLineStartIndex] = useState(0);
  const [lineEndIndices, setLineEndIndices] = useState<number[] | null>(null);
  const [doneWords, setDoneWords] = useState<boolean[]>([]);
  const [testInfo, setTestInfo] = useState(() => getTestInfo(testConfig, testState, doneWords));
  const [inputText, setInputText] = useState('');
  const replayDataRef = useRef<SoloReplayData>([]);
  const wordsElementRef = useRef<HTMLDivElement>(null);
  const restart = (newTestConfig: TestConfig): void => {
    const newTestState = makeBeforeStartTestState(newTestConfig);
    const newDoneWords: boolean[] = [];
    setTestState(newTestState);
    setFirstLineStartIndex(0);
    setLineEndIndices(null);
    setDoneWords(newDoneWords);
    setTestInfo(getTestInfo(newTestConfig, newTestState, newDoneWords));
    setInputText('');
    replayDataRef.current = [];
  };
  useEffect(() => {
    const subscription = testConfig$.pipe(skip(1)).subscribe({
      next(newTestConfig) {
        restart(newTestConfig);
      },
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  const finishTest = (testState: InProgressTestState, doneWords: boolean[]): void => {
    const newTestState: TestState = {
      type: TestStateType.Ended,
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
    setTestInfo(getTestInfo(testConfig, newTestState, doneWords));
    setInputText('');
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
    const charactersTypedCorrectly = doneWords.map((isCorrect, i) => (isCorrect ? testState.words[i].length + 1 : 0)).reduce((p, c) => p + c, 0);
    const charactersTypedIncorrectly = doneWords.map((isCorrect, i) => (isCorrect ? 0 : testState.words[i].length + 1)).reduce((p, c) => p + c, 0);
    const wordsTypedCorrectly = doneWords.filter((isCorrect) => isCorrect).length;
    const wordsTypedIncorrectly = doneWords.filter((isCorrect) => !isCorrect).length;
    const replayData = replayDataRef.current;
    switch (testConfig.type) {
      case TypingTestType.Timed: {
        const { timeLimit } = testConfig;
        const request: SaveSoloRandomTimedRequest = {
          words: testState.words.slice(doneWords.length).join(' '),
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
          words: testState.words.slice(doneWords.length).join(' '),
          testWordLimit: wordLimit,
          secondsTaken: getDateSeconds(testState.endTime) - getDateSeconds(testState.startTime),
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
          secondsTaken: getDateSeconds(testState.endTime) - getDateSeconds(testState.startTime),
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
  useEffect(() => {
    if (testState.type !== TestStateType.InProgress) {
      return;
    }
    const id = setInterval(() => {
      if (isTestDone(testConfig, testState, doneWords)) {
        finishTest(testState, doneWords);
        return;
      }
      setTestInfo(getTestInfo(testConfig, testState, doneWords));
    });
    return () => {
      clearInterval(id);
    };
  }, [testConfig, testState, doneWords]);
  const firstWordRef = useRef<HTMLSpanElement>(null);
  const currentWordRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (testState.type === TestStateType.Ended) {
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
    if (testState.type === TestStateType.Ended || lineEndIndices !== null) {
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
        if (newLineEndIndices.length === 2) {
          break;
        }
      }
      lastBoundingRect = boundingRect;
    }
    if (newLineEndIndices.length < 2) {
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
  }, [lineEndIndices, firstLineStartIndex, testState.type === TestStateType.Ended]);
  let wordsElement: JSX.Element | null = null;
  if (testState.type !== TestStateType.Ended) {
    if (lineEndIndices === null) {
      const words = testState.words.slice(firstLineStartIndex, firstLineStartIndex + 80);
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
                          ? doneWords[wordIndex]
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
          {lineEndIndices.length === 1 ? (
            <div className={styles.words__line} aria-hidden>
              <span className={`${styles.words__word} ${styles['words__word--placeholder']}`}>placeholder</span>
            </div>
          ) : null}
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
    } else if (testState.type === TestStateType.Ended && document.activeElement === inputRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      restartRef.current!.focus();
    }
  }, [testState]);
  const onInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    let currentTestState = testState;
    if (currentTestState.type === TestStateType.Ended) {
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
    const editMilliseconds = testState.type === TestStateType.BeforeStart ? 0 : new Date().getTime() - testState.startTime.getTime();
    if (isTestDone(testConfig, currentTestState, doneWords)) {
      finishTest(currentTestState, doneWords);
      return;
    }
    const currentInputText = event.target.value.trimStart();
    const diff = getOneEditDiff(inputText, currentInputText);
    let firstLineWordCharStartIndex = 0;
    for (let i = 0; i < doneWords.length; i++) {
      firstLineWordCharStartIndex += testState.words[i].length + 1;
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
    const words = currentInputText.split(/\s+/);
    let newDoneWords = doneWords;
    for (let i = 0; i < words.length - 1; i++) {
      const word = words[i];
      const currentWord = testState.words[newDoneWords.length];
      newDoneWords = [...doneWords, word === currentWord];
      if (newDoneWords.length === testState.words.length) {
        finishTest(currentTestState, newDoneWords);
        return;
      }
    }
    if (lineEndIndices === null) {
      throw new Error('lineEndIndices should not be null.');
    }
    if (lineEndIndices[lineEndIndices.length - 1] !== testState.words.length - 1) {
      for (let i = lineEndIndices.length - 1; i >= 0; i--) {
        const lastWordIndex = lineEndIndices[i];
        if (newDoneWords.length > lastWordIndex) {
          setFirstLineStartIndex(lastWordIndex + 1);
          setLineEndIndices(null);
        }
      }
    }
    setInputText(words[words.length - 1]);
    setDoneWords(newDoneWords);
  };
  return (
    <div className={styles.container}>
      {wordsElement}
      <div className={styles.controls}>
        <input className={styles.controls__input} disabled={testState.type === TestStateType.Ended} value={inputText} onChange={onInputChange} ref={inputRef} />
        <div className={styles.controls__info}>{testInfo}</div>
        <button
          className={styles.controls__restart}
          onClick={() => restart(testConfig)}
          onKeyUp={(e) => {
            if (e.code === 'Space') {
              e.preventDefault();
            }
          }}
          ref={restartRef}
        >
          New Test
        </button>
      </div>
    </div>
  );
}
