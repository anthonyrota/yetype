import { useAuthentication } from '../authentication.js';
import { pool } from '../db.js';
import { ChangeAccountDetailsResponse, ChangeAccountDetailsResponseType, getValidChangeAccountDetailsRequest } from './changeAccountDetailsIo.js';

async function getChangeAccountDetailsResponse(req: import('express').Request): Promise<ChangeAccountDetailsResponse> {
  const requestData = getValidChangeAccountDetailsRequest(req.body);
  if (requestData === null) {
    return { type: ChangeAccountDetailsResponseType.Fail };
  }
  const { userName, displayName, email } = requestData;
  const authenticationDetails = await useAuthentication(req);
  if (authenticationDetails === null) {
    return { type: ChangeAccountDetailsResponseType.NotAuthorized };
  }
  const { userId } = authenticationDetails;
  const id = crypto.randomUUID();
  const queryResult = await pool.query(
    'insert into pending_user_details_changes (id, user_id, new_user_name, new_display_name, new_email, created_at) select $1, $2, $3::varchar(31), $4, $5::varchar(320), $6 where not exists (select 1 from users where users.id != $2 and (users.user_name = $3 or users.email = $5))',
    [id, userId, userName, displayName, email, new Date()],
  );
  if (queryResult.rowCount === 0) {
    return { type: ChangeAccountDetailsResponseType.EmailOrUserNameAlreadyInUse };
  }
  return { type: ChangeAccountDetailsResponseType.Success, pendingId: id };
}

export function handleChangeAccountDetails(req: import('express').Request, res: import('express').Response): void {
  void getChangeAccountDetailsResponse(req)
    .catch((): ChangeAccountDetailsResponse => ({ type: ChangeAccountDetailsResponseType.Fail }))
    .then((responseJson) => {
      res.status(200).send(responseJson);
    });
}
