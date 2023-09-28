import { isValidDisplayName, isValidEmail, isValidPin, isValidToken, isValidUserName, isValidUuid, normalizePin, normalizeUuid } from '../verification.js';

export const signUpVerifyEndpoint = '/api/signupverify';

export type SignUpVerifyRequest = {
  pendingId: string;
  pin: string;
};

export function getValidSignUpVerifyRequest(body: unknown): SignUpVerifyRequest | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const { pendingId, pin } = body as { pendingId: unknown; pin: unknown };
  if (typeof pendingId !== 'string' || typeof pin !== 'string') {
    return null;
  }
  const normalizedPendingId = normalizeUuid(pendingId);
  const normalizedPin = normalizePin(pin);
  if (!isValidUuid(normalizedPendingId) || !isValidPin(normalizedPin)) {
    return null;
  }
  return {
    pendingId: normalizedPendingId,
    pin: normalizedPin,
  };
}

export const enum SignUpVerifyResponseType {
  Fail = 'fail',
  IncorrectDetails = 'incorrectDetails',
  CodeExpired = 'codeExpired',
  EmailOrUserNameAlreadyInUse = 'emailOrUserNameAlreadyInUse',
  Success = 'success',
}

export type SignUpVerifyResponse =
  | { type: SignUpVerifyResponseType.Fail }
  | { type: SignUpVerifyResponseType.IncorrectDetails }
  | { type: SignUpVerifyResponseType.CodeExpired }
  | { type: SignUpVerifyResponseType.EmailOrUserNameAlreadyInUse }
  | { type: SignUpVerifyResponseType.Success; userId: string; userName: string; displayName: string; email: string; token: string };

export function isValidSignUpVerifyResponseJson(responseJson: unknown): responseJson is SignUpVerifyResponse {
  if (typeof responseJson !== 'object' || responseJson === null) {
    return false;
  }
  const { type } = responseJson as { type: unknown };
  if (
    type !== SignUpVerifyResponseType.Fail &&
    type !== SignUpVerifyResponseType.IncorrectDetails &&
    type !== SignUpVerifyResponseType.CodeExpired &&
    type !== SignUpVerifyResponseType.EmailOrUserNameAlreadyInUse &&
    type !== SignUpVerifyResponseType.Success
  ) {
    return false;
  }
  if (type === SignUpVerifyResponseType.Success) {
    const { userId, userName, displayName, email, token } = responseJson as {
      userId: unknown;
      userName: unknown;
      displayName: unknown;
      email: unknown;
      token: unknown;
    };
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
  return true;
}
