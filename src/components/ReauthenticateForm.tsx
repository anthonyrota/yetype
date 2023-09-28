import { useEffect, useState } from 'react';
import { makeApiRequest } from '../api.js';
import { AuthenticatedUser, resetAuthenticatedUser, updateUserAuthenticationStatus } from '../persistedState/authenticatedUser.js';
import {
  ReauthenticateRequest,
  ReauthenticateResponseType,
  isValidReauthenticateResponseJson,
  reauthenticateEndpoint,
} from '../server/apiEndpoints/reauthenticateIo.js';
import { getPasswordErrorFeedback } from '../server/verification.js';
import {
  Form,
  FormButtonLink,
  FormErrorMessage,
  FormLabelInputPair,
  FormNavLink,
  FormSubmitButton,
  FormTitle,
  formErrorMessages,
  makeFormInputHandler,
} from './Form.js';

const enum ReauthenticateStateType {
  Filling,
  Submitting,
}

type ReauthenticateState =
  | { type: ReauthenticateStateType.Filling; password: string; errorMessage: string | null }
  | { type: ReauthenticateStateType.Submitting; password: string };

const initialReauthenticateState: ReauthenticateState = {
  type: ReauthenticateStateType.Filling,
  password: '',
  errorMessage: null,
};

export function ReauthenticateForm(props: {
  authenticatedUser: AuthenticatedUser;
  isDisabled: boolean;
  onSuccess: () => void;
  goBack: string | (() => void);
}): JSX.Element {
  const { authenticatedUser, isDisabled, onSuccess, goBack } = props;
  const { token } = authenticatedUser;
  const [state, setState] = useState<ReauthenticateState>(initialReauthenticateState);
  const { password } = state;
  const isSubmitting = state.type === ReauthenticateStateType.Submitting;
  const disableForm = isSubmitting || isDisabled;
  useEffect(() => {
    if (!isSubmitting) {
      return;
    }
    const setErrorMessage = (errorMessage: string): void => {
      setState({
        type: ReauthenticateStateType.Filling,
        password,
        errorMessage,
      });
    };
    const bodyJson: ReauthenticateRequest = {
      password,
    };
    const subscription = makeApiRequest(reauthenticateEndpoint, {
      isValidResponseJson: isValidReauthenticateResponseJson,
      body: JSON.stringify(bodyJson),
      token,
    }).subscribe({
      next(responseJson) {
        switch (responseJson.type) {
          case ReauthenticateResponseType.Fail: {
            setErrorMessage(formErrorMessages.somethingWentWrongErrorMessage);
            break;
          }
          case ReauthenticateResponseType.NotAuthorized: {
            resetAuthenticatedUser();
            break;
          }
          case ReauthenticateResponseType.IncorrectDetails: {
            setErrorMessage(formErrorMessages.incorrectPasswordErrorMessage);
            break;
          }
          case ReauthenticateResponseType.Success: {
            const { userName, displayName, email, token } = responseJson;
            updateUserAuthenticationStatus({
              isVerified: true,
              authenticatedUser: {
                userId: props.authenticatedUser.userId,
                userName,
                displayName,
                email,
                token,
              },
            });
            onSuccess();
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
  const onSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (disableForm) {
      return;
    }
    const errorFeedback = getPasswordErrorFeedback(password);
    if (errorFeedback !== null) {
      const { errorMessage } = errorFeedback;
      setState({ ...state, errorMessage });
      return;
    }
    setState({
      type: ReauthenticateStateType.Submitting,
      password,
    });
  };
  return (
    <Form onSubmit={onSubmit}>
      <FormTitle>Login to confirm</FormTitle>
      <FormLabelInputPair
        type="password"
        autoComplete="current-password"
        disabled={disableForm}
        value={password}
        onChange={makeFormInputHandler(state, 'password', setState)}
      >
        Password
      </FormLabelInputPair>
      {!isSubmitting && state.errorMessage !== null && <FormErrorMessage>{state.errorMessage}</FormErrorMessage>}
      <FormSubmitButton disabled={disableForm}>Authenticate</FormSubmitButton>
      {typeof goBack === 'string' ? <FormNavLink toRoute={goBack}>Cancel</FormNavLink> : <FormButtonLink onClick={goBack}>Cancel</FormButtonLink>}
    </Form>
  );
}
