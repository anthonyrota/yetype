import pg from 'pg';
import { postgresHost, postgresPassword, postgresUser } from './env.js';

export const pool = new pg.Pool({
  host: postgresHost,
  user: postgresUser,
  password: postgresPassword,
});

export function isPgErrorUniqueViolationError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}
