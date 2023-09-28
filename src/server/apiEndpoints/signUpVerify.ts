import { VerificationCodeValidity, createSessionToken, getVerificationCodeValidity, verifyScrypt } from '../authentication.js';
import { isPgErrorUniqueViolationError, pool } from '../db.js';
import { SignUpVerifyResponse, SignUpVerifyResponseType, getValidSignUpVerifyRequest } from './signUpVerifyIo.js';

async function getSignUpVerifyResponse(req: import('express').Request): Promise<SignUpVerifyResponse> {
  const requestData = getValidSignUpVerifyRequest(req.body);
  if (requestData === null) {
    return { type: SignUpVerifyResponseType.Fail };
  }
  const { pendingId, pin } = requestData;
  const queryResult = await pool.query(
    'update pending_unverified_users set verification_code_attempts = verification_code_attempts + 1 where id = $1 returning user_name, display_name, pwd, email, verification_code, verification_code_attempts as updated_verification_code_attempts, created_at',
    [pendingId],
  );
  if (queryResult.rowCount === 0) {
    return { type: SignUpVerifyResponseType.CodeExpired };
  }
  const row: unknown = queryResult.rows[0];
  if (typeof row !== 'object' || row === null) {
    return { type: SignUpVerifyResponseType.Fail };
  }
  const {
    user_name: userName,
    display_name: displayName,
    pwd,
    email,
    verification_code: verificationCode,
    updated_verification_code_attempts: updatedVerificationCodeAttempts,
    created_at: createdAt,
  } = row as {
    user_name: unknown;
    display_name: unknown;
    pwd: unknown;
    email: unknown;
    verification_code: unknown;
    updated_verification_code_attempts: unknown;
    created_at: unknown;
  };
  if (
    typeof userName !== 'string' ||
    typeof displayName !== 'string' ||
    typeof pwd !== 'string' ||
    typeof email !== 'string' ||
    typeof verificationCode !== 'string' ||
    typeof updatedVerificationCodeAttempts !== 'number' ||
    !(createdAt instanceof Date)
  ) {
    return { type: SignUpVerifyResponseType.Fail };
  }
  const isValidResult = getVerificationCodeValidity(updatedVerificationCodeAttempts, createdAt);
  if (isValidResult === VerificationCodeValidity.IsNotValid) {
    return { type: SignUpVerifyResponseType.CodeExpired };
  }
  const isCorrect = await verifyScrypt(verificationCode, pin);
  if (!isCorrect) {
    if (isValidResult === VerificationCodeValidity.IsLastAttemptValid) {
      return { type: SignUpVerifyResponseType.CodeExpired };
    }
    return { type: SignUpVerifyResponseType.IncorrectDetails };
  }
  await pool.query('delete from pending_unverified_users where id = $1', [pendingId]);
  const userId = crypto.randomUUID();
  try {
    await pool.query('insert into users (id, user_name, display_name, pwd, email, created_at) values ($1, $2, $3, $4, $5, $6)', [
      userId,
      userName,
      displayName,
      pwd,
      email,
      createdAt,
    ]);
  } catch (error) {
    if (isPgErrorUniqueViolationError(error)) {
      return { type: SignUpVerifyResponseType.EmailOrUserNameAlreadyInUse };
    }
    return { type: SignUpVerifyResponseType.Fail };
  }
  const token = await createSessionToken(userId);
  return { type: SignUpVerifyResponseType.Success, userId, userName, displayName, email, token };
}

export function handleSignUpVerify(req: import('express').Request, res: import('express').Response): void {
  void getSignUpVerifyResponse(req)
    .catch((): SignUpVerifyResponse => ({ type: SignUpVerifyResponseType.Fail }))
    .then((responseJson) => {
      res.status(200).send(responseJson);
    });
}
