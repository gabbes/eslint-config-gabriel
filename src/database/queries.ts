import * as md5 from "md5";
import * as uuid from "uuid";
import { pool } from "./pool";

type Query<T> =
  | { data: T; error: null; ok: true }
  | { data: null; error?: string; ok: false };

interface Account {
  id: number;
  name: string;
  email: null | string;
}

export async function insertAccount(args: {
  name: string;
  password: string;
  email?: string;
}): Promise<Query<Account>> {
  try {
    const res = await pool.query<Account>(`
      INSERT INTO users (
        id,
        name,
        password,
        ${args.email ? "email," : ""}
        created
      ) VALUES (
        '${uuid.v4()}',
        '${args.name}',
        '${md5(args.password)}',
        ${args.email ? `'${args.email}',` : ""}
        NOW()
      )
      RETURNING id, name, email;
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
  name: string;
  password: string;
}): Promise<Query<{ id: string }>> {
  try {
    const res = await pool.query<{ id: string }>(`
      SELECT id
      FROM users
      WHERE name = '${args.name}'
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

export async function getAccount(args: {
  id: string;
}): Promise<Query<Account>> {
  try {
    const res = await pool.query<Account>(`
      SELECT id, name, email
      FROM users
      WHERE id = '${args.id}';
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

export async function updateAccount(args: {
  id: string;
  input: {
    name?: string;
    password?: string;
    email?: null | string;
  };
}): Promise<Query<Account>> {
  try {
    if (args.input.password) {
      args.input.password = md5(args.input.password);
    }

    const setValues = Object.entries(args.input)
      .filter((entries) => entries[1] !== undefined)
      .map(([key, value]) => {
        return value === null ? `${key} = NULL` : `${key} = '${value}'`;
      })
      .join(",");

    const res = await pool.query<Account>(`
      UPDATE users
      SET ${setValues}
      WHERE id = '${args.id}'
      RETURNING id, name, email;
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

export async function deleteAccount(args: {
  id: string;
}): Promise<Query<null>> {
  try {
    await pool.query<Account>(`
      DELETE FROM users
      WHERE id = '${args.id}';
    `);

    return {
      data: null,
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
