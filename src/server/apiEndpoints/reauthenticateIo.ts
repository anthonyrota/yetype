import { isValidDisplayName, isValidEmail, isValidPassword, isValidToken, isValidUserName, normalizePassword } from '../verification.js';

export const reauthenticateEndpoint = '/api/reauthenticate';

export type ReauthenticateRequest = {
  password: string;
};

export function getValidReauthenticateRequest(body: unknown): ReauthenticateRequest | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const { password } = body as { password: unknown };
  if (typeof password !== 'string') {
    return null;
  }
  const normalizedPassword = normalizePassword(password);
  if (!isValidPassword(normalizedPassword)) {
    return null;
  }
  return {
    password: normalizedPassword,
  };
}

export const enum ReauthenticateResponseType {
  Fail = 'fail',
  NotAuthorized = 'notAuthorized',
  IncorrectDetails = 'incorrectDetails',
  Success = 'success',
}

export type ReauthenticateResponse =
  | { type: ReauthenticateResponseType.Fail }
  | { type: ReauthenticateResponseType.NotAuthorized }
  | { type: ReauthenticateResponseType.IncorrectDetails }
  | { type: ReauthenticateResponseType.Success; userName: string; displayName: string; email: string; token: string };

export function isValidReauthenticateResponseJson(responseJson: unknown): responseJson is ReauthenticateResponse {
  if (typeof responseJson !== 'object' || responseJson === null) {
    return false;
  }
  const { type } = responseJson as { type: unknown };
  if (
    type !== ReauthenticateResponseType.Fail &&
    type !== ReauthenticateResponseType.NotAuthorized &&
    type !== ReauthenticateResponseType.IncorrectDetails &&
    type !== ReauthenticateResponseType.Success
  ) {
    return false;
  }
  if (type === ReauthenticateResponseType.Success) {
    const { userName, displayName, email, token } = responseJson as { userName: unknown; displayName: unknown; email: unknown; token: unknown };
    return (
      typeof userName === 'string' &&
      typeof displayName === 'string' &&
      typeof email === 'string' &&
      typeof token === 'string' &&
      isValidUserName(userName) &&
      isValidDisplayName(displayName) &&
      isValidEmail(email) &&
      isValidToken(token)
    );
  }
  return true;
}
