import { isValidDisplayName, isValidUserName, isValidUuid, normalizeUuid } from '../verification.js';

export const changeAccountDetailsVerifyEndpoint = '/api/changeaccountdetailsverify';

export type ChangeAccountDetailsVerifyRequest = {
  pendingId: string;
};

export function getValidChangeAccountDetailsVerifyRequest(body: unknown): ChangeAccountDetailsVerifyRequest | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const { pendingId } = body as { pendingId: unknown; password: unknown };
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

export const enum ChangeAccountDetailsVerifyResponseType {
  Fail = 'fail',
  NotAuthorized = 'notAuthorized',
  EmailOrUserNameAlreadyInUse = 'emailOrUserNameAlreadyInUse',
  Success = 'success',
}

export type ChangeAccountDetailsVerifyResponse =
  | { type: ChangeAccountDetailsVerifyResponseType.Fail }
  | { type: ChangeAccountDetailsVerifyResponseType.NotAuthorized }
  | { type: ChangeAccountDetailsVerifyResponseType.EmailOrUserNameAlreadyInUse }
  | { type: ChangeAccountDetailsVerifyResponseType.Success; userName: string; displayName: string; pendingId?: string };

export function isValidChangeAccountDetailsVerifyResponseJson(responseJson: unknown): responseJson is ChangeAccountDetailsVerifyResponse {
  if (typeof responseJson !== 'object' || responseJson === null) {
    return false;
  }
  const { type } = responseJson as { type: unknown };
  if (
    type !== ChangeAccountDetailsVerifyResponseType.Fail &&
    type !== ChangeAccountDetailsVerifyResponseType.NotAuthorized &&
    type !== ChangeAccountDetailsVerifyResponseType.EmailOrUserNameAlreadyInUse &&
    type !== ChangeAccountDetailsVerifyResponseType.Success
  ) {
    return false;
  }
  if (type === ChangeAccountDetailsVerifyResponseType.Success) {
    const { pendingId, userName, displayName } = responseJson as { pendingId?: unknown; userName: unknown; displayName: unknown };
    return (
      (pendingId === undefined || (typeof pendingId === 'string' && isValidUuid(pendingId))) &&
      typeof userName === 'string' &&
      typeof displayName === 'string' &&
      isValidUserName(userName) &&
      isValidDisplayName(displayName)
    );
  }
  return true;
}
