import { pool } from './pool';
import * as types from '../types';

export async function accountWithColumnValueExists(
  column: string,
  value: string | number
): Promise<boolean> {
  const seachValue = typeof value === 'string' ? `'${value}'` : value;

  const result = await pool.query(`
    SELECT *
    FROM account
    WHERE ${column} = ${seachValue};
  `);

  return !!result.rowCount;
}

export async function insertAccount(
  args: types.AccountInput
): Promise<null | types.AccountFromDatabase> {
  const res = await pool.query(`
    INSERT INTO account (
      username,
      password,
      ${args.email ? 'email,' : ''}
      created
    ) VALUES (
      '${args.username}',
      '${args.password}',
      ${args.email ? `'${args.email}',` : ''}
      NOW()
    )
    RETURNING id, username, email;
  `);

  if (!res.rowCount) {
    return null;
  }

  return res.rows[0];
}
