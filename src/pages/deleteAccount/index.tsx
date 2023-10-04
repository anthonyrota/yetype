import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { makeApiRequest } from '../../api.js';
import {
  Form,
  FormErrorMessage,
  FormLabelInputPair,
  FormNavLink,
  FormSubmitButton,
  FormTitle,
  InfoData,
  formErrorMessages,
  makeFormInputHandler,
} from '../../components/Form.js';
import { ReauthenticateForm } from '../../components/ReauthenticateForm.js';
import { useAuthenticationGuard } from '../../hooks/useAuthenticationGuard.js';
import { useTitle } from '../../hooks/useTitle.js';
import { AuthenticatedUser, resetAuthenticatedUser } from '../../persistedState/authenticatedUser.js';
import { Route } from '../../routes.js';
import { ChangePasswordVerifyRequest } from '../../server/apiEndpoints/changePasswordVerifyIo.js';
import { DeleteAccountResponseType, deleteAccountEndpoint, isValidDeleteAccountResponseJson } from '../../server/apiEndpoints/deleteAccountIo.js';
import {
  DeleteAccountVerifyResponseType,
  deleteAccountVerifyEndpoint,
  isValidDeleteAccountVerifyResponseJson,
} from '../../server/apiEndpoints/deleteAccountVerifyIo.js';
import { getUserNameErrorFeedback } from '../../server/verification.js';
import styles from './index.module.css';

const enum DeleteAccountStateType {
  FillingDeleteAccount,
  SubmittingDeleteAccount,
  FillingDeleteAccountVerify,
  SubmittingDeleteAccountVerify,
}

type FillingDeleteAccountState = {
  type: DeleteAccountStateType.FillingDeleteAccount;
  userName: string;
  errorMessage: string | null;
};

type SubmittingDeleteAccountState = {
  type: DeleteAccountStateType.SubmittingDeleteAccount;
  userName: string;
};

type FillingDeleteAccountVerifyState = {
  type: DeleteAccountStateType.FillingDeleteAccountVerify;
  pendingId: string;
};

type SubmittingDeleteAccountVerifyState = {
  type: DeleteAccountStateType.SubmittingDeleteAccountVerify;
  pendingId: string;
};

type DeleteAccountState = FillingDeleteAccountState | SubmittingDeleteAccountState | FillingDeleteAccountVerifyState | SubmittingDeleteAccountVerifyState;

const initialDeleteAccountState: DeleteAccountState = {
  type: DeleteAccountStateType.FillingDeleteAccount,
  userName: '',
  errorMessage: null,
};

export function DeleteAccountForm(props: {
  authenticatedUser: AuthenticatedUser;
  state: FillingDeleteAccountState | SubmittingDeleteAccountState;
  setState: (newState: DeleteAccountState) => void;
}): JSX.Element {
  const { authenticatedUser, state, setState } = props;
  const { token } = authenticatedUser;
  const { userName } = state;
  const isSubmitting = state.type === DeleteAccountStateType.SubmittingDeleteAccount;
  useEffect(() => {
    if (!isSubmitting) {
      return;
    }
    const setErrorMessage = (errorMessage: string): void => {
      setState({
        type: DeleteAccountStateType.FillingDeleteAccount,
        userName,
        errorMessage,
      });
    };
    const subscription = makeApiRequest(deleteAccountEndpoint, {
      isValidResponseJson: isValidDeleteAccountResponseJson,
      token,
    }).subscribe({
      next(responseJson) {
        switch (responseJson.type) {
          case DeleteAccountResponseType.Fail: {
            setErrorMessage(formErrorMessages.somethingWentWrongErrorMessage);
            break;
          }
          case DeleteAccountResponseType.NotAuthorized: {
            resetAuthenticatedUser();
            break;
          }
          case DeleteAccountResponseType.Success: {
            const { pendingId } = responseJson;
            setState({
              type: DeleteAccountStateType.FillingDeleteAccountVerify,
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
    const errorFeedback =
      getUserNameErrorFeedback(userName) ??
      (userName === authenticatedUser.userName
        ? null
        : {
            errorMessage: "The username given is not the same as your account's username",
          });
    if (errorFeedback !== null) {
      const { errorMessage } = errorFeedback;
      setState({ ...state, errorMessage });
      return;
    }
    setState({
      type: DeleteAccountStateType.SubmittingDeleteAccount,
      userName,
    });
  };
  return (
    <Form onSubmit={onSubmit}>
      <FormTitle>Delete your account</FormTitle>
      <FormLabelInputPair autoComplete="username" disabled={isSubmitting} value={userName} onChange={makeFormInputHandler(state, 'userName', setState)}>
        Confirm Your Username
      </FormLabelInputPair>
      {!isSubmitting && state.errorMessage !== null && <FormErrorMessage>{state.errorMessage}</FormErrorMessage>}
      <FormSubmitButton disabled={isSubmitting}>Delete Account</FormSubmitButton>
      <InfoData className={styles.info}>Warning: This action is permanent and irreversible!</InfoData>
      <FormNavLink toRoute={Route.Account}>Cancel</FormNavLink>
    </Form>
  );
}

function DeleteAccountVerifyForm(props: {
  authenticatedUser: AuthenticatedUser;
  state: FillingDeleteAccountVerifyState | SubmittingDeleteAccountVerifyState;
  setState: (newState: DeleteAccountState) => void;
}): JSX.Element {
  const { authenticatedUser, state, setState } = props;
  const { token } = authenticatedUser;
  const { pendingId } = state;
  const isSubmitting = state.type === DeleteAccountStateType.SubmittingDeleteAccountVerify;
  const navigate = useNavigate();
  useEffect(() => {
    if (!isSubmitting) {
      return;
    }
    const bodyJson: ChangePasswordVerifyRequest = {
      pendingId,
    };
    const subscription = makeApiRequest(deleteAccountVerifyEndpoint, {
      isValidResponseJson: isValidDeleteAccountVerifyResponseJson,
      body: JSON.stringify(bodyJson),
      token,
    }).subscribe({
      next(responseJson) {
        switch (responseJson.type) {
          case DeleteAccountVerifyResponseType.Fail: {
            // TODO:.
            break;
          }
          case DeleteAccountVerifyResponseType.NotAuthorized: {
            resetAuthenticatedUser();
            break;
          }
          case DeleteAccountVerifyResponseType.Success: {
            navigate(Route.LocalType);
            resetAuthenticatedUser();
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
          type: DeleteAccountStateType.SubmittingDeleteAccountVerify,
          pendingId,
        });
      }}
      goBack={Route.Account}
    />
  );
}

export function DeleteAccountPage(): JSX.Element | null {
  useTitle('Delete Account');
  const authenticatedUser = useAuthenticationGuard();
  const [state, setState] = useState(initialDeleteAccountState);
  if (authenticatedUser === null) {
    return null;
  }
  switch (state.type) {
    case DeleteAccountStateType.FillingDeleteAccount:
    case DeleteAccountStateType.SubmittingDeleteAccount: {
      return <DeleteAccountForm authenticatedUser={authenticatedUser} state={state} setState={setState} />;
    }
    case DeleteAccountStateType.FillingDeleteAccountVerify:
    case DeleteAccountStateType.SubmittingDeleteAccountVerify: {
      return <DeleteAccountVerifyForm authenticatedUser={authenticatedUser} state={state} setState={setState} />;
    }
  }
}
