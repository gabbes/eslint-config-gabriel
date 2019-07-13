import * as path from 'path';
import { pgup } from 'pgup';

import { pool } from './pool';

export async function databaseMigration(): Promise<void> {
  const directory = path.resolve(__dirname, '../../sql');

  try {
    await pgup(pool, { directory });
  } catch (error) {
    console.error(error.stack);
    process.exit(1);
  }
}
