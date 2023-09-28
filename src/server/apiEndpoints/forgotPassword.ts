import { doScrypt, doSha256, makeRandomPin } from '../authentication.js';
import { pool } from '../db.js';
import { sgMail } from '../sgMail.js';
import { ForgotPasswordResponse, ForgotPasswordResponseType, getValidForgotPasswordRequest } from './forgotPasswordIo.js';

const query = `insert into pending_user_password_resets (id, user_id, new_password, verification_code, verification_code_attempts, created_at)
select $1, users.id, $2, $3, $4, $5
from users
where users.email = $6`;

async function getForgotPasswordResponse(req: import('express').Request): Promise<ForgotPasswordResponse> {
  const requestData = getValidForgotPasswordRequest(req.body);
  if (requestData === null) {
    return { type: ForgotPasswordResponseType.Fail };
  }
  const { email, newPassword } = requestData;
  const pin = makeRandomPin();
  const pwdSha = doSha256(newPassword);
  const [pinH, pwdH] = await Promise.all([doScrypt(pin), doScrypt(pwdSha)]);
  const id = crypto.randomUUID();
  const queryResult = await pool.query(query, [id, pwdH, pinH, 0, new Date(), email]);
  if (queryResult.rowCount === 0) {
    return { type: ForgotPasswordResponseType.EmailNotRegistered };
  }
  const response = await sgMail.send({
    to: email,
    from: {
      email: 'noreply@yetype.com',
      name: 'YeType',
    },
    subject: 'Verify your YeType account',
    text: `You're verification pin is ${pin}`,
  });
  const { statusCode } = response[0];
  if (statusCode < 200 || statusCode >= 300) {
    return { type: ForgotPasswordResponseType.Fail };
  }
  return { type: ForgotPasswordResponseType.Success, pendingId: id };
}

export function handleForgotPassword(req: import('express').Request, res: import('express').Response): void {
  void getForgotPasswordResponse(req)
    .catch((): ForgotPasswordResponse => ({ type: ForgotPasswordResponseType.Fail }))
    .then((responseJson) => {
      res.status(200).send(responseJson);
    });
}
