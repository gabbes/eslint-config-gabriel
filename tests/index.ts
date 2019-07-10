import * as path from 'path';
import { pgup } from 'pgup';
import * as request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/database/pool';

async function cleanUp(): Promise<void> {
  await pool.query(`
    DELETE FROM account
    WHERE username = '_TestUser1_';
  `);
}

beforeAll(async (done) => {
  await cleanUp();
  await pgup(pool, { directory: path.resolve(__dirname, '../sql') });
  done();
});

describe('server', () => {
  it('other routes responds with 401', async (done) => {
    await request(app.callback())
      .get('/')
      .expect(401);

    done();
  });

  it('/api/v1 post request inserts account', async (done) => {
    await request(app.callback())
      .post('/api/v1')
      .send({
        username: '_TestUser1_',
        password: 'password1',
      })
      .expect(201);

    done();
  });
});

afterAll(async (done) => {
  await cleanUp();
  await pool.end();
  done();
});
