import { isValidUuid, normalizeUuid } from '../verification.js';

export const deleteAccountVerifyEndpoint = '/api/deleteaccountverify';

export type DeleteAccountVerifyRequest = {
  pendingId: string;
};

export function getValidDeleteAccountVerifyRequest(body: unknown): DeleteAccountVerifyRequest | null {
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

export const enum DeleteAccountVerifyResponseType {
  Fail = 'fail',
  NotAuthorized = 'notAuthorized',
  Success = 'success',
}

export type DeleteAccountVerifyResponse = { type: DeleteAccountVerifyResponseType };

export function isValidDeleteAccountVerifyResponseJson(responseJson: unknown): responseJson is DeleteAccountVerifyResponse {
  if (typeof responseJson !== 'object' || responseJson === null) {
    return false;
  }
  const { type } = responseJson as { type: unknown };
  return (
    type === DeleteAccountVerifyResponseType.Fail || type === DeleteAccountVerifyResponseType.NotAuthorized || type === DeleteAccountVerifyResponseType.Success
  );
}
