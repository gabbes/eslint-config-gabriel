import * as md5 from "md5";
import * as uuid from "uuid";
import { pool } from "./pool";

type Query<T> =
  | { data: T; error: null; ok: true }
  | { data: null; error?: string; ok: false };

interface Account {
  id: number;
  username: string;
  email: null | string;
}

export async function insertAccount(args: {
  username: string;
  password: string;
  email?: string;
}): Promise<Query<Account>> {
  try {
    const res = await pool.query<Account>(`
      INSERT INTO accounts (
        id,
        username,
        password,
        ${args.email ? "email," : ""}
        created
      ) VALUES (
        '${uuid.v4()}',
        '${args.username}',
        '${md5(args.password)}',
        ${args.email ? `'${args.email}',` : ""}
        NOW()
      )
      RETURNING id, username, email;
    `);

    if (!res.rowCount) {
      return {
        data: null,
        ok: false,
      };
    }

    return {
      data: res.rows[0],
      error: null,
      ok: true,
    };
  } catch (error) {
    return {
      data: null,
      error: error.constraint as string,
      ok: false,
    };
  }
}

export async function authenticateAccount(args: {
  username: string;
  password: string;
}): Promise<Query<Account>> {
  try {
    const res = await pool.query<Account>(`
      SELECT id, username, email
      FROM accounts
      WHERE username = '${args.username}'
      AND password = '${md5(args.password)}';
    `);

    if (!res.rowCount) {
      return {
        data: null,
        error: "not_found",
        ok: false,
      };
    }

    return {
      data: res.rows[0],
      error: null,
      ok: true,
    };
  } catch (error) {
    return {
      data: null,
      ok: false,
    };
  }
}
