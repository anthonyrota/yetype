import path from 'path';
import url from 'url';
import dotenv from 'dotenv';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const isProduction = process.env.NODE_ENV === 'production';
if (!isProduction) {
  dotenv.config({ path: path.join(__dirname, '..', '..', 'env', 'development.env') });
  dotenv.config({ path: path.join(__dirname, '..', '..', 'env', 'development-postgres.env') });
}

const envPostgresHost = process.env.POSTGRES_HOST;
const envPostgresUser = process.env.POSTGRES_USER;
const envPostgresPassword = process.env.POSTGRES_PASSWORD;
const envAuthenticationAesSecretKey = process.env.AUTHENTICATION_AES_SECRET_KEY;
const envAuthenticationAesSecretIv = process.env.AUTHENTICATION_AES_SECRET_IV;
const envAuthenticationVerificationSecretKey = process.env.AUTHENTICATION_VERIFICATION_SECRET_KEY;
const envSgApiKey = process.env.SG_API_KEY;

if (
  !envPostgresHost ||
  !envPostgresUser ||
  !envPostgresPassword ||
  !envAuthenticationAesSecretKey ||
  !envAuthenticationAesSecretIv ||
  !envAuthenticationVerificationSecretKey ||
  !envSgApiKey
) {
  throw new Error('Undefined env variable(s).');
}

export const postgresHost = envPostgresHost;
export const postgresUser = envPostgresUser;
export const postgresPassword = envPostgresPassword;
export const authenticationAesSecretKey = envAuthenticationAesSecretKey;
export const authenticationAesSecretIv = envAuthenticationAesSecretIv;
export const authenticationVerificationSecretKey = envAuthenticationVerificationSecretKey;
export const sgApiKey = envSgApiKey;
