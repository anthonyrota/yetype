import { VerificationCodeValidity, getVerificationCodeValidity, useAuthentication, verifyScrypt } from '../authentication.js';
import { pool } from '../db.js';
import {
  ChangeAccountDetailsVerifyEmailResponse,
  ChangeAccountDetailsVerifyEmailResponseType,
  getValidChangeAccountDetailsVerifyEmailRequest,
} from './changeAccountDetailsVerifyEmailIo.js';

async function getChangeAccountDetailsVerifyEmailResponse(req: import('express').Request): Promise<ChangeAccountDetailsVerifyEmailResponse> {
  const requestData = getValidChangeAccountDetailsVerifyEmailRequest(req.body);
  if (requestData === null) {
    return { type: ChangeAccountDetailsVerifyEmailResponseType.Fail };
  }
  const { pendingId, pin } = requestData;
  const authenticationDetails = await useAuthentication(req);
  if (authenticationDetails === null) {
    return { type: ChangeAccountDetailsVerifyEmailResponseType.NotAuthorized };
  }
  const { userId } = authenticationDetails;
  const queryResult = await pool.query(
    'update pending_user_email_changes set verification_code_attempts = verification_code_attempts + 1 where id = $1 and user_id = $2 returning email, verification_code, verification_code_attempts as updated_verification_code_attempts, created_at',
    [pendingId, userId],
  );
  if (queryResult.rowCount === 0) {
    return { type: ChangeAccountDetailsVerifyEmailResponseType.CodeExpired };
  }
  const row: unknown = queryResult.rows[0];
  if (typeof row !== 'object' || row === null) {
    return { type: ChangeAccountDetailsVerifyEmailResponseType.Fail };
  }
  const {
    email,
    verification_code: verificationCode,
    updated_verification_code_attempts: updatedVerificationCodeAttempts,
    created_at: createdAt,
  } = row as { email: unknown; verification_code: unknown; updated_verification_code_attempts: unknown; created_at: unknown };
  if (
    typeof email !== 'string' ||
    typeof verificationCode !== 'string' ||
    typeof updatedVerificationCodeAttempts !== 'number' ||
    !(createdAt instanceof Date)
  ) {
    return { type: ChangeAccountDetailsVerifyEmailResponseType.Fail };
  }
  const isValidResult = getVerificationCodeValidity(updatedVerificationCodeAttempts, createdAt);
  if (isValidResult === VerificationCodeValidity.IsNotValid) {
    return { type: ChangeAccountDetailsVerifyEmailResponseType.CodeExpired };
  }
  const isCorrect = await verifyScrypt(verificationCode, pin);
  if (!isCorrect) {
    if (isValidResult === VerificationCodeValidity.IsLastAttemptValid) {
      return { type: ChangeAccountDetailsVerifyEmailResponseType.CodeExpired };
    }
    return { type: ChangeAccountDetailsVerifyEmailResponseType.IncorrectDetails };
  }
  await pool.query('delete from pending_user_email_changes where id = $1', [pendingId]);
  const updateQueryResult = await pool.query('update users set email = $2 where id = $1 returning user_name, display_name, email as new_email', [
    userId,
    email,
  ]);
  if (updateQueryResult.rowCount === 0) {
    return { type: ChangeAccountDetailsVerifyEmailResponseType.Fail };
  }
  const updateRow: unknown = updateQueryResult.rows[0];
  if (typeof updateRow !== 'object' || updateRow === null) {
    return { type: ChangeAccountDetailsVerifyEmailResponseType.Fail };
  }
  const {
    user_name: userName,
    display_name: displayName,
    new_email: newEmail,
  } = updateRow as { user_name: unknown; display_name: unknown; new_email: unknown };
  if (typeof userName !== 'string' || typeof displayName !== 'string' || typeof newEmail !== 'string') {
    return { type: ChangeAccountDetailsVerifyEmailResponseType.Fail };
  }
  return { type: ChangeAccountDetailsVerifyEmailResponseType.Success, userName, displayName, email: newEmail };
}

export function handleChangeAccountDetailsVerifyEmail(req: import('express').Request, res: import('express').Response): void {
  void getChangeAccountDetailsVerifyEmailResponse(req)
    .catch((): ChangeAccountDetailsVerifyEmailResponse => ({ type: ChangeAccountDetailsVerifyEmailResponseType.Fail }))
    .then((responseJson) => {
      res.status(200).send(responseJson);
    });
}
