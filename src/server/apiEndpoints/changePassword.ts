import { doScrypt, doSha256, useAuthentication } from '../authentication.js';
import { pool } from '../db.js';
import { ChangePasswordResponse, ChangePasswordResponseType, getValidChangePasswordRequest } from './changePasswordIo.js';

async function getChangePasswordResponse(req: import('express').Request): Promise<ChangePasswordResponse> {
  const requestData = getValidChangePasswordRequest(req.body);
  if (requestData === null) {
    return { type: ChangePasswordResponseType.Fail };
  }
  const { newPassword } = requestData;
  const authenticationDetails = await useAuthentication(req);
  if (authenticationDetails === null) {
    return { type: ChangePasswordResponseType.NotAuthorized };
  }
  const { userId } = authenticationDetails;
  const id = crypto.randomUUID();
  const pwdSha = doSha256(newPassword);
  const pwdH = await doScrypt(pwdSha);
  await pool.query('insert into pending_user_password_changes (id, user_id, new_password, created_at) values ($1, $2, $3, $4)', [id, userId, pwdH, new Date()]);
  return { type: ChangePasswordResponseType.Success, pendingId: id };
}

export function handleChangePassword(req: import('express').Request, res: import('express').Response): void {
  void getChangePasswordResponse(req)
    .catch((): ChangePasswordResponse => ({ type: ChangePasswordResponseType.Fail }))
    .then((responseJson) => {
      res.status(200).send(responseJson);
    });
}
