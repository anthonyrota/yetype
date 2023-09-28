import { isValidUuid, normalizeUuid } from '../verification.js';

export const changePasswordVerifyEndpoint = '/api/changepasswordverify';

export type ChangePasswordVerifyRequest = {
  pendingId: string;
};

export function getValidChangePasswordVerifyRequest(body: unknown): ChangePasswordVerifyRequest | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const { pendingId } = body as { pendingId: unknown };
  if (typeof pendingId !== 'string') {
    return null;
  }
  const normalizedPendingId = normalizeUuid(pendingId);
  if (!isValidUuid(normalizedPendingId)) {
    return null;
  }
  return {
    pendingId: normalizedPendingId,
  };
}

export const enum ChangePasswordVerifyResponseType {
  Fail = 'fail',
  NotAuthorized = 'notAuthorized',
  Success = 'success',
}

export type ChangePasswordVerifyResponse = { type: ChangePasswordVerifyResponseType };

export function isValidChangePasswordVerifyResponseJson(responseJson: unknown): responseJson is ChangePasswordVerifyResponse {
  if (typeof responseJson !== 'object' || responseJson === null) {
    return false;
  }
  const { type } = responseJson as { type: unknown };
  return (
    type === ChangePasswordVerifyResponseType.Fail ||
    type === ChangePasswordVerifyResponseType.NotAuthorized ||
    type === ChangePasswordVerifyResponseType.Success
  );
}
