import { doScrypt, doSha256, makeRandomPin } from '../authentication.js';
import { pool } from '../db.js';
import { sgMail } from '../sgMail.js';
import { SignUpResponse, SignUpResponseType, getValidSignUpRequest } from './signUpIo.js';

async function getSignUpResponse(req: import('express').Request): Promise<SignUpResponse> {
  const requestData = getValidSignUpRequest(req.body);
  if (requestData === null) {
    return { type: SignUpResponseType.Fail };
  }
  const { userName, displayName, email, password } = requestData;
  const pin = makeRandomPin();
  const pwdSha = doSha256(password);
  const [pinH, pwdH] = await Promise.all([doScrypt(pin), doScrypt(pwdSha)]);
  const id = crypto.randomUUID();
  const queryResult = await pool.query(
    'insert into pending_unverified_users (id, user_name, display_name, pwd, email, verification_code, verification_code_attempts, created_at) select $1, $2::varchar(31), $3, $4, $5::varchar(320), $6, $7, $8 where not exists (select 1 from users where user_name = $2 or email = $5)',
    [id, userName, displayName, pwdH, email, pinH, 0, new Date()],
  );
  if (queryResult.rowCount === 0) {
    return { type: SignUpResponseType.EmailOrUserNameAlreadyInUse };
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
    return { type: SignUpResponseType.Fail };
  }
  return { type: SignUpResponseType.Success, pendingId: id };
}

export function handleSignUp(req: import('express').Request, res: import('express').Response): void {
  void getSignUpResponse(req)
    .catch((): SignUpResponse => ({ type: SignUpResponseType.Fail }))
    .then((responseJson) => {
      res.status(200).send(responseJson);
    });
}
