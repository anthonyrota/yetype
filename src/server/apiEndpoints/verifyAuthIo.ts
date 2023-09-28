import { isValidDisplayName, isValidEmail, isValidUserName } from '../verification.js';

export const verifyAuthEndpoint = '/api/verifyauth';

export const enum VerifyAuthResponseType {
  Fail = 'fail',
  Success = 'success',
}

export type VerifyAuthResponse =
  | { type: VerifyAuthResponseType.Fail }
  | { type: VerifyAuthResponseType.Success; userName: string; displayName: string; email: string };

export function isValidVerifyAuthResponseJson(responseJson: unknown): responseJson is VerifyAuthResponse {
  if (typeof responseJson !== 'object' || responseJson === null) {
    return false;
  }
  const { type } = responseJson as { type: unknown };
  if (type !== VerifyAuthResponseType.Fail && type !== VerifyAuthResponseType.Success) {
    return false;
  }
  if (type === VerifyAuthResponseType.Success) {
    const { userName, displayName, email } = responseJson as { userName: unknown; displayName: unknown; email: unknown };
    return (
      typeof userName === 'string' &&
      typeof displayName === 'string' &&
      typeof email === 'string' &&
      isValidUserName(userName) &&
      isValidDisplayName(displayName) &&
      isValidEmail(email)
    );
  }
  return true;
}
