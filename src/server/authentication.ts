import crypto from 'crypto';
import { pool } from './db.js';
import { authenticationAesSecretIv, authenticationAesSecretKey, authenticationVerificationSecretKey } from './env.js';

export function doSha256(string: string): string {
  return crypto.createHash('sha256').update(string, 'utf8').digest().toString('hex');
}

export function doScrypt(string: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(string, salt, 64, (error, hash) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(hash.toString('hex') + salt);
    });
  });
}

export function verifyScrypt(storedString: string, string: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const hash = storedString.slice(0, 128);
    const salt = storedString.slice(128);
    crypto.scrypt(string, salt, 64, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey.toString('hex') === hash);
    });
  });
}

const base62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
function randomBase62(): string {
  const digit = crypto.randomInt(0, 62);
  return base62[digit];
}

export function makeRandomPin(): string {
  const part1 = randomBase62();
  const part2 = randomBase62();
  const part3 = randomBase62();
  const part4 = randomBase62();
  const part5 = randomBase62();
  const part6 = randomBase62();
  const part7 = randomBase62();
  const part8 = randomBase62();
  return `${part1}${part2}${part3}${part4}${part5}${part6}${part7}${part8}`;
}

export const verificationCodeTimeWindowInSeconds = 600;
const maxVerificationCodeAttempts = 10;

export function getVerificationCodeMaxValidFutureDate(): Date {
  return new Date(new Date().getTime() + verificationCodeTimeWindowInSeconds * 1000);
}

export const enum VerificationCodeValidity {
  IsValid,
  IsLastAttemptValid,
  IsNotValid,
}

export function getVerificationCodeValidity(updatedVerificationCodeAttempts: number, createdAt: Date): VerificationCodeValidity {
  if (Date.now() - createdAt.getTime() > verificationCodeTimeWindowInSeconds * 1000) {
    return VerificationCodeValidity.IsNotValid;
  }
  if (updatedVerificationCodeAttempts === maxVerificationCodeAttempts) {
    return VerificationCodeValidity.IsLastAttemptValid;
  }
  if (updatedVerificationCodeAttempts > maxVerificationCodeAttempts) {
    return VerificationCodeValidity.IsNotValid;
  }
  return VerificationCodeValidity.IsValid;
}

