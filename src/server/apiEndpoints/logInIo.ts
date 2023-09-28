import {
  isValidDisplayName,
  isValidEmail,
  isValidPassword,
  isValidToken,
  isValidUserName,
  isValidUserNameOrEmail,
  isValidUuid,
  normalizePassword,
  normalizeUserNameOrEmail,
} from '../verification.js';

export const logInEndpoint = '/api/login';

export type LogInRequest = {
  userNameOrEmail: string;
  password: string;
};

export function getValidLogInRequest(body: unknown): LogInRequest | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const { userNameOrEmail, password } = body as { userNameOrEmail: unknown; password: unknown };
  if (typeof userNameOrEmail !== 'string' || typeof password !== 'string') {
    return null;
  }
  const normalizedUserNameOrEmail = normalizeUserNameOrEmail(userNameOrEmail);
  const normalizedPassword = normalizePassword(password);
  if (!isValidUserNameOrEmail(normalizedUserNameOrEmail) || !isValidPassword(normalizedPassword)) {
    return null;
  }
  return {
    userNameOrEmail: normalizedUserNameOrEmail,
    password: normalizedPassword,
  };
}

export const enum LogInResponseType {
  Fail = 'fail',
  IncorrectDetails = 'incorrectDetails',
  Success = 'success',
}

export type LogInResponse =
  | { type: LogInResponseType.Fail }
  | { type: LogInResponseType.IncorrectDetails }
  | { type: LogInResponseType.Success; userId: string; userName: string; displayName: string; email: string; token: string };

export function isValidLogInResponseJson(responseJson: unknown): responseJson is LogInResponse {
  if (typeof responseJson !== 'object' || responseJson === null) {
    return false;
  }
  const { type } = responseJson as { type: unknown };
  if (type !== LogInResponseType.Fail && type !== LogInResponseType.IncorrectDetails && type !== LogInResponseType.Success) {
    return false;
  }
  if (type === LogInResponseType.Success) {
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
