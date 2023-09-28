import { VerificationCodeValidity, getVerificationCodeValidity, verifyScrypt } from '../authentication.js';
import { pool } from '../db.js';
import { ForgotPasswordVerifyResponse, ForgotPasswordVerifyResponseType, getValidForgotPasswordVerifyRequest } from './forgotPasswordVerifyIo.js';

async function getForgotPasswordVerifyResponse(req: import('express').Request): Promise<ForgotPasswordVerifyResponse> {
  const requestData = getValidForgotPasswordVerifyRequest(req.body);
  if (requestData === null) {
    return { type: ForgotPasswordVerifyResponseType.Fail };
  }
  const { pendingId, pin } = requestData;
  const queryResult = await pool.query(
    'update pending_user_password_resets set verification_code_attempts = verification_code_attempts + 1 where id = $1 returning user_id, new_password, verification_code, verification_code_attempts as updated_verification_code_attempts, created_at',
    [pendingId],
  );
  const row: unknown = queryResult.rows[0];
  if (typeof row !== 'object' || row === null) {
    return { type: ForgotPasswordVerifyResponseType.Fail };
  }
  const {
    user_id: userId,
    new_password: newPassword,
    verification_code: verificationCode,
    updated_verification_code_attempts: updatedVerificationCodeAttempts,
    created_at: createdAt,
  } = row as { user_id: unknown; new_password: unknown; verification_code: unknown; updated_verification_code_attempts: unknown; created_at: unknown };
  if (
    typeof userId !== 'string' ||
    typeof newPassword !== 'string' ||
    typeof verificationCode !== 'string' ||
    typeof updatedVerificationCodeAttempts !== 'number' ||
    !(createdAt instanceof Date)
  ) {
    return { type: ForgotPasswordVerifyResponseType.Fail };
  }
  const isValidResult = getVerificationCodeValidity(updatedVerificationCodeAttempts, createdAt);
  if (isValidResult === VerificationCodeValidity.IsNotValid) {
    return { type: ForgotPasswordVerifyResponseType.CodeExpired };
  }
  const isCorrect = await verifyScrypt(verificationCode, pin);
  if (!isCorrect) {
    if (isValidResult === VerificationCodeValidity.IsLastAttemptValid) {
      return { type: ForgotPasswordVerifyResponseType.CodeExpired };
    }
    return { type: ForgotPasswordVerifyResponseType.IncorrectDetails };
  }
  await pool.query('delete from pending_user_password_resets where id = $1', [pendingId]);
  await pool.query('update users set pwd = $2 where id = $1', [userId, newPassword]);
  return { type: ForgotPasswordVerifyResponseType.Success };
}

export function handleForgotPasswordVerify(req: import('express').Request, res: import('express').Response): void {
  void getForgotPasswordVerifyResponse(req)
    .catch((): ForgotPasswordVerifyResponse => ({ type: ForgotPasswordVerifyResponseType.Fail }))
    .then((responseJson) => {
      res.status(200).send(responseJson);
    });
}
