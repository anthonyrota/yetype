import { createSessionToken, doSha256, verifyScrypt } from '../authentication.js';
import { pool } from '../db.js';
import { LogInResponse, LogInResponseType, getValidLogInRequest } from './logInIo.js';

async function getLogInResponse(req: import('express').Request): Promise<LogInResponse> {
  const requestData = getValidLogInRequest(req.body);
  if (requestData === null) {
    return { type: LogInResponseType.Fail };
  }
  const { userNameOrEmail, password } = requestData;
  const queryResult = await pool.query('select id, user_name, display_name, email, pwd from users where user_name = $1 or email = $1', [userNameOrEmail]);
  if (queryResult.rowCount === 0) {
    return { type: LogInResponseType.IncorrectDetails };
  }
  const row: unknown = queryResult.rows[0];
  if (typeof row !== 'object' || row === null) {
    return { type: LogInResponseType.Fail };
  }
  const {
    id: userId,
    user_name: userName,
    display_name: displayName,
    email,
    pwd: pwdHashed,
  } = row as { id: unknown; user_name: unknown; display_name: unknown; email: unknown; pwd: unknown };
  if (
    typeof userId !== 'string' ||
    typeof userName !== 'string' ||
    typeof displayName !== 'string' ||
    typeof email !== 'string' ||
    typeof pwdHashed !== 'string'
  ) {
    return { type: LogInResponseType.Fail };
  }
  const pwdSha = doSha256(password);
  const isCorrect = await verifyScrypt(pwdHashed, pwdSha);
  if (!isCorrect) {
    return { type: LogInResponseType.IncorrectDetails };
  }
  const token = await createSessionToken(userId);
  return { type: LogInResponseType.Success, userId, userName, displayName, email, token };
}

export function handleLogIn(req: import('express').Request, res: import('express').Response): void {
  void getLogInResponse(req)
    .catch((): LogInResponse => ({ type: LogInResponseType.Fail }))
    .then((responseJson) => {
      res.status(200).send(responseJson);
    });
}
