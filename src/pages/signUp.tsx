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
import { SignUpRequest, SignUpResponseType, isValidSignUpResponseJson, signUpEndpoint } from '../server/apiEndpoints/signUpIo.js';
import { SignUpVerifyRequest, SignUpVerifyResponseType, isValidSignUpVerifyResponseJson, signUpVerifyEndpoint } from '../server/apiEndpoints/signUpVerifyIo.js';
import {
  getDisplayNameErrorFeedback,
  getEmailErrorFeedback,
  getPasswordErrorFeedback,
  getPinErrorFeedback,
  getUserNameErrorFeedback,
} from '../server/verification.js';

const enum SignUpPageStateType {
  FillingSignUpForm,
  SubmittingSignUpForm,
  FillingSignUpVerifyForm,
  SubmittingSignUpVerifyForm,
}

type FillingSignUpFormState = {
  type: SignUpPageStateType.FillingSignUpForm;
  userName: string;
  displayName: string;
  email: string;
  password: string;
  errorMessage: string | null;
};

type SubmittingSignUpForm = {
  type: SignUpPageStateType.SubmittingSignUpForm;
  userName: string;
  displayName: string;
  email: string;
  password: string;
};

type FillingSignUpVerifyFormState = {
  type: SignUpPageStateType.FillingSignUpVerifyForm;
  pendingId: string;
  pin: string;
  errorMessage: string | null;
};

type SubmittingSignUpVerifyForm = {
  type: SignUpPageStateType.SubmittingSignUpVerifyForm;
  pendingId: string;
  pin: string;
};

type SignUpPageState = FillingSignUpFormState | SubmittingSignUpForm | FillingSignUpVerifyFormState | SubmittingSignUpVerifyForm;

const initialSignUpPageState: SignUpPageState = {
  type: SignUpPageStateType.FillingSignUpForm,
  userName: '',
  displayName: '',
  email: '',
  password: '',
  errorMessage: null,
};

