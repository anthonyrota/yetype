import { useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { distinctUntilChanged, map } from 'rxjs';
import { useObservable } from '../hooks/useObservable.js';
import { authenticatedUser$, userAuthenticationStatus$ } from '../persistedState/authenticatedUser.js';
import { setTestConfig, testConfig$ } from '../persistedState/testConfig.js';
import { TestConfig, TypingTestType, validTypingTestTimeLimits, validTypingTestWordLimits } from '../persistedState/testConfigTypes.js';
import { Theme, setTheme, theme$ } from '../persistedState/theme.js';
import { Route } from '../routes.js';
import styles from './Header.module.css';

function HeaderSection(props: { children?: React.ReactNode }): JSX.Element {
  return <div className={styles.header__section}>{props.children}</div>;
}

function HeaderAnchorButton(props: { children?: React.ReactNode; toRoute: string }): JSX.Element {
  return (
    <NavLink
      caseSensitive
      end
      to={props.toRoute}
      className={({ isActive }) =>
        [styles.header__item, styles.header__button, styles['header__button--anchor'], isActive && styles['header__button--active']].filter(Boolean).join(' ')
      }
    >
      {props.children}
    </NavLink>
  );
}

function HeaderIconButton(props: { children?: React.ReactNode; onClick: () => void }): JSX.Element {
  return (
    <button className={`${styles.header__item} ${styles['header__icon-button']}`} onClick={props.onClick}>
      {props.children}
    </button>
  );
}

function HeaderActivatableTestConfigButton(props: { isActive: boolean; onClickActivate: () => void; children?: React.ReactNode }): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <button
      className={[styles.header__item, styles.header__button, props.isActive && styles['header__button--active']].filter(Boolean).join(' ')}
      onClick={
        props.isActive
          ? () => {
              if (location.pathname !== Route.LocalType) {
                navigate(Route.LocalType);
              }
            }
          : props.onClickActivate
      }
    >
      {props.children}
    </button>
  );
}

function HeaderLightIcon(): JSX.Element {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className={styles.header__icon}>
      <path
        d="M375.7 19.7c-1.5-8-6.9-14.7-14.4-17.8s-16.1-2.2-22.8 2.4L256 61.1 173.5 4.2c-6.7-4.6-15.3-5.5-22.8-2.4s-12.9 9.8-14.4 17.8l-18.1 98.5L19.7 136.3c-8 1.5-14.7 6.9-17.8 14.4s-2.2 16.1 2.4 22.8L61.1 256 4.2 338.5c-4.6 6.7-5.5 15.3-2.4 22.8s9.8 13 17.8 14.4l98.5 18.1 18.1 98.5c1.5 8 6.9 14.7 14.4 17.8s16.1 2.2 22.8-2.4L256 450.9l82.5 56.9c6.7 4.6 15.3 5.5 22.8 2.4s12.9-9.8 14.4-17.8l18.1-98.5 98.5-18.1c8-1.5 14.7-6.9 17.8-14.4s2.2-16.1-2.4-22.8L450.9 256l56.9-82.5c4.6-6.7 5.5-15.3 2.4-22.8s-9.8-12.9-17.8-14.4l-98.5-18.1L375.7 19.7zM269.6 110l65.6-45.2 14.4 78.3c1.8 9.8 9.5 17.5 19.3 19.3l78.3 14.4L402 242.4c-5.7 8.2-5.7 19 0 27.2l45.2 65.6-78.3 14.4c-9.8 1.8-17.5 9.5-19.3 19.3l-14.4 78.3L269.6 402c-8.2-5.7-19-5.7-27.2 0l-65.6 45.2-14.4-78.3c-1.8-9.8-9.5-17.5-19.3-19.3L64.8 335.2 110 269.6c5.7-8.2 5.7-19 0-27.2L64.8 176.8l78.3-14.4c9.8-1.8 17.5-9.5 19.3-19.3l14.4-78.3L242.4 110c8.2 5.7 19 5.7 27.2 0zM256 368a112 112 0 1 0 0-224 112 112 0 1 0 0 224zM192 256a64 64 0 1 1 128 0 64 64 0 1 1 -128 0z"
        className={styles['header__icon-path']}
      ></path>
    </svg>
  );
}

