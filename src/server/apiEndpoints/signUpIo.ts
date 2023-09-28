import {
  isValidDisplayName,
  isValidEmail,
  isValidPassword,
  isValidUserName,
  isValidUuid,
  normalizeDisplayName,
  normalizeEmail,
  normalizePassword,
  normalizeUserName,
} from '../verification.js';

export const signUpEndpoint = '/api/signup';

export type SignUpRequest = {
  userName: string;
  displayName: string;
  email: string;
  password: string;
};

export function getValidSignUpRequest(body: unknown): SignUpRequest | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const { userName, displayName, email, password } = body as { userName: unknown; displayName: unknown; email: unknown; password: unknown };
  if (typeof userName !== 'string' || typeof displayName !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    return null;
  }
  const normalizedUserName = normalizeUserName(userName);
  const normalizedDisplayName = normalizeDisplayName(displayName);
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = normalizePassword(password);
  if (
    !isValidUserName(normalizedUserName) ||
    !isValidDisplayName(normalizedDisplayName) ||
    !isValidEmail(normalizedEmail) ||
    !isValidPassword(normalizedPassword)
  ) {
    return null;
  }
  return {
    userName: normalizedUserName,
    displayName: normalizedDisplayName,
    email: normalizedEmail,
    password: normalizedPassword,
  };
}

export const enum SignUpResponseType {
  Fail = 'fail',
  EmailOrUserNameAlreadyInUse = 'emailOrUserNameAlreadyInUse',
  Success = 'success',
}

export type SignUpResponse =
  | { type: SignUpResponseType.Fail }
  | { type: SignUpResponseType.EmailOrUserNameAlreadyInUse }
  | { type: SignUpResponseType.Success; pendingId: string };

export function isValidSignUpResponseJson(responseJson: unknown): responseJson is SignUpResponse {
  if (typeof responseJson !== 'object' || responseJson === null) {
    return false;
  }
  const { type } = responseJson as { type: unknown };
  if (type !== SignUpResponseType.Fail && type !== SignUpResponseType.EmailOrUserNameAlreadyInUse && type !== SignUpResponseType.Success) {
    return false;
  }
  if (type === SignUpResponseType.Success) {
    const { pendingId } = responseJson as { pendingId: unknown };
    return typeof pendingId === 'string' && isValidUuid(pendingId);
  }
  return true;
}
