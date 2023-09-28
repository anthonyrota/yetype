import { createSessionToken, doSha256, useAuthentication, verifyScrypt } from '../authentication.js';
import { pool } from '../db.js';
import { ReauthenticateResponse, ReauthenticateResponseType, getValidReauthenticateRequest } from './reauthenticateIo.js';

async function getReauthenticateResponse(req: import('express').Request): Promise<ReauthenticateResponse> {
  const requestData = getValidReauthenticateRequest(req.body);
  if (requestData === null) {
    return { type: ReauthenticateResponseType.Fail };
  }
  const { password } = requestData;
  const authenticationDetails = await useAuthentication(req);
  if (authenticationDetails === null) {
    return { type: ReauthenticateResponseType.NotAuthorized };
  }
  const { userId } = authenticationDetails;
  const queryResult = await pool.query('select user_name, display_name, email, pwd from users where id = $1', [userId]);
  if (queryResult.rowCount === 0) {
    return { type: ReauthenticateResponseType.IncorrectDetails };
  }
  const row: unknown = queryResult.rows[0];
  if (typeof row !== 'object' || row === null) {
    return { type: ReauthenticateResponseType.Fail };
  }
  const {
    user_name: userName,
    display_name: displayName,
    email,
    pwd: pwdHashed,
  } = row as { user_name: unknown; display_name: unknown; email: unknown; pwd: unknown };
  if (typeof userName !== 'string' || typeof displayName !== 'string' || typeof email !== 'string' || typeof pwdHashed !== 'string') {
    return { type: ReauthenticateResponseType.Fail };
  }
  const pwdSha = doSha256(password);
  const isCorrect = await verifyScrypt(pwdHashed, pwdSha);
  if (!isCorrect) {
    return { type: ReauthenticateResponseType.IncorrectDetails };
  }
  const token = await createSessionToken(userId);
  return { type: ReauthenticateResponseType.Success, userName, displayName, email, token };
}

export function handleReauthenticate(req: import('express').Request, res: import('express').Response): void {
  void getReauthenticateResponse(req)
    .catch((): ReauthenticateResponse => ({ type: ReauthenticateResponseType.Fail }))
    .then((responseJson) => {
      res.status(200).send(responseJson);
    });
}
