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
import { Route } from '../routes.js';
import {
  ForgotPasswordRequest,
  ForgotPasswordResponseType,
  forgotPasswordEndpoint,
  isValidForgotPasswordResponseJson,
} from '../server/apiEndpoints/forgotPasswordIo.js';
import {
  ForgotPasswordVerifyRequest,
  ForgotPasswordVerifyResponseType,
  forgotPasswordVerifyEndpoint,
  isValidForgotPasswordVerifyResponseJson,
} from '../server/apiEndpoints/forgotPasswordVerifyIo.js';
import { getEmailErrorFeedback, getPasswordErrorFeedback, getPinErrorFeedback } from '../server/verification.js';

const enum ForgotPasswordStateType {
  FillingForgotPasswordForm,
  SubmittingForgotPasswordForm,
  FillingForgotPasswordVerifyForm,
  SubmittingForgotPasswordVerifyForm,
}

type FillingForgotPasswordFormState = {
  type: ForgotPasswordStateType.FillingForgotPasswordForm;
  email: string;
  newPassword: string;
  errorMessage: string | null;
};

type SubmittingForgotPasswordFormState = {
  type: ForgotPasswordStateType.SubmittingForgotPasswordForm;
  email: string;
  newPassword: string;
};

type FillingForgotPasswordVerifyFormState = {
  type: ForgotPasswordStateType.FillingForgotPasswordVerifyForm;
  pendingId: string;
  pin: string;
  errorMessage: string | null;
};

type SubmittingForgotPasswordVerifyFormState = {
  type: ForgotPasswordStateType.SubmittingForgotPasswordVerifyForm;
  pendingId: string;
  pin: string;
};

type ForgotPasswordState =
  | FillingForgotPasswordFormState
  | SubmittingForgotPasswordFormState
  | FillingForgotPasswordVerifyFormState
  | SubmittingForgotPasswordVerifyFormState;

const initialForgotPasswordState: ForgotPasswordState = {
  type: ForgotPasswordStateType.FillingForgotPasswordForm,
  email: '',
  newPassword: '',
  errorMessage: null,
};

