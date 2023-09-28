import { isValidDisplayName, isValidEmail, isValidUserName, isValidUuid, normalizeDisplayName, normalizeEmail, normalizeUserName } from '../verification.js';

export const changeAccountDetailsEndpoint = '/api/changeaccountdetails';

export type ChangeAccountDetailsRequest = {
  userName: string;
  displayName: string;
  email: string;
};

export function getValidChangeAccountDetailsRequest(body: unknown): ChangeAccountDetailsRequest | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const { userName, displayName, email } = body as { userName: unknown; displayName: unknown; email: unknown };
  if (typeof userName !== 'string' || typeof displayName !== 'string' || typeof email !== 'string') {
    return null;
  }
  const normalizedUserName = normalizeUserName(userName);
  const normalizedDisplayName = normalizeDisplayName(displayName);
  const normalizedEmail = normalizeEmail(email);
  if (!isValidUserName(normalizedUserName) || !isValidDisplayName(normalizedDisplayName) || !isValidEmail(normalizedEmail)) {
    return null;
  }
  return {
    userName: normalizedUserName,
    displayName: normalizedDisplayName,
    email: normalizedEmail,
  };
}

export const enum ChangeAccountDetailsResponseType {
  Fail = 'fail',
  NotAuthorized = 'notAuthorized',
  EmailOrUserNameAlreadyInUse = 'emailOrUserNameAlreadyInUse',
  Success = 'success',
}

export type ChangeAccountDetailsResponse =
  | { type: ChangeAccountDetailsResponseType.Fail }
  | { type: ChangeAccountDetailsResponseType.NotAuthorized }
  | { type: ChangeAccountDetailsResponseType.EmailOrUserNameAlreadyInUse }
  | { type: ChangeAccountDetailsResponseType.Success; pendingId: string };

export function isValidChangeAccountDetailsResponseJson(responseJson: unknown): responseJson is ChangeAccountDetailsResponse {
  if (typeof responseJson !== 'object' || responseJson === null) {
    return false;
  }
  const { type } = responseJson as { type: unknown };
  if (
    type !== ChangeAccountDetailsResponseType.Fail &&
    type !== ChangeAccountDetailsResponseType.NotAuthorized &&
    type !== ChangeAccountDetailsResponseType.EmailOrUserNameAlreadyInUse &&
    type !== ChangeAccountDetailsResponseType.Success
  ) {
    return false;
  }
  if (type === ChangeAccountDetailsResponseType.Success) {
    const { pendingId } = responseJson as { pendingId: unknown };
    return typeof pendingId === 'string' && isValidUuid(pendingId);
  }
  return true;
}
