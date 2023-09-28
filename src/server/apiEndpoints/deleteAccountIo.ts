import { isValidUuid } from '../verification.js';

export const deleteAccountEndpoint = '/api/deleteaccount';

export enum DeleteAccountResponseType {
  Fail = 'fail',
  NotAuthorized = 'notAuthorized',
  Success = 'success',
}

export type DeleteAccountResponse =
  | { type: DeleteAccountResponseType.Fail }
  | { type: DeleteAccountResponseType.NotAuthorized }
  | { type: DeleteAccountResponseType.Success; pendingId: string };

export function isValidDeleteAccountResponseJson(responseJson: unknown): responseJson is DeleteAccountResponse {
  if (typeof responseJson !== 'object' || responseJson === null) {
    return false;
  }
  const { type } = responseJson as { type: unknown };
  if (type !== DeleteAccountResponseType.Fail && type !== DeleteAccountResponseType.NotAuthorized && type !== DeleteAccountResponseType.Success) {
    return false;
  }
  if (type === DeleteAccountResponseType.Success) {
    const { pendingId } = responseJson as { pendingId: unknown };
    return typeof pendingId === 'string' && isValidUuid(pendingId);
  }
  return true;
}
