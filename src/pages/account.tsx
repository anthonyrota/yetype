import { makeApiRequest } from '../api.js';
import { InfoButtonLink, InfoContainer, InfoData, InfoNavButton, InfoNavLink, InfoTitle } from '../components/Form.js';
import { useAuthenticationGuard } from '../hooks/useAuthenticationGuard.js';
import { useTitle } from '../hooks/useTitle.js';
import { resetAuthenticatedUser } from '../persistedState/authenticatedUser.js';
import { Route } from '../routes.js';
import { isValidLogOutResponseJson, logOutEndpoint } from '../server/apiEndpoints/logOutIo.js';

export function AccountPage(): JSX.Element | null {
  useTitle('Account');
  const authenticatedUser = useAuthenticationGuard();
  if (authenticatedUser === null) {
    return null;
  }
  const { token } = authenticatedUser;
  function logOut(): void {
    makeApiRequest(logOutEndpoint, {
      isValidResponseJson: isValidLogOutResponseJson,
      token,
    }).subscribe({
      complete() {
        resetAuthenticatedUser();
      },
    });
  }
  const { userName, displayName, email } = authenticatedUser;
  return (
    <InfoContainer>
      <InfoTitle>Account Details</InfoTitle>
      <InfoData label="Username">{userName}</InfoData>
      <InfoData label="Display Name">{displayName}</InfoData>
      <InfoData label="Email">{email}</InfoData>
      <InfoNavButton toRoute={Route.EditAccount}>Edit Account Details</InfoNavButton>
      <InfoNavLink toRoute={Route.Stats}>See your stats</InfoNavLink>
      <InfoNavLink toRoute={Route.EditPassword}>Change your password</InfoNavLink>
      <InfoButtonLink onClick={logOut}>Logout</InfoButtonLink>
      <InfoNavLink toRoute={Route.DeleteAccount}>Delete your account</InfoNavLink>
    </InfoContainer>
  );
}
