import { createRoot } from 'react-dom/client';
import { Outlet, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Header } from './components/Header.js';
import { useObservable } from './hooks/useObservable.js';
import styles from './index.module.css';
import { AccountPage } from './pages/account.js';
import { DeleteAccountPage } from './pages/deleteAccount/index.js';
import { EditAccountPage } from './pages/editAccount.js';
import { EditPasswordPage } from './pages/editPassword.js';
import { ForgotPasswordPage } from './pages/forgotPassword.js';
import { HistoryPage } from './pages/history/index.js';
import { LocalTypePage } from './pages/localType/index.js';
import { LogInPage } from './pages/logIn.js';
import { NotFoundPage } from './pages/notFound.js';
import { SignUpPage } from './pages/signUp.js';
import { verifyAuthenticatedUser } from './persistedState/authenticatedUser.js';
import { Theme, theme$ } from './persistedState/theme.js';
import { Route } from './routes.js';
import './global.css';

verifyAuthenticatedUser();

function RootThemeContainer(props: { children?: React.ReactNode }): JSX.Element {
  const theme = useObservable(theme$);
  return <div className={`${styles.page} ${theme === Theme.Light ? styles['page--light'] : styles['page--dark']}`}>{props.children}</div>;
}

function Page(props: { children?: React.ReactNode }): JSX.Element {
  return (
    <main className={styles['page-main']}>
      <div className={styles['page-main__inner']}>{props.children}</div>
    </main>
  );
}

function Root(): JSX.Element {
  return (
    <RootThemeContainer>
      <Header />
      <Page>
        <Outlet />
      </Page>
    </RootThemeContainer>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    children: [
      {
        index: true,
        caseSensitive: true,
        element: <LocalTypePage />,
      },
      {
        path: Route.SignUp.slice(1),
        caseSensitive: true,
        element: <SignUpPage />,
      },
      {
        path: Route.LogIn.slice(1),
        caseSensitive: true,
        element: <LogInPage />,
      },
      {
        path: Route.ForgotPassword.slice(1),
        caseSensitive: true,
        element: <ForgotPasswordPage />,
      },
      {
        path: Route.Account.slice(1),
        caseSensitive: true,
        element: <AccountPage />,
      },
      {
        path: Route.EditAccount.slice(1),
        caseSensitive: true,
        element: <EditAccountPage />,
      },
      {
        path: Route.EditPassword.slice(1),
        caseSensitive: true,
        element: <EditPasswordPage />,
      },
      {
        path: Route.DeleteAccount.slice(1),
        caseSensitive: true,
        element: <DeleteAccountPage />,
      },
      {
        path: Route.History.slice(1),
        caseSensitive: true,
        element: <HistoryPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);

const appContainerElement = document.createElement('div');
appContainerElement.classList.add(styles['page-container']);
document.body.appendChild(appContainerElement);
createRoot(appContainerElement).render(<RouterProvider router={router} />);
