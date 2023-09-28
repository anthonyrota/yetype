import { isValidPassword, isValidUuid, normalizePassword } from '../verification.js';

export const changePasswordEndpoint = '/api/changepassword';

export type ChangePasswordRequest = {
  newPassword: string;
};

export function getValidChangePasswordRequest(body: unknown): ChangePasswordRequest | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const { newPassword } = body as { newPassword: unknown };
  if (typeof newPassword !== 'string') {
    return null;
  }
  const normalizedNewPassword = normalizePassword(newPassword);
  if (!isValidPassword(normalizedNewPassword)) {
    return null;
  }
  return {
    newPassword: normalizedNewPassword,
  };
}

export const enum ChangePasswordResponseType {
  Fail = 'fail',
  NotAuthorized = 'notAuthorized',
  Success = 'success',
}

export type ChangePasswordResponse =
  | { type: ChangePasswordResponseType.Fail }
  | { type: ChangePasswordResponseType.NotAuthorized }
  | { type: ChangePasswordResponseType.Success; pendingId: string };

export function isValidChangePasswordResponseJson(responseJson: unknown): responseJson is ChangePasswordResponse {
  if (typeof responseJson !== 'object' || responseJson === null) {
    return false;
  }
  const { type } = responseJson as { type: unknown };
  if (type !== ChangePasswordResponseType.Fail && type !== ChangePasswordResponseType.NotAuthorized && type !== ChangePasswordResponseType.Success) {
    return false;
  }
  if (type === ChangePasswordResponseType.Success) {
    const { pendingId } = responseJson as { pendingId: unknown };
    return typeof pendingId === 'string' && isValidUuid(pendingId);
  }
  return true;
}
