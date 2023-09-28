import { getVerificationCodeMaxValidFutureDate, useAuthentication } from '../authentication.js';
import { pool } from '../db.js';
import { DeleteAccountVerifyResponse, DeleteAccountVerifyResponseType, getValidDeleteAccountVerifyRequest } from './deleteAccountVerifyIo.js';

const query = `delete from users
using pending_user_deletions, user_sessions
where
  users.id = pending_user_deletions.user_id
  and users.id = user_sessions.user_id
  and pending_user_deletions.id = $1
  and users.id = $2
  and user_sessions.id = $3
  and user_sessions.created_at > pending_user_deletions.created_at
  and user_sessions.created_at <= $4`;

async function getDeleteAccountVerifyResponse(req: import('express').Request): Promise<DeleteAccountVerifyResponse> {
  const requestData = getValidDeleteAccountVerifyRequest(req.body);
  if (requestData === null) {
    return { type: DeleteAccountVerifyResponseType.Fail };
  }
  const { pendingId } = requestData;
  const authenticationDetails = await useAuthentication(req);
  if (authenticationDetails === null) {
    return { type: DeleteAccountVerifyResponseType.NotAuthorized };
  }
  const { sessionId, userId } = authenticationDetails;
  const queryResult = await pool.query(query, [pendingId, userId, sessionId, getVerificationCodeMaxValidFutureDate()]);
  if (queryResult.rowCount === 0) {
    return { type: DeleteAccountVerifyResponseType.Fail };
  }
  return { type: DeleteAccountVerifyResponseType.Success };
}

export function handleDeleteAccountVerify(req: import('express').Request, res: import('express').Response): void {
  void getDeleteAccountVerifyResponse(req)
    .catch((): DeleteAccountVerifyResponse => ({ type: DeleteAccountVerifyResponseType.Fail }))
    .then((responseJson) => {
      res.status(200).send(responseJson);
    });
}