function HeaderDarkIcon(): JSX.Element {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className={styles.header__icon}>
      <path
        d="M223.5 32C100 32 0 132.3 0 256S100 480 223.5 480c60.6 0 115.5-24.2 155.8-63.4c5-4.9 6.3-12.5 3.1-18.7s-10.1-9.7-17-8.5c-9.8 1.7-19.8 2.6-30.1 2.6c-96.9 0-175.5-78.8-175.5-176c0-65.8 36-123.1 89.3-153.3c6.1-3.5 9.2-10.5 7.7-17.3s-7.3-11.9-14.3-12.5c-6.3-.5-12.6-.8-19-.8z"
        className={styles['header__icon-path']}
      ></path>
    </svg>
  );
}

function HeaderThemeButton(): JSX.Element {
  const theme = useObservable(theme$);
  return (
    <HeaderIconButton
      onClick={() => {
        setTheme(theme === Theme.Light ? Theme.Dark : Theme.Light);
      }}
    >
      {theme === Theme.Light ? <HeaderLightIcon /> : <HeaderDarkIcon />}
    </HeaderIconButton>
  );
}

function HeaderTestConfigSections(): JSX.Element {
  const testConfig = useObservable(testConfig$);
  const navigate = useNavigate();
  const updateConfig = (newConfig: TestConfig): void => {
    navigate(Route.LocalType);
    setTestConfig(newConfig);
  };
  return (
    <>
      <HeaderSection>
        <HeaderActivatableTestConfigButton
          isActive={testConfig.type === TypingTestType.Timed}
          onClickActivate={() => {
            updateConfig({ ...testConfig, type: TypingTestType.Timed });
          }}
        >
          Time
        </HeaderActivatableTestConfigButton>
        <HeaderActivatableTestConfigButton
          isActive={testConfig.type === TypingTestType.WordLimit}
          onClickActivate={() => {
            updateConfig({ ...testConfig, type: TypingTestType.WordLimit });
          }}
        >
          Words
        </HeaderActivatableTestConfigButton>
        <HeaderActivatableTestConfigButton
          isActive={testConfig.type === TypingTestType.Quote}
          onClickActivate={() => {
            updateConfig({ ...testConfig, type: TypingTestType.Quote });
          }}
        >
          Quote
        </HeaderActivatableTestConfigButton>
      </HeaderSection>
      {testConfig.type !== TypingTestType.Quote && (
        <HeaderSection>
          {testConfig.type === TypingTestType.Timed
            ? validTypingTestTimeLimits.map((timeLimit) => (
                <HeaderActivatableTestConfigButton
                  isActive={testConfig.timeLimit === timeLimit}
                  onClickActivate={() => {
                    updateConfig({ ...testConfig, timeLimit });
                  }}
                  key={timeLimit}
                >
                  {timeLimit}
                </HeaderActivatableTestConfigButton>
              ))
            : validTypingTestWordLimits.map((wordLimit) => (
                <HeaderActivatableTestConfigButton
                  isActive={testConfig.wordLimit === wordLimit}
                  onClickActivate={() => {
                    updateConfig({ ...testConfig, wordLimit });
                  }}
                  key={wordLimit}
                >
                  {wordLimit}
                </HeaderActivatableTestConfigButton>
              ))}
        </HeaderSection>
      )}
    </>
  );
}

function HeaderProfileItems(): JSX.Element {
  const isNotLoggedIn = useObservable(
    useMemo(
      () =>
        authenticatedUser$.pipe(
          map((authenticatedUser) => authenticatedUser === null),
          distinctUntilChanged(),
        ),
      [],
    ),
    undefined,
    userAuthenticationStatus$.value.authenticatedUser === null,
  );
  return isNotLoggedIn ? (
    <>
      <HeaderAnchorButton toRoute={Route.LogIn}>Login</HeaderAnchorButton>
      <HeaderAnchorButton toRoute={Route.SignUp}>Sign Up</HeaderAnchorButton>
    </>
  ) : (
    <>
      <HeaderAnchorButton toRoute={Route.Account}>Account</HeaderAnchorButton>
    </>
  );
}

export function Header(): JSX.Element {
  return (
    <header className={styles.header}>
      <div className={styles.header__inner}>
        <HeaderSection>
          <HeaderAnchorButton toRoute={Route.LocalType}>YeType</HeaderAnchorButton>
        </HeaderSection>
        <HeaderTestConfigSections />
        <HeaderSection>
          <HeaderProfileItems />
        </HeaderSection>
        <HeaderSection>
          <HeaderThemeButton />
        </HeaderSection>
      </div>
    </header>
  );
}
