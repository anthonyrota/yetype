import { useAuthentication } from '../authentication.js';
import { pool } from '../db.js';
import { DeleteAccountResponse, DeleteAccountResponseType } from './deleteAccountIo.js';

async function getDeleteAccountResponse(req: import('express').Request): Promise<DeleteAccountResponse> {
  const authenticationDetails = await useAuthentication(req);
  if (authenticationDetails === null) {
    return { type: DeleteAccountResponseType.NotAuthorized };
  }
  const { userId } = authenticationDetails;
  const id = crypto.randomUUID();
  await pool.query('insert into pending_user_deletions (id, user_id, created_at) values ($1, $2, $3)', [id, userId, new Date()]);
  return { type: DeleteAccountResponseType.Success, pendingId: id };
}

export function handleDeleteAccount(req: import('express').Request, res: import('express').Response): void {
  void getDeleteAccountResponse(req)
    .catch((): DeleteAccountResponse => ({ type: DeleteAccountResponseType.Fail }))
    .then((responseJson) => {
      res.status(200).send(responseJson);
    });
}
