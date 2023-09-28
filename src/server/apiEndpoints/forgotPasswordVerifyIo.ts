import { isValidPin, isValidUuid, normalizePin, normalizeUuid } from '../verification.js';

export const forgotPasswordVerifyEndpoint = '/api/forgotpasswordverify';

export type ForgotPasswordVerifyRequest = {
  pendingId: string;
  pin: string;
};

export function getValidForgotPasswordVerifyRequest(body: unknown): ForgotPasswordVerifyRequest | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const { pendingId, pin } = body as { pendingId: unknown; pin: unknown };
  if (typeof pendingId !== 'string' || typeof pin !== 'string') {
    return null;
  }
  const normalizedPendingId = normalizeUuid(pendingId);
  const normalizedPin = normalizePin(pin);
  if (!isValidUuid(normalizedPendingId) || !isValidPin(normalizedPin)) {
    return null;
  }
  return {
    pendingId: normalizedPendingId,
    pin: normalizedPin,
  };
}

export const enum ForgotPasswordVerifyResponseType {
  Fail = 'fail',
  IncorrectDetails = 'incorrectDetails',
  CodeExpired = 'codeExpired',
  Success = 'success',
}

export type ForgotPasswordVerifyResponse = { type: ForgotPasswordVerifyResponseType };

export function isValidForgotPasswordVerifyResponseJson(responseJson: unknown): responseJson is ForgotPasswordVerifyResponse {
  if (typeof responseJson !== 'object' || responseJson === null) {
    return false;
  }
  const { type } = responseJson as { type: unknown };
  return (
    type === ForgotPasswordVerifyResponseType.Fail ||
    type === ForgotPasswordVerifyResponseType.IncorrectDetails ||
    type === ForgotPasswordVerifyResponseType.CodeExpired ||
    type === ForgotPasswordVerifyResponseType.Success
  );
}
