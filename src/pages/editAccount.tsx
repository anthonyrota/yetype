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
import { ReauthenticateForm } from '../components/ReauthenticateForm.js';
import { useAuthenticationGuard } from '../hooks/useAuthenticationGuard.js';
import { useTitle } from '../hooks/useTitle.js';
import { AuthenticatedUser, resetAuthenticatedUser, updateUserAuthenticationStatus } from '../persistedState/authenticatedUser.js';
import { Route } from '../routes.js';
import {
  ChangeAccountDetailsRequest,
  ChangeAccountDetailsResponseType,
  changeAccountDetailsEndpoint,
  isValidChangeAccountDetailsResponseJson,
} from '../server/apiEndpoints/changeAccountDetailsIo.js';
import {
  ChangeAccountDetailsVerifyEmailRequest,
  ChangeAccountDetailsVerifyEmailResponseType,
  changeAccountDetailsVerifyEmailEndpoint,
  isValidChangeAccountDetailsVerifyEmailResponseJson,
} from '../server/apiEndpoints/changeAccountDetailsVerifyEmailIo.js';
import {
  ChangeAccountDetailsVerifyRequest,
  ChangeAccountDetailsVerifyResponseType,
  changeAccountDetailsVerifyEndpoint,
  isValidChangeAccountDetailsVerifyResponseJson,
} from '../server/apiEndpoints/changeAccountDetailsVerifyIo.js';
import { getDisplayNameErrorFeedback, getEmailErrorFeedback, getPinErrorFeedback, getUserNameErrorFeedback } from '../server/verification.js';

const enum EditAccountStateType {
  FillingChangeAccountDetails,
  SubmittingChangeAccountDetails,
  FillingChangeAccountDetailsVerify,
  SubmittingChangeAccountDetailsVerify,
  FillingChangeAccountDetailsVerifyEmail,
  SubmittingChangeAccountDetailsVerifyEmail,
}

type FillingChangeAccountDetailsState = {
  type: EditAccountStateType.FillingChangeAccountDetails;
  newUserName: string;
  newDisplayName: string;
  newEmail: string;
  errorMessage: string | null;
};

type SubmittingChangeAccountDetailsState = {
  type: EditAccountStateType.SubmittingChangeAccountDetails;
  newUserName: string;
  newDisplayName: string;
  newEmail: string;
};

type FillingChangeAccountDetailsVerifyState = {
  type: EditAccountStateType.FillingChangeAccountDetailsVerify;
  pendingId: string;
};

type SubmittingChangeAccountDetailsVerifyState = {
  type: EditAccountStateType.SubmittingChangeAccountDetailsVerify;
  pendingId: string;
};

type FillingChangeAccountDetailsVerifyEmailState = {
  type: EditAccountStateType.FillingChangeAccountDetailsVerifyEmail;
  pendingId: string;
  pin: string;
  errorMessage: string | null;
};

type SubmittingChangeAccountDetailsVerifyEmailState = {
  type: EditAccountStateType.SubmittingChangeAccountDetailsVerifyEmail;
  pendingId: string;
  pin: string;
};

type EditAccountState =
  | FillingChangeAccountDetailsState
  | SubmittingChangeAccountDetailsState
  | FillingChangeAccountDetailsVerifyState
  | SubmittingChangeAccountDetailsVerifyState
  | FillingChangeAccountDetailsVerifyEmailState
  | SubmittingChangeAccountDetailsVerifyEmailState;

