import * as md5 from 'md5';
import * as path from 'path';
import { pgup } from 'pgup';
import * as request from 'supertest';

import { app } from '../src/app';
import { pool } from '../src/database/pool';
import { Messages } from '../src/messages';

async function cleanUp(): Promise<void> {
  await pool.query(`
    DELETE FROM account
    WHERE username IN (
      'Test_User1',
      'Test_User2',
      'Test_User3'
    );
  `);
}

beforeAll(async (done) => {
  await pgup(pool, { directory: path.resolve(__dirname, '../sql') });
  await cleanUp();
  done();
});

describe('server', () => {
  it('other routes responds with 401', (done) => {
    request(app.callback())
      .get('/')
      .expect(401, done);
  });

  describe('/api/v1 post request', () => {
    const successfulBodyKeys = ['email', 'id', 'username'].sort();

    it('inserts account without email', (done) => {
      request(app.callback())
        .post('/api/v1')
        .send({
          username: 'Test_User1',
          password: 'password1',
        })
        .expect(({ body }) => Object.keys(body).sort() === successfulBodyKeys)
        .expect(({ body }) => typeof body.id === 'number')
        .expect(({ body }) => body.username === 'Test_User1')
        .expect(({ body }) => body.email === null)
        .expect(201, done);
    });

    it('inserts account with email', (done) => {
      request(app.callback())
        .post('/api/v1')
        .send({
          username: 'Test_User2',
          password: 'password2',
          email: 'test@mail.com',
        })
        .expect(({ body }) => Object.keys(body).sort() === successfulBodyKeys)
        .expect(({ body }) => typeof body.id === 'number')
        .expect(({ body }) => body.username === 'Test_User2')
        .expect(({ body }) => body.email === 'test@mail.com')
        .expect(201, done);
    });

    it('hashes password', async (done) => {
      const hash = md5('password1');

      const res = await pool.query(`
        SELECT password
        FROM account
        WHERE username = 'Test_User1';
      `);

      expect(res.rowCount).toBe(1);
      expect(res.rows[0].password).toBe(hash);
      done();
    });

    it('rejects invalid body (empty)', (done) => {
      request(app.callback())
        .post('/api/v1')
        .expect(({ text }) => text === Messages.MISSING_CREDENTIALS)
        .expect(400, done);
    });

    it('rejects invalid username (too short)', (done) => {
      request(app.callback())
        .post('/api/v1')
        .send({
          username: 'a',
          password: 'password3',
        })
        .expect(({ text }) => text === Messages.INPUT_INVALID_USERNAME)
        .expect(400, done);
    });

    it('rejects invalid username (too long)', (done) => {
      request(app.callback())
        .post('/api/v1')
        .send({
          username: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          password: 'password3',
        })
        .expect(({ text }) => text === Messages.INPUT_INVALID_USERNAME)
        .expect(400, done);
    });

    it('rejects invalid username (invalid character)', (done) => {
      request(app.callback())
        .post('/api/v1')
        .send({
          username: 'user-name',
          password: 'password3',
        })
        .expect(({ text }) => text === Messages.INPUT_INVALID_USERNAME)
        .expect(400, done);
    });

    it('rejects invalid username (initial underscore)', (done) => {
      request(app.callback())
        .post('/api/v1')
        .send({
          username: '_userName',
          password: 'password3',
        })
        .expect(({ text }) => text === Messages.INPUT_INVALID_USERNAME)
        .expect(400, done);
    });

    it('rejects invalid username (initial number)', (done) => {
      request(app.callback())
        .post('/api/v1')
        .send({
          username: '1userName',
          password: 'password3',
        })
        .expect(({ text }) => text === Messages.INPUT_INVALID_USERNAME)
        .expect(400, done);
    });

    it('rejects invalid password', (done) => {
      request(app.callback())
        .post('/api/v1')
        .send({
          username: 'Test_User3',
          password: 'passw',
        })
        .expect(({ text }) => text === Messages.INPUT_INVALID_PASSWORD)
        .expect(400, done);
    });

    it('rejects invalid email', (done) => {
      request(app.callback())
        .post('/api/v1')
        .send({
          username: 'Test_User3',
          password: 'password3',
          email: 'invalid_email',
        })
        .expect(({ text }) => text === Messages.INPUT_INVALID_EMAIL)
        .expect(400, done);
    });

    it('rejects duplicate email', (done) => {
      request(app.callback())
        .post('/api/v1')
        .send({
          username: 'Test_User3',
          password: 'password3',
          email: 'test@mail.com',
        })
        .expect(({ text }) => text === Messages.DUPLICATE_EMAIL)
        .expect(409, done);
    });

    it('rejects duplicate username', (done) => {
      request(app.callback())
        .post('/api/v1')
        .send({
          username: 'Test_User1',
          password: 'password1',
        })
        .expect(({ text }) => text === Messages.DUPLICATE_USERNAME)
        .expect(409, done);
    });
  });
});

afterAll(async (done) => {
  await cleanUp();
  await pool.end();
  done();
});
