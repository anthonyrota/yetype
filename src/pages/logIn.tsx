import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { makeApiRequest } from '../api.js';
import {
  Form,
  FormErrorMessage,
  FormLabelInputPair,
  FormNavLink,
  FormSubmitButton,
  FormTitle,
  formErrorMessages,
  makeFormInputHandler,
} from '../components/Form.js';
import { useTitle } from '../hooks/useTitle.js';
import { updateUserAuthenticationStatus } from '../persistedState/authenticatedUser.js';
import { Route } from '../routes.js';
import { LogInRequest, LogInResponseType, isValidLogInResponseJson, logInEndpoint } from '../server/apiEndpoints/logInIo.js';
import { getPasswordErrorFeedback, getUserNameOrEmailErrorFeedback } from '../server/verification.js';

const enum LogInPageStateType {
  FillingLogInForm,
  SubmittingLogInForm,
}

type FillingLogInFormState = {
  type: LogInPageStateType.FillingLogInForm;
  userNameOrEmail: string;
  password: string;
  errorMessage: string | null;
};

type SubmittingLogInFormState = {
  type: LogInPageStateType.SubmittingLogInForm;
  userNameOrEmail: string;
  password: string;
};

type LogInPageState = FillingLogInFormState | SubmittingLogInFormState;

const initialLogInPageState: LogInPageState = {
  type: LogInPageStateType.FillingLogInForm,
  userNameOrEmail: '',
  password: '',
  errorMessage: null,
};

function LogInPageInitialForm(props: { state: FillingLogInFormState | SubmittingLogInFormState; setState: (newState: LogInPageState) => void }): JSX.Element {
  const { state, setState } = props;
  const { userNameOrEmail, password } = state;
  const isSubmitting = state.type === LogInPageStateType.SubmittingLogInForm;
  const navigate = useNavigate();
  useEffect(() => {
    if (!isSubmitting) {
      return;
    }
    const setErrorMessage = (errorMessage: string): void => {
      setState({
        type: LogInPageStateType.FillingLogInForm,
        userNameOrEmail,
        password,
        errorMessage,
      });
    };
    const bodyJson: LogInRequest = {
      userNameOrEmail,
      password,
    };
    let didHandle = false;
    const subscription = makeApiRequest(logInEndpoint, {
      isValidResponseJson: isValidLogInResponseJson,
      body: JSON.stringify(bodyJson),
    }).subscribe({
      next(responseJson) {
        didHandle = true;
        switch (responseJson.type) {
          case LogInResponseType.Fail: {
            setErrorMessage(formErrorMessages.somethingWentWrongErrorMessage);
            break;
          }
          case LogInResponseType.IncorrectDetails: {
            setErrorMessage(formErrorMessages.incorrectDetailsErrorMessage);
            break;
          }
          case LogInResponseType.Success: {
            const { userId, userName, displayName, email, token } = responseJson;
            navigate(Route.LocalType);
            updateUserAuthenticationStatus({
              isVerified: true,
              authenticatedUser: {
                userId,
                userName,
                displayName,
                email,
                token,
              },
            });
            break;
          }
        }
      },
      error(_error) {
        didHandle = true;
        setErrorMessage(formErrorMessages.somethingWentWrongErrorMessage);
      },
      complete() {
        if (!didHandle) {
          // Request canceled because authentication changed, but this shouldn't be reached in practice.
          setErrorMessage(formErrorMessages.somethingWentWrongErrorMessage);
        }
      },
    });
    return () => subscription.unsubscribe();
  }, [isSubmitting]);
  const onSubmit = (e: React.ChangeEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (isSubmitting) {
      return;
    }
    const errorFeedback = getUserNameOrEmailErrorFeedback(userNameOrEmail) ?? getPasswordErrorFeedback(password);
    if (errorFeedback !== null) {
      const { errorMessage } = errorFeedback;
      setState({ ...state, errorMessage });
      return;
    }
    setState({
      type: LogInPageStateType.SubmittingLogInForm,
      userNameOrEmail,
      password,
    });
  };
  return (
    <Form onSubmit={onSubmit}>
      <FormTitle>Login to your account</FormTitle>
      <FormLabelInputPair disabled={isSubmitting} value={userNameOrEmail} onChange={makeFormInputHandler(state, 'userNameOrEmail', setState)}>
        Username or Email
      </FormLabelInputPair>
      <FormLabelInputPair
        type="password"
        autoComplete="current-password"
        disabled={isSubmitting}
        value={password}
        onChange={makeFormInputHandler(state, 'password', setState)}
      >
        Password
      </FormLabelInputPair>
      {!isSubmitting && state.errorMessage !== null && <FormErrorMessage>{state.errorMessage}</FormErrorMessage>}
      <FormSubmitButton disabled={isSubmitting}>Login</FormSubmitButton>
      <FormNavLink toRoute={Route.ForgotPassword}>Forgot your password?</FormNavLink>
      <FormNavLink toRoute={Route.SignUp}>Don't have an account? Sign up instead</FormNavLink>
    </Form>
  );
}

export function LogInPage(): JSX.Element {
  useTitle('Login');
  const [state, setState] = useState(initialLogInPageState);
  return <LogInPageInitialForm state={state} setState={setState} />;
}