function EditAccountChangeAccountDetailsForm(props: {
  authenticatedUser: AuthenticatedUser;
  state: FillingChangeAccountDetailsState | SubmittingChangeAccountDetailsState;
  setState: (newState: EditAccountState) => void;
}): JSX.Element {
  const { authenticatedUser, state, setState } = props;
  const { token } = authenticatedUser;
  const { newUserName, newDisplayName, newEmail } = state;
  const isSubmitting = state.type === EditAccountStateType.SubmittingChangeAccountDetails;
  useEffect(() => {
    if (!isSubmitting) {
      return;
    }
    const setErrorMessage = (errorMessage: string): void => {
      setState({
        type: EditAccountStateType.FillingChangeAccountDetails,
        newUserName,
        newDisplayName,
        newEmail,
        errorMessage,
      });
    };
    const bodyJson: ChangeAccountDetailsRequest = {
      userName: newUserName,
      displayName: newDisplayName,
      email: newEmail,
    };
    const subscription = makeApiRequest(changeAccountDetailsEndpoint, {
      isValidResponseJson: isValidChangeAccountDetailsResponseJson,
      body: JSON.stringify(bodyJson),
      token,
    }).subscribe({
      next(responseJson) {
        switch (responseJson.type) {
          case ChangeAccountDetailsResponseType.Fail: {
            setErrorMessage(formErrorMessages.somethingWentWrongErrorMessage);
            break;
          }
          case ChangeAccountDetailsResponseType.NotAuthorized: {
            resetAuthenticatedUser();
            break;
          }
          case ChangeAccountDetailsResponseType.EmailOrUserNameAlreadyInUse: {
            setErrorMessage(formErrorMessages.userNameOrEmailAlreadyTakenErrorMessage);
            break;
          }
          case ChangeAccountDetailsResponseType.Success: {
            const { pendingId } = responseJson;
            setState({
              type: EditAccountStateType.FillingChangeAccountDetailsVerify,
              pendingId,
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
    const errorFeedback = getUserNameErrorFeedback(newUserName) ?? getDisplayNameErrorFeedback(newDisplayName) ?? getEmailErrorFeedback(newEmail);
    if (errorFeedback !== null) {
      const { errorMessage } = errorFeedback;
      setState({ ...state, errorMessage });
      return;
    }
    setState({
      type: EditAccountStateType.SubmittingChangeAccountDetails,
      newUserName,
      newDisplayName,
      newEmail,
    });
  };
  return (
    <Form onSubmit={onSubmit}>
      <FormTitle>Change account details</FormTitle>
      <FormLabelInputPair autoComplete="username" disabled={isSubmitting} value={newUserName} onChange={makeFormInputHandler(state, 'newUserName', setState)}>
        Username
      </FormLabelInputPair>
      <FormLabelInputPair autoComplete="name" disabled={isSubmitting} value={newDisplayName} onChange={makeFormInputHandler(state, 'newDisplayName', setState)}>
        Display Name
      </FormLabelInputPair>
      <FormLabelInputPair
        type="email"
        autoComplete="email"
        disabled={isSubmitting}
        value={newEmail}
        onChange={makeFormInputHandler(state, 'newEmail', setState)}
      >
        Email
      </FormLabelInputPair>
      {!isSubmitting && state.errorMessage !== null && <FormErrorMessage>{state.errorMessage}</FormErrorMessage>}
      <FormSubmitButton disabled={isSubmitting}>Submit Changes</FormSubmitButton>
      <FormNavLink toRoute={Route.Account}>Cancel</FormNavLink>
    </Form>
  );
}

function EditAccountChangeAccountDetailsVerifyForm(props: {
  authenticatedUser: AuthenticatedUser;
  state: FillingChangeAccountDetailsVerifyState | SubmittingChangeAccountDetailsVerifyState;
  setState: (newState: EditAccountState) => void;
}): JSX.Element {
  const { authenticatedUser, state, setState } = props;
  const { token } = authenticatedUser;
  const { pendingId } = state;
  const isSubmitting = state.type === EditAccountStateType.SubmittingChangeAccountDetailsVerify;
  const navigate = useNavigate();
  useEffect(() => {
    if (!isSubmitting) {
      return;
    }
    const bodyJson: ChangeAccountDetailsVerifyRequest = {
      pendingId,
    };
    const subscription = makeApiRequest(changeAccountDetailsVerifyEndpoint, {
      isValidResponseJson: isValidChangeAccountDetailsVerifyResponseJson,
      body: JSON.stringify(bodyJson),
      token,
    }).subscribe({
      next(responseJson) {
        switch (responseJson.type) {
          case ChangeAccountDetailsVerifyResponseType.Fail: {
            // TODO:.
            break;
          }
          case ChangeAccountDetailsVerifyResponseType.NotAuthorized: {
            resetAuthenticatedUser();
            break;
          }
          case ChangeAccountDetailsVerifyResponseType.EmailOrUserNameAlreadyInUse: {
            // TODO:.
            break;
          }
          case ChangeAccountDetailsVerifyResponseType.Success: {
            const { userName, displayName, pendingId: potentialChangeEmailPendingId } = responseJson;
            updateUserAuthenticationStatus({
              isVerified: true,
              authenticatedUser: {
                userId: props.authenticatedUser.userId,
                userName,
                displayName,
                email: props.authenticatedUser.email,
                token,
              },
            });
            if (potentialChangeEmailPendingId === undefined) {
              navigate(Route.Account);
            } else {
              setState({
                type: EditAccountStateType.FillingChangeAccountDetailsVerifyEmail,
                pendingId: potentialChangeEmailPendingId,
                pin: '',
                errorMessage: null,
              });
            }
            break;
          }
        }
      },
      error(_error) {
        // TODO.
      },
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [isSubmitting]);
  return (
    <ReauthenticateForm
      authenticatedUser={authenticatedUser}
      isDisabled={isSubmitting}
      onSuccess={() => {
        setState({
          type: EditAccountStateType.SubmittingChangeAccountDetailsVerify,
          pendingId,
        });
      }}
      goBack={Route.Account}
    />
  );
}

function EditAccountChangeAccountDetailsVerifyEmailForm(props: {
  authenticatedUser: AuthenticatedUser;
  state: FillingChangeAccountDetailsVerifyEmailState | SubmittingChangeAccountDetailsVerifyEmailState;
  setState: (newState: EditAccountState) => void;
}): JSX.Element {
  const { authenticatedUser, state, setState } = props;
  const { token } = authenticatedUser;
  const { pendingId, pin } = state;
  const isSubmitting = state.type === EditAccountStateType.SubmittingChangeAccountDetailsVerifyEmail;
  const navigate = useNavigate();
  useEffect(() => {
    if (!isSubmitting) {
      return;
    }
    const setErrorMessage = (errorMessage: string): void => {
      setState({
        type: EditAccountStateType.FillingChangeAccountDetailsVerifyEmail,
        pendingId,
        pin,
        errorMessage,
      });
    };
    const bodyJson: ChangeAccountDetailsVerifyEmailRequest = {
      pendingId,
      pin,
    };
    const subscription = makeApiRequest(changeAccountDetailsVerifyEmailEndpoint, {
      isValidResponseJson: isValidChangeAccountDetailsVerifyEmailResponseJson,
      body: JSON.stringify(bodyJson),
      token,
    }).subscribe({
      next(responseJson) {
        switch (responseJson.type) {
          case ChangeAccountDetailsVerifyEmailResponseType.Fail: {
            setErrorMessage(formErrorMessages.somethingWentWrongErrorMessage);
            break;
          }
          case ChangeAccountDetailsVerifyEmailResponseType.NotAuthorized: {
            resetAuthenticatedUser();
            break;
          }
          case ChangeAccountDetailsVerifyEmailResponseType.IncorrectDetails: {
            setErrorMessage(formErrorMessages.incorrectPinErrorMessage);
            break;
          }
          case ChangeAccountDetailsVerifyEmailResponseType.CodeExpired: {
            setErrorMessage(formErrorMessages.verificationCodeExpiredErrorMessage);
            break;
          }
          case ChangeAccountDetailsVerifyEmailResponseType.EmailAlreadyInUse: {
            setErrorMessage(formErrorMessages.emailAlreadyTakenErrorMessage);
            break;
          }
          case ChangeAccountDetailsVerifyEmailResponseType.Success: {
            const { userName, displayName, email } = responseJson;
            navigate(Route.Account);
            updateUserAuthenticationStatus({
              isVerified: true,
              authenticatedUser: {
                userId: authenticatedUser.userId,
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
      type: EditAccountStateType.SubmittingChangeAccountDetailsVerifyEmail,
      pendingId,
      pin,
    });
  };
  return (
    <Form onSubmit={onSubmit}>
      <FormTitle>Verify change</FormTitle>
      <FormLabelInputPair autoComplete="one-time-code" disabled={isSubmitting} value={pin} onChange={makeFormInputHandler(state, 'pin', setState)}>
        Verification Pin
      </FormLabelInputPair>
      {!isSubmitting && state.errorMessage !== null && <FormErrorMessage>{state.errorMessage}</FormErrorMessage>}
      <FormSubmitButton disabled={isSubmitting}>Verify New Email</FormSubmitButton>
    </Form>
  );
}

export function EditAccountPage(): JSX.Element | null {
  useTitle('Edit Account Details');
  const authenticatedUser = useAuthenticationGuard();
  const [state, setState] = useState<EditAccountState>({
    type: EditAccountStateType.FillingChangeAccountDetails,
    newUserName: authenticatedUser?.userName ?? '',
    newDisplayName: authenticatedUser?.displayName ?? '',
    newEmail: authenticatedUser?.email ?? '',
    errorMessage: null,
  });
  if (authenticatedUser === null) {
    return null;
  }
  switch (state.type) {
    case EditAccountStateType.FillingChangeAccountDetails:
    case EditAccountStateType.SubmittingChangeAccountDetails: {
      return <EditAccountChangeAccountDetailsForm authenticatedUser={authenticatedUser} state={state} setState={setState} />;
    }
    case EditAccountStateType.FillingChangeAccountDetailsVerify:
    case EditAccountStateType.SubmittingChangeAccountDetailsVerify: {
      return <EditAccountChangeAccountDetailsVerifyForm authenticatedUser={authenticatedUser} state={state} setState={setState} />;
    }
    case EditAccountStateType.FillingChangeAccountDetailsVerifyEmail:
    case EditAccountStateType.SubmittingChangeAccountDetailsVerifyEmail: {
      return <EditAccountChangeAccountDetailsVerifyEmailForm authenticatedUser={authenticatedUser} state={state} setState={setState} />;
    }
  }
}