type AuthenticationTokenJson = {
  id: string;
  pwd: string;
};
type ParsedToken = {
  encryptedAuthenticationToken: string;
  tag: string;
};
const authenticationAesKey = crypto.createHash('sha256').update(authenticationAesSecretKey).digest('hex').substring(0, 32);
const authenticationAesIv = crypto.createHash('sha256').update(authenticationAesSecretIv).digest('hex').substring(0, 16);
function encryptAuthenticationAes(string: string): string {
  const cipher = crypto.createCipheriv('aes-256-cbc', authenticationAesKey, authenticationAesIv);
  return Buffer.from(cipher.update(string, 'utf8', 'hex') + cipher.final('hex')).toString('base64');
}
function decryptAuthenticationAes(string: string): string {
  const buffer = Buffer.from(string, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-cbc', authenticationAesKey, authenticationAesIv);
  return decipher.update(buffer.toString('utf8'), 'hex', 'utf8') + decipher.final('utf8');
}
function getAuthenticationTag(string: string): string {
  return crypto.createHmac('sha256', authenticationVerificationSecretKey).update(string).digest('hex');
}
function storeAuthenticationTokenHeader(encryptedAuthenticationToken: string, tag: string): string {
  return encryptedAuthenticationToken + '.' + tag;
}
function parseAuthenticationTokenHeader(storedHeaderTokenValue: string): ParsedToken | null {
  const [encryptedAuthenticationToken, tag] = storedHeaderTokenValue.split('.') as (string | undefined)[];
  if (typeof encryptedAuthenticationToken !== 'string' || typeof tag !== 'string' || encryptedAuthenticationToken === '' || tag === '') {
    return null;
  }
  return {
    encryptedAuthenticationToken,
    tag,
  };
}

export async function createSessionToken(userId: string): Promise<string> {
  const sessionId = crypto.randomUUID();
  const sessionPassword = crypto.randomBytes(64).toString('base64');
  const json: AuthenticationTokenJson = { id: sessionId, pwd: sessionPassword };
  const decryptedAuthenticationToken = JSON.stringify(json);
  const tag = getAuthenticationTag(decryptedAuthenticationToken);
  const encryptedAuthenticationToken = encryptAuthenticationAes(decryptedAuthenticationToken);
  const token = storeAuthenticationTokenHeader(encryptedAuthenticationToken, tag);
  const sessionPasswordH = await doScrypt(sessionPassword);
  await pool.query('insert into user_sessions (id, pwd, user_id, created_at) values ($1, $2, $3, $4)', [sessionId, sessionPasswordH, userId, new Date()]);
  return token;
}

const secondsInHour = 3600;
const secondsInDay = 24 * secondsInHour;
const maxSessionTimeFromCreatedAtInSeconds = 90 * secondsInDay;

export async function useAuthentication(req: import('express').Request): Promise<{ sessionId: string; userId: string } | null> {
  const authHeader = req.header('authorization');
  if (!authHeader) {
    return null;
  }
  const splitAuthHeader = authHeader.split(' ');
  if (splitAuthHeader.length !== 2 || splitAuthHeader[0] !== 'Bearer') {
    return null;
  }
  const token = splitAuthHeader[1];
  if (token.length === 0) {
    return null;
  }
  const parsedToken = parseAuthenticationTokenHeader(token);
  if (parsedToken === null) {
    return null;
  }
  const { encryptedAuthenticationToken, tag } = parsedToken;
  let decryptedAuthenticationToken: string;
  try {
    decryptedAuthenticationToken = decryptAuthenticationAes(encryptedAuthenticationToken);
  } catch (error) {
    return null;
  }
  if (decryptedAuthenticationToken === '' || getAuthenticationTag(decryptedAuthenticationToken) !== tag) {
    return null;
  }
  let json: unknown;
  try {
    json = JSON.parse(decryptedAuthenticationToken);
  } catch (error) {
    return null;
  }
  if (typeof json !== 'object' || json === null || !('id' in json) || !('pwd' in json)) {
    return null;
  }
  const { id, pwd } = json;
  if (typeof pwd !== 'string' || typeof id !== 'string') {
    return null;
  }
  const queryResult = await pool.query('select pwd, user_id, created_at from user_sessions where id = $1', [id]);
  const row: unknown = queryResult.rows[0];
  if (
    typeof row !== 'object' ||
    row === null ||
    !('pwd' in row) ||
    !('user_id' in row) ||
    !('created_at' in row) ||
    typeof row.pwd !== 'string' ||
    typeof row.user_id !== 'string' ||
    !(row.created_at instanceof Date)
  ) {
    throw new Error();
  }
  const pwdHashed = row.pwd;
  const userId = row.user_id;
  const createdAt = row.created_at;
  const isCorrect = await verifyScrypt(pwdHashed, pwd);
  if (isCorrect && Date.now() - createdAt.getTime() <= maxSessionTimeFromCreatedAtInSeconds * 1000) {
    return {
      sessionId: id,
      userId,
    };
  }
  return null;
}

export async function getUserDetails(userId: string): Promise<{ userName: string; displayName: string; email: string } | null> {
  const queryResult = await pool.query('select user_name, display_name, email from users where id = $1', [userId]);
  if (queryResult.rowCount === 0) {
    return null;
  }
  const row: unknown = queryResult.rows[0];
  if (
    !(
      typeof row === 'object' &&
      row !== null &&
      'user_name' in row &&
      'display_name' in row &&
      'email' in row &&
      typeof row.user_name === 'string' &&
      typeof row.display_name === 'string' &&
      typeof row.email === 'string'
    )
  ) {
    throw new Error();
  }
  const userName = row.user_name;
  const displayName = row.display_name;
  const email = row.email;
  return {
    userName,
    displayName,
    email,
  };
}