function ForgotPasswordForm(props: {
  state: FillingForgotPasswordFormState | SubmittingForgotPasswordFormState;
  setState: (newState: ForgotPasswordState) => void;
}): JSX.Element {
  const { state, setState } = props;
  const { email, newPassword } = state;
  const isSubmitting = state.type === ForgotPasswordStateType.SubmittingForgotPasswordForm;
  useEffect(() => {
    if (!isSubmitting) {
      return;
    }
    const setErrorMessage = (errorMessage: string): void => {
      setState({
        type: ForgotPasswordStateType.FillingForgotPasswordForm,
        email,
        newPassword,
        errorMessage,
      });
    };
    const bodyJson: ForgotPasswordRequest = {
      email,
      newPassword,
    };
    const subscription = makeApiRequest(forgotPasswordEndpoint, {
      isValidResponseJson: isValidForgotPasswordResponseJson,
      body: JSON.stringify(bodyJson),
      ignoreAuthenticationChange: true,
    }).subscribe({
      next(responseJson) {
        switch (responseJson.type) {
          case ForgotPasswordResponseType.Fail: {
            setErrorMessage(formErrorMessages.somethingWentWrongErrorMessage);
            break;
          }
          case ForgotPasswordResponseType.EmailNotRegistered: {
            setErrorMessage(formErrorMessages.emailNotRegisteredErrorMessage);
            break;
          }
          case ForgotPasswordResponseType.Success: {
            const { pendingId } = responseJson;
            setState({
              type: ForgotPasswordStateType.FillingForgotPasswordVerifyForm,
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
    return () => subscription.unsubscribe();
  }, [isSubmitting]);
  const onSubmit = (e: React.ChangeEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (isSubmitting) {
      return;
    }
    const errorFeedback = getEmailErrorFeedback(email) ?? getPasswordErrorFeedback(newPassword);
    if (errorFeedback !== null) {
      const { errorMessage } = errorFeedback;
      setState({ ...state, errorMessage });
      return;
    }
    setState({
      type: ForgotPasswordStateType.SubmittingForgotPasswordForm,
      email,
      newPassword,
    });
  };
  return (
    <Form onSubmit={onSubmit}>
      <FormTitle>Reset Password</FormTitle>
      <FormLabelInputPair type="email" autoComplete="email" disabled={isSubmitting} value={email} onChange={makeFormInputHandler(state, 'email', setState)}>
        Email
      </FormLabelInputPair>
      <FormLabelInputPair
        type="password"
        autoComplete="new-password"
        disabled={isSubmitting}
        value={newPassword}
        onChange={makeFormInputHandler(state, 'newPassword', setState)}
      >
        New Password
      </FormLabelInputPair>
      {!isSubmitting && state.errorMessage !== null && <FormErrorMessage>{state.errorMessage}</FormErrorMessage>}
      <FormSubmitButton disabled={isSubmitting}>Send Verification Email</FormSubmitButton>
      <FormNavLink toRoute={Route.LogIn}>I remember my password. Let me login</FormNavLink>
      <FormNavLink toRoute={Route.SignUp}>I don't have an account. Let me sign up</FormNavLink>
    </Form>
  );
}

function ForgotPasswordVerifyForm(props: {
  state: FillingForgotPasswordVerifyFormState | SubmittingForgotPasswordVerifyFormState;
  setState: (newState: ForgotPasswordState) => void;
}): JSX.Element {
  const { state, setState } = props;
  const { pendingId, pin } = state;
  const isSubmitting = state.type === ForgotPasswordStateType.SubmittingForgotPasswordVerifyForm;
  const navigate = useNavigate();
  useEffect(() => {
    if (!isSubmitting) {
      return;
    }
    const setErrorMessage = (errorMessage: string): void => {
      setState({
        type: ForgotPasswordStateType.FillingForgotPasswordVerifyForm,
        pendingId,
        pin,
        errorMessage,
      });
    };
    const bodyJson: ForgotPasswordVerifyRequest = {
      pendingId,
      pin,
    };
    const subscription = makeApiRequest(forgotPasswordVerifyEndpoint, {
      isValidResponseJson: isValidForgotPasswordVerifyResponseJson,
      body: JSON.stringify(bodyJson),
      ignoreAuthenticationChange: true,
    }).subscribe({
      next(responseJson) {
        switch (responseJson.type) {
          case ForgotPasswordVerifyResponseType.Fail: {
            setErrorMessage(formErrorMessages.somethingWentWrongErrorMessage);
            break;
          }
          case ForgotPasswordVerifyResponseType.IncorrectDetails: {
            setErrorMessage(formErrorMessages.incorrectPinErrorMessage);
            break;
          }
          case ForgotPasswordVerifyResponseType.CodeExpired: {
            setErrorMessage(formErrorMessages.verificationCodeExpiredErrorMessage);
            break;
          }
          case ForgotPasswordVerifyResponseType.Success: {
            navigate(Route.LogIn);
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
      type: ForgotPasswordStateType.SubmittingForgotPasswordVerifyForm,
      pendingId,
      pin,
    });
  };
  return (
    <Form onSubmit={onSubmit}>
      <FormTitle>Verify Password Reset</FormTitle>
      <FormLabelInputPair autoComplete="one-time-code" disabled={isSubmitting} value={pin} onChange={makeFormInputHandler(state, 'pin', setState)}>
        Verification Pin
      </FormLabelInputPair>
      {!isSubmitting && state.errorMessage !== null && <FormErrorMessage>{state.errorMessage}</FormErrorMessage>}
      <FormSubmitButton disabled={isSubmitting}>Change Password</FormSubmitButton>
    </Form>
  );
}

export function ForgotPasswordPage(): JSX.Element {
  useTitle('Forgot Password');
  const [state, setState] = useState(initialForgotPasswordState);
  switch (state.type) {
    case ForgotPasswordStateType.FillingForgotPasswordForm:
    case ForgotPasswordStateType.SubmittingForgotPasswordForm: {
      return <ForgotPasswordForm state={state} setState={setState} />;
    }
    case ForgotPasswordStateType.FillingForgotPasswordVerifyForm:
    case ForgotPasswordStateType.SubmittingForgotPasswordVerifyForm: {
      return <ForgotPasswordVerifyForm state={state} setState={setState} />;
    }
  }
}
