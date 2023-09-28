import { BehaviorSubject, distinctUntilChanged, map } from 'rxjs';
import { makeApiRequest } from '../api.js';
import { VerifyAuthResponseType, isValidVerifyAuthResponseJson, verifyAuthEndpoint } from '../server/apiEndpoints/verifyAuthIo.js';
import { isValidDisplayName, isValidEmail, isValidToken, isValidUserName, isValidUuid } from '../server/verification.js';
import { authenticationTokenStorageKey } from './storageKeys.js';

export type AuthenticatedUser = {
  userId: string;
  userName: string;
  displayName: string;
  email: string;
  token: string;
};

function isValidAuthenticatedUser(value: unknown): value is AuthenticatedUser {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { userId, userName, displayName, email, token } = value as { userId: unknown; userName: unknown; displayName: unknown; email: unknown; token: unknown };
  return (
    typeof userId === 'string' &&
    typeof userName === 'string' &&
    typeof displayName === 'string' &&
    typeof email === 'string' &&
    typeof token === 'string' &&
    isValidUuid(userId) &&
    isValidUserName(userName) &&
    isValidDisplayName(displayName) &&
    isValidEmail(email) &&
    isValidToken(token)
  );
}

function storeAuthenticatedUser(authenticatedUser: AuthenticatedUser | null): void {
  if (authenticatedUser === null) {
    localStorage.removeItem(authenticationTokenStorageKey);
    return;
  }
  try {
    localStorage.setItem(authenticationTokenStorageKey, JSON.stringify(authenticatedUser));
  } catch (error) {
    console.log('localStorage error', error);
  }
}
function loadAuthenticatedUser(): AuthenticatedUser | null {
  const authenticatedUserRaw = localStorage.getItem(authenticationTokenStorageKey);
  if (authenticatedUserRaw === null) {
    return null;
  }
  let authenticatedUser: unknown;
  try {
    authenticatedUser = JSON.parse(authenticatedUserRaw);
  } catch {
    storeAuthenticatedUser(null);
    return null;
  }
  if (isValidAuthenticatedUser(authenticatedUser)) {
    return authenticatedUser;
  }
  return null;
}

export type UserAuthenticationStatus =
  | { isVerified: true; authenticatedUser: AuthenticatedUser }
  | { isVerified: false; authenticatedUser: AuthenticatedUser | null };
export const userAuthenticationStatus$ = new BehaviorSubject<UserAuthenticationStatus>({
  isVerified: false,
  authenticatedUser: loadAuthenticatedUser(),
});
export function areAuthenticatedUsersTheSame(au1: AuthenticatedUser | null, au2: AuthenticatedUser | null): boolean {
  return JSON.stringify(au1) === JSON.stringify(au2);
}
export const authenticatedUser$ = userAuthenticationStatus$.pipe(
  map((userAuthenticationStatus) => userAuthenticationStatus.authenticatedUser),
  distinctUntilChanged(areAuthenticatedUsersTheSame),
);

export function updateUserAuthenticationStatus(userAuthenticationStatus: UserAuthenticationStatus): void {
  const { authenticatedUser } = userAuthenticationStatus;
  storeAuthenticatedUser(authenticatedUser);
  if (JSON.stringify(userAuthenticationStatus) !== JSON.stringify(userAuthenticationStatus$.value)) {
    userAuthenticationStatus$.next(userAuthenticationStatus);
  }
}

export function resetAuthenticatedUser(): void {
  updateUserAuthenticationStatus({
    isVerified: false,
    authenticatedUser: null,
  });
  storeAuthenticatedUser(null);
}

let isVerifyingAuthenticatedUser = false;

export function verifyAuthenticatedUser(): void {
  if (isVerifyingAuthenticatedUser) {
    return;
  }
  const { isVerified, authenticatedUser } = userAuthenticationStatus$.value;
  if (isVerified || authenticatedUser === null) {
    return;
  }
  isVerifyingAuthenticatedUser = true;
  const { userId, token } = authenticatedUser;
  makeApiRequest(verifyAuthEndpoint, {
    isValidResponseJson: isValidVerifyAuthResponseJson,
    token,
  }).subscribe({
    next(responseJson) {
      switch (responseJson.type) {
        case VerifyAuthResponseType.Fail: {
          resetAuthenticatedUser();
          break;
        }
        case VerifyAuthResponseType.Success: {
          const { userName, displayName, email } = responseJson;
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
    complete() {
      isVerifyingAuthenticatedUser = false;
    },
  });
}
