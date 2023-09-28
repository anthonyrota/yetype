import { isValidEmail, isValidPassword, isValidUuid, normalizeEmail, normalizePassword } from '../verification.js';

export const forgotPasswordEndpoint = '/api/forgotpassword';

export type ForgotPasswordRequest = {
  email: string;
  newPassword: string;
};

export function getValidForgotPasswordRequest(body: unknown): ForgotPasswordRequest | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const { email, newPassword } = body as { email: unknown; newPassword: unknown };
  if (typeof email !== 'string' || typeof newPassword !== 'string') {
    return null;
  }
  const normalizedEmail = normalizeEmail(email);
  const normalizedNewPassword = normalizePassword(newPassword);
  if (!isValidEmail(normalizedEmail) || !isValidPassword(normalizedNewPassword)) {
    return null;
  }
  return {
    email: normalizedEmail,
    newPassword: normalizedNewPassword,
  };
}

export const enum ForgotPasswordResponseType {
  Fail = 'fail',
  EmailNotRegistered = 'emailNotRegistered',
  Success = 'success',
}

export type ForgotPasswordResponse =
  | { type: ForgotPasswordResponseType.Fail }
  | { type: ForgotPasswordResponseType.EmailNotRegistered }
  | { type: ForgotPasswordResponseType.Success; pendingId: string };

export function isValidForgotPasswordResponseJson(responseJson: unknown): responseJson is ForgotPasswordResponse {
  if (typeof responseJson !== 'object' || responseJson === null) {
    return false;
  }
  const { type } = responseJson as { type: unknown };
  if (type !== ForgotPasswordResponseType.Fail && type !== ForgotPasswordResponseType.EmailNotRegistered && type !== ForgotPasswordResponseType.Success) {
    return false;
  }
  if (type === ForgotPasswordResponseType.Success) {
    const { pendingId } = responseJson as { pendingId: unknown };
    return typeof pendingId === 'string' && isValidUuid(pendingId);
  }
  return true;
}
