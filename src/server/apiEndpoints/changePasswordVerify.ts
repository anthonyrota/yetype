import { getVerificationCodeMaxValidFutureDate, useAuthentication } from '../authentication.js';
import { pool } from '../db.js';
import { ChangePasswordVerifyResponse, ChangePasswordVerifyResponseType, getValidChangePasswordVerifyRequest } from './changePasswordVerifyIo.js';

const query = `update users
set pwd = pending_user_password_changes.new_password
from pending_user_password_changes, user_sessions
where
  users.id = pending_user_password_changes.user_id
  and users.id = user_sessions.user_id
  and pending_user_password_changes.id = $1
  and users.id = $2
  and user_sessions.id = $3
  and user_sessions.created_at > pending_user_password_changes.created_at
  and user_sessions.created_at <= $4`;

async function getChangePasswordVerifyResponse(req: import('express').Request): Promise<ChangePasswordVerifyResponse> {
  const requestData = getValidChangePasswordVerifyRequest(req.body);
  if (requestData === null) {
    return { type: ChangePasswordVerifyResponseType.Fail };
  }
  const { pendingId } = requestData;
  const authenticationDetails = await useAuthentication(req);
  if (authenticationDetails === null) {
    return { type: ChangePasswordVerifyResponseType.NotAuthorized };
  }
  const { sessionId, userId } = authenticationDetails;
  const queryResult = await pool.query(query, [pendingId, userId, sessionId, getVerificationCodeMaxValidFutureDate()]);
  if (queryResult.rowCount === 0) {
    return { type: ChangePasswordVerifyResponseType.Fail };
  }
  return { type: ChangePasswordVerifyResponseType.Success };
}

export function handleChangePasswordVerify(req: import('express').Request, res: import('express').Response): void {
  void getChangePasswordVerifyResponse(req)
    .catch((): ChangePasswordVerifyResponse => ({ type: ChangePasswordVerifyResponseType.Fail }))
    .then((responseJson) => {
      res.status(200).send(responseJson);
    });
}
