import { useAuthentication } from '../authentication.js';
import { pool } from '../db.js';
import { LogOutResponse, LogOutResponseType } from './logOutIo.js';

async function getLogOutResponse(req: import('express').Request): Promise<LogOutResponse> {
  const authenticationDetails = await useAuthentication(req);
  if (authenticationDetails === null) {
    return { type: LogOutResponseType.Fail };
  }
  const { sessionId } = authenticationDetails;
  await pool.query('delete from user_sessions where id = $1', [sessionId]);
  return { type: LogOutResponseType.Success };
}

export function handleLogOut(req: import('express').Request, res: import('express').Response): void {
  void getLogOutResponse(req)
    .catch((): LogOutResponse => ({ type: LogOutResponseType.Fail }))
    .then((responseJson) => {
      res.status(200).send(responseJson);
    });
}
