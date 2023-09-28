import { isValidDisplayName, isValidEmail, isValidPin, isValidUserName, isValidUuid, normalizePin, normalizeUuid } from '../verification.js';

export const changeAccountDetailsVerifyEmailEndpoint = '/api/changeaccountdetailsverifyemail';

export type ChangeAccountDetailsVerifyEmailRequest = {
  pendingId: string;
  pin: string;
};

export function getValidChangeAccountDetailsVerifyEmailRequest(body: unknown): ChangeAccountDetailsVerifyEmailRequest | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const { pendingId, pin } = body as { pendingId: unknown; pin: unknown };
  if (typeof pendingId !== 'string' || typeof pin !== 'string') {
    return null;
  }
  const normalizedPendingId = normalizeUuid(pendingId);
  const normalizedPin = normalizePin(pin);
  if (!isValidUuid(pendingId) || !isValidPin(normalizedPin)) {
    return null;
  }
  return {
    pendingId: normalizedPendingId,
    pin: normalizedPin,
  };
}

export const enum ChangeAccountDetailsVerifyEmailResponseType {
  Fail = 'fail',
  NotAuthorized = 'notAuthorized',
  IncorrectDetails = 'incorrectDetails',
  CodeExpired = 'codeExpired',
  EmailAlreadyInUse = 'emailAlreadyInUse',
  Success = 'success',
}

export type ChangeAccountDetailsVerifyEmailResponse =
  | { type: ChangeAccountDetailsVerifyEmailResponseType.Fail }
  | { type: ChangeAccountDetailsVerifyEmailResponseType.NotAuthorized }
  | { type: ChangeAccountDetailsVerifyEmailResponseType.IncorrectDetails }
  | { type: ChangeAccountDetailsVerifyEmailResponseType.CodeExpired }
  | { type: ChangeAccountDetailsVerifyEmailResponseType.EmailAlreadyInUse }
  | { type: ChangeAccountDetailsVerifyEmailResponseType.Success; userName: string; displayName: string; email: string };

export function isValidChangeAccountDetailsVerifyEmailResponseJson(responseJson: unknown): responseJson is ChangeAccountDetailsVerifyEmailResponse {
  if (typeof responseJson !== 'object' || responseJson === null) {
    return false;
  }
  const { type } = responseJson as { type: unknown };
  if (
    type === ChangeAccountDetailsVerifyEmailResponseType.Fail ||
    type === ChangeAccountDetailsVerifyEmailResponseType.NotAuthorized ||
    type === ChangeAccountDetailsVerifyEmailResponseType.IncorrectDetails ||
    type === ChangeAccountDetailsVerifyEmailResponseType.CodeExpired ||
    type === ChangeAccountDetailsVerifyEmailResponseType.EmailAlreadyInUse
  ) {
    return true;
  }
  return (
    type === ChangeAccountDetailsVerifyEmailResponseType.Success &&
    'userName' in responseJson &&
    'displayName' in responseJson &&
    'email' in responseJson &&
    typeof responseJson.userName === 'string' &&
    typeof responseJson.displayName === 'string' &&
    typeof responseJson.email === 'string' &&
    isValidUserName(responseJson.userName) &&
    isValidDisplayName(responseJson.displayName) &&
    isValidEmail(responseJson.email)
  );
}
