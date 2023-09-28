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
import { AuthenticatedUser, resetAuthenticatedUser } from '../persistedState/authenticatedUser.js';
import { Route } from '../routes.js';
import {
  ChangePasswordRequest,
  ChangePasswordResponseType,
  changePasswordEndpoint,
  isValidChangePasswordResponseJson,
} from '../server/apiEndpoints/changePasswordIo.js';
import {
  ChangePasswordVerifyRequest,
  ChangePasswordVerifyResponseType,
  changePasswordVerifyEndpoint,
  isValidChangePasswordVerifyResponseJson,
} from '../server/apiEndpoints/changePasswordVerifyIo.js';
import { getPasswordErrorFeedback } from '../server/verification.js';

const enum EditPasswordStateType {
  FillingChangePassword,
  SubmittingChangePassword,
  FillingChangePasswordVerify,
  SubmittingChangePasswordVerify,
}

type FillingChangePasswordState = {
  type: EditPasswordStateType.FillingChangePassword;
  newPassword: string;
  errorMessage: string | null;
};

type SubmittingChangePasswordState = {
  type: EditPasswordStateType.SubmittingChangePassword;
  newPassword: string;
};

type FillingChangePasswordVerifyState = {
  type: EditPasswordStateType.FillingChangePasswordVerify;
  pendingId: string;
};

type SubmittingChangePasswordVerifyState = {
  type: EditPasswordStateType.SubmittingChangePasswordVerify;
  pendingId: string;
};

type EditPasswordState = FillingChangePasswordState | SubmittingChangePasswordState | FillingChangePasswordVerifyState | SubmittingChangePasswordVerifyState;

const initialEditPasswordState: EditPasswordState = {
  type: EditPasswordStateType.FillingChangePassword,
  newPassword: '',
  errorMessage: null,
};

function EditPasswordChangePasswordForm(props: {
  authenticatedUser: AuthenticatedUser;
  state: FillingChangePasswordState | SubmittingChangePasswordState;
  setState: (newState: EditPasswordState) => void;
}): JSX.Element {
  const { authenticatedUser, state, setState } = props;
  const { token } = authenticatedUser;
  const { newPassword } = state;
  const isSubmitting = state.type === EditPasswordStateType.SubmittingChangePassword;
  useEffect(() => {
    if (!isSubmitting) {
      return;
    }
    const setErrorMessage = (errorMessage: string): void => {
      setState({
        type: EditPasswordStateType.FillingChangePassword,
        newPassword,
        errorMessage,
      });
    };
    const bodyJson: ChangePasswordRequest = {
      newPassword,
    };
    const subscription = makeApiRequest(changePasswordEndpoint, {
      isValidResponseJson: isValidChangePasswordResponseJson,
      body: JSON.stringify(bodyJson),
      token,
    }).subscribe({
      next(responseJson) {
        switch (responseJson.type) {
          case ChangePasswordResponseType.Fail: {
            setErrorMessage(formErrorMessages.somethingWentWrongErrorMessage);
            break;
          }
          case ChangePasswordResponseType.NotAuthorized: {
            resetAuthenticatedUser();
            break;
          }
          case ChangePasswordResponseType.Success: {
            const { pendingId } = responseJson;
            setState({
              type: EditPasswordStateType.FillingChangePasswordVerify,
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
    return () => subscription.unsubscribe();
  }, [isSubmitting]);
  const onSubmit = (e: React.ChangeEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (isSubmitting) {
      return;
    }
    const errorFeedback = getPasswordErrorFeedback(newPassword);
    if (errorFeedback !== null) {
      const { errorMessage } = errorFeedback;
      setState({ ...state, errorMessage });
      return;
    }
    setState({
      type: EditPasswordStateType.SubmittingChangePassword,
      newPassword,
    });
  };
  return (
    <Form onSubmit={onSubmit}>
      <FormTitle>Change your password</FormTitle>
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
      <FormSubmitButton disabled={isSubmitting}>Submit Change</FormSubmitButton>
      <FormNavLink toRoute={Route.Account}>Cancel</FormNavLink>
    </Form>
  );
}

function EditPasswordChangePasswordVerifyForm(props: {
  authenticatedUser: AuthenticatedUser;
  state: FillingChangePasswordVerifyState | SubmittingChangePasswordVerifyState;
  setState: (newState: EditPasswordState) => void;
}): JSX.Element {
  const { authenticatedUser, state, setState } = props;
  const { token } = authenticatedUser;
  const { pendingId } = state;
  const isSubmitting = state.type === EditPasswordStateType.SubmittingChangePasswordVerify;
  const navigate = useNavigate();
  useEffect(() => {
    if (!isSubmitting) {
      return;
    }
    const bodyJson: ChangePasswordVerifyRequest = {
      pendingId,
    };
    const subscription = makeApiRequest(changePasswordVerifyEndpoint, {
      isValidResponseJson: isValidChangePasswordVerifyResponseJson,
      body: JSON.stringify(bodyJson),
      token,
    }).subscribe({
      next(responseJson) {
        switch (responseJson.type) {
          case ChangePasswordVerifyResponseType.Fail: {
            // TODO:.
            break;
          }
          case ChangePasswordVerifyResponseType.NotAuthorized: {
            resetAuthenticatedUser();
            break;
          }
          case ChangePasswordVerifyResponseType.Success: {
            navigate(Route.Account);
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
          type: EditPasswordStateType.SubmittingChangePasswordVerify,
          pendingId,
        });
      }}
      goBack={Route.Account}
    />
  );
}

export function EditPasswordPage(): JSX.Element | null {
  useTitle('Edit Password');
  const authenticatedUser = useAuthenticationGuard();
  const [state, setState] = useState(initialEditPasswordState);
  if (authenticatedUser === null) {
    return null;
  }
  switch (state.type) {
    case EditPasswordStateType.FillingChangePassword:
    case EditPasswordStateType.SubmittingChangePassword: {
      return <EditPasswordChangePasswordForm authenticatedUser={authenticatedUser} state={state} setState={setState} />;
    }
    case EditPasswordStateType.FillingChangePasswordVerify:
    case EditPasswordStateType.SubmittingChangePasswordVerify: {
      return <EditPasswordChangePasswordVerifyForm authenticatedUser={authenticatedUser} state={state} setState={setState} />;
    }
  }
}
