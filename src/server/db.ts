import pg from 'pg';

export const pool = new pg.Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'postgres',
});

export function isPgErrorUniqueViolationError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}
