import * as path from 'path';
import { pgup } from 'pgup';
import * as request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/database/pool';

beforeAll(async (done) => {
  await pgup(pool, { directory: path.resolve(__dirname, '../sql') });
  done();
});

describe('server', () => {
  it('get /api/v1 responds with 200', async (done) => {
    await request(app.callback())
      .get('/api/v1')
      .expect(200);

    done();
  });

  it('other routes responds with 401', async (done) => {
    await request(app.callback())
      .get('/')
      .expect(401);

    done();
  });
});

afterAll(async (done) => {
  await pool.end();
  done();
});
