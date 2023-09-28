import { doScrypt, getVerificationCodeMaxValidFutureDate, makeRandomPin, useAuthentication } from '../authentication.js';
import { isPgErrorUniqueViolationError, pool } from '../db.js';
import { sgMail } from '../sgMail.js';
import {
  ChangeAccountDetailsVerifyResponse,
  ChangeAccountDetailsVerifyResponseType,
  getValidChangeAccountDetailsVerifyRequest,
} from './changeAccountDetailsVerifyIo.js';

const query = `update users
set user_name = case
    when exists (select id, email from users where id != $2 and email = pending_user_details_changes.new_email) then user_name
    else pending_user_details_changes.new_user_name
  end,
  display_name = case
    when exists (select id, email from users where id != $2 and email = pending_user_details_changes.new_email) then display_name
    else pending_user_details_changes.new_display_name
  end
from pending_user_details_changes, user_sessions
where users.id = pending_user_details_changes.user_id
  and users.id = user_sessions.user_id
  and pending_user_details_changes.id = $1
  and users.id = $2
  and user_sessions.id = $3
  and user_sessions.created_at > pending_user_details_changes.created_at
  and user_sessions.created_at <= $4
returning users.user_name as new_user_name,
  users.display_name as new_display_name,
  pending_user_details_changes.new_email as new_email,
  case
    when users.email = pending_user_details_changes.new_email then 0
    when exists (select email from users where email = pending_user_details_changes.new_email) then 1
    else 2
  end`;

async function getChangeAccountDetailsVerifyResponse(req: import('express').Request): Promise<ChangeAccountDetailsVerifyResponse> {
  const requestData = getValidChangeAccountDetailsVerifyRequest(req.body);
  if (requestData === null) {
    return { type: ChangeAccountDetailsVerifyResponseType.Fail };
  }
  const { pendingId } = requestData;
  const authenticationDetails = await useAuthentication(req);
  if (authenticationDetails === null) {
    return { type: ChangeAccountDetailsVerifyResponseType.NotAuthorized };
  }
  const { sessionId, userId } = authenticationDetails;
  let queryResult: import('pg').QueryResult;
  try {
    queryResult = await pool.query(query, [pendingId, userId, sessionId, getVerificationCodeMaxValidFutureDate()]);
  } catch (error) {
    if (isPgErrorUniqueViolationError(error)) {
      return { type: ChangeAccountDetailsVerifyResponseType.EmailOrUserNameAlreadyInUse };
    }
    return { type: ChangeAccountDetailsVerifyResponseType.Fail };
  }
  if (queryResult.rowCount === 0) {
    return { type: ChangeAccountDetailsVerifyResponseType.Fail };
  }
  const row: unknown = queryResult.rows[0];
  if (
    typeof row !== 'object' ||
    row === null ||
    !('new_user_name' in row) ||
    typeof row.new_user_name !== 'string' ||
    !('new_display_name' in row) ||
    typeof row.new_display_name !== 'string' ||
    !('new_email' in row) ||
    typeof row.new_email !== 'string' ||
    !('case' in row) ||
    (row.case !== 0 && row.case !== 1 && row.case !== 2)
  ) {
    return { type: ChangeAccountDetailsVerifyResponseType.Fail };
  }
  const newUserName = row.new_user_name;
  const newDisplayName = row.new_display_name;
  const newEmail = row.new_email;
  const caseResult = row.case;
  await pool.query('delete from pending_user_details_changes where id = $1', [pendingId]);
  if (caseResult === 0) {
    return { type: ChangeAccountDetailsVerifyResponseType.Success, userName: newUserName, displayName: newDisplayName };
  }
  if (caseResult === 1) {
    return { type: ChangeAccountDetailsVerifyResponseType.EmailOrUserNameAlreadyInUse };
  }
  const pin = makeRandomPin();
  const pinH = await doScrypt(pin);
  const emailChangeId = crypto.randomUUID();
  await pool.query(
    'insert into pending_user_email_changes (id, user_id, email, verification_code, verification_code_attempts, created_at) values ($1, $2, $3, $4, $5, $6)',
    [emailChangeId, userId, newEmail, pinH, 0, new Date()],
  );
  const response = await sgMail.send({
    to: newEmail,
    from: {
      email: 'noreply@yetype.com',
      name: 'YeType',
    },
    subject: 'Verify your YeType account',
    text: `Your verification pin is ${pin}`,
  });
  const { statusCode } = response[0];
  if (statusCode < 200 || statusCode >= 300) {
    return { type: ChangeAccountDetailsVerifyResponseType.Fail };
  }
  return { type: ChangeAccountDetailsVerifyResponseType.Success, userName: newUserName, displayName: newDisplayName, pendingId: emailChangeId };
}

export function handleChangeAccountDetailsVerify(req: import('express').Request, res: import('express').Response): void {
  void getChangeAccountDetailsVerifyResponse(req)
    .catch((): ChangeAccountDetailsVerifyResponse => ({ type: ChangeAccountDetailsVerifyResponseType.Fail }))
    .then((responseJson) => {
      res.status(200).send(responseJson);
    });
}