function SignUpPageInitialForm(props: { state: FillingSignUpFormState | SubmittingSignUpForm; setState: (newState: SignUpPageState) => void }): JSX.Element {
  const { state, setState } = props;
  const { userName, displayName, email, password } = state;
  const isSubmitting = state.type === SignUpPageStateType.SubmittingSignUpForm;
  useEffect(() => {
    if (!isSubmitting) {
      return;
    }
    const setErrorMessage = (errorMessage: string): void => {
      setState({
        type: SignUpPageStateType.FillingSignUpForm,
        userName,
        displayName,
        email,
        password,
        errorMessage,
      });
    };
    const bodyJson: SignUpRequest = {
      userName,
      displayName,
      email,
      password,
    };
    const subscription = makeApiRequest(signUpEndpoint, {
      isValidResponseJson: isValidSignUpResponseJson,
      body: JSON.stringify(bodyJson),
      ignoreAuthenticationChange: true,
    }).subscribe({
      next(responseJson) {
        switch (responseJson.type) {
          case SignUpResponseType.Fail: {
            setErrorMessage(formErrorMessages.somethingWentWrongErrorMessage);
            break;
          }
          case SignUpResponseType.EmailOrUserNameAlreadyInUse: {
            setErrorMessage(formErrorMessages.userNameOrEmailAlreadyTakenErrorMessage);
            break;
          }
          case SignUpResponseType.Success: {
            const { pendingId } = responseJson;
            setState({
              type: SignUpPageStateType.FillingSignUpVerifyForm,
              pendingId,
              pin: '',
              errorMessage: null,
            });
            break;
          }
        }
      },
      error(_error) {
        setErrorMessage(formErrorMessages.somethingWentWrongErrorMessage);
      },
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [isSubmitting]);
  const onSubmit = (e: React.ChangeEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (isSubmitting) {
      return;
    }
    const errorFeedback =
      getUserNameErrorFeedback(userName) ?? getDisplayNameErrorFeedback(displayName) ?? getEmailErrorFeedback(email) ?? getPasswordErrorFeedback(password);
    if (errorFeedback !== null) {
      const { errorMessage } = errorFeedback;
      setState({ ...state, errorMessage });
      return;
    }
    setState({
      type: SignUpPageStateType.SubmittingSignUpForm,
      userName,
      displayName,
      email,
      password,
    });
  };
  return (
    <Form onSubmit={onSubmit}>
      <FormTitle>Create an account</FormTitle>
      <FormLabelInputPair autoComplete="username" disabled={isSubmitting} value={userName} onChange={makeFormInputHandler(state, 'userName', setState)}>
        Username
      </FormLabelInputPair>
      <FormLabelInputPair autoComplete="name" disabled={isSubmitting} value={displayName} onChange={makeFormInputHandler(state, 'displayName', setState)}>
        Display Name
      </FormLabelInputPair>
      <FormLabelInputPair type="email" autoComplete="email" disabled={isSubmitting} value={email} onChange={makeFormInputHandler(state, 'email', setState)}>
        Email
      </FormLabelInputPair>
      <FormLabelInputPair
        type="password"
        autoComplete="new-password"
        disabled={isSubmitting}
        value={password}
        onChange={makeFormInputHandler(state, 'password', setState)}
      >
        Password
      </FormLabelInputPair>
      {!isSubmitting && state.errorMessage !== null && <FormErrorMessage>{state.errorMessage}</FormErrorMessage>}
      <FormSubmitButton disabled={isSubmitting}>Sign Up</FormSubmitButton>
      <FormNavLink toRoute={Route.LogIn}>Already have an account? Login instead</FormNavLink>
    </Form>
  );
}

function SignUpPageVerifyForm(props: {
  state: FillingSignUpVerifyFormState | SubmittingSignUpVerifyForm;
  setState: (newState: SignUpPageState) => void;
}): JSX.Element {
  const { state, setState } = props;
  const { pendingId, pin } = state;
  const isSubmitting = state.type === SignUpPageStateType.SubmittingSignUpVerifyForm;
  const navigate = useNavigate();
  useEffect(() => {
    if (!isSubmitting) {
      return;
    }
    const setErrorMessage = (errorMessage: string): void => {
      setState({
        type: SignUpPageStateType.FillingSignUpVerifyForm,
        pendingId,
        pin,
        errorMessage,
      });
    };
    const bodyJson: SignUpVerifyRequest = {
      pendingId,
      pin,
    };
    const subscription = makeApiRequest(signUpVerifyEndpoint, {
      isValidResponseJson: isValidSignUpVerifyResponseJson,
      body: JSON.stringify(bodyJson),
      ignoreAuthenticationChange: true,
    }).subscribe({
      next(responseJson) {
        switch (responseJson.type) {
          case SignUpVerifyResponseType.Fail: {
            setErrorMessage(formErrorMessages.somethingWentWrongErrorMessage);
            break;
          }
          case SignUpVerifyResponseType.IncorrectDetails: {
            setErrorMessage(formErrorMessages.incorrectPinErrorMessage);
            break;
          }
          case SignUpVerifyResponseType.CodeExpired: {
            setErrorMessage(formErrorMessages.verificationCodeExpiredErrorMessage);
            break;
          }
          case SignUpVerifyResponseType.EmailOrUserNameAlreadyInUse: {
            setErrorMessage(formErrorMessages.userNameOrEmailAlreadyTakenErrorMessage);
            break;
          }
          case SignUpVerifyResponseType.Success: {
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
        setErrorMessage(formErrorMessages.somethingWentWrongErrorMessage);
      },
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [isSubmitting]);
  const onSubmit = (e: React.ChangeEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (isSubmitting) {
      return;
    }
    const errorFeedback = getPinErrorFeedback(pin);
    if (errorFeedback !== null) {
      const { errorMessage } = errorFeedback;
      setState({ ...state, errorMessage });
      return;
    }
    setState({
      type: SignUpPageStateType.SubmittingSignUpVerifyForm,
      pendingId,
      pin,
    });
  };
  return (
    <Form onSubmit={onSubmit}>
      <FormTitle>Verify sign up email</FormTitle>
      <FormLabelInputPair autoComplete="one-time-code" disabled={isSubmitting} value={pin} onChange={makeFormInputHandler(state, 'pin', setState)}>
        Verification Pin
      </FormLabelInputPair>
      {!isSubmitting && state.errorMessage !== null && <FormErrorMessage>{state.errorMessage}</FormErrorMessage>}
      <FormSubmitButton disabled={isSubmitting}>Verify Email</FormSubmitButton>
    </Form>
  );
}

export function SignUpPage(): JSX.Element {
  useTitle('Sign Up');
  const [state, setState] = useState(initialSignUpPageState);
  switch (state.type) {
    case SignUpPageStateType.FillingSignUpForm:
    case SignUpPageStateType.SubmittingSignUpForm: {
      return <SignUpPageInitialForm state={state} setState={setState} />;
    }
    case SignUpPageStateType.FillingSignUpVerifyForm:
    case SignUpPageStateType.SubmittingSignUpVerifyForm: {
      return <SignUpPageVerifyForm state={state} setState={setState} />;
    }
  }
}
