import * as path from 'path';
import * as md5 from 'md5';
import { pgup } from 'pgup';
import * as request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/database/pool';
import { Messages } from '../src/messages';

async function cleanUp(): Promise<void> {
  await pool.query(`
    DELETE FROM account
    WHERE username IN (
      '_TestUser1_',
      '_TestUser2_',
      '_TestUser3_'
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
          username: '_TestUser1_',
          password: 'password1',
        })
        .expect(({ body }) => Object.keys(body).sort() === successfulBodyKeys)
        .expect(({ body }) => typeof body.id === 'number')
        .expect(({ body }) => body.username === '_TestUser1_')
        .expect(({ body }) => body.email === null)
        .expect(201, done);
    });

    it('inserts account with email', (done) => {
      request(app.callback())
        .post('/api/v1')
        .send({
          username: '_TestUser2_',
          password: 'password2',
          email: 'test@mail.com',
        })
        .expect(({ body }) => Object.keys(body).sort() === successfulBodyKeys)
        .expect(({ body }) => typeof body.id === 'number')
        .expect(({ body }) => body.username === '_TestUser2_')
        .expect(({ body }) => body.email === 'test@mail.com')
        .expect(201, done);
    });

    it('hashes password', async (done) => {
      const hash = md5('password1');

      const res = await pool.query(`
        SELECT password
        FROM account
        WHERE username = '_TestUser1_';
      `);

      expect(res.rowCount).toBe(1);
      expect(res.rows[0].password).toBe(hash);
      done();
    });

    it('rejects invalid body', (done) => {
      request(app.callback())
        .post('/api/v1')
        .expect(({ text }) => text === Messages.MISSING_CREDENTIALS)
        .expect(400, done);
    });

    it('rejects invalid email', (done) => {
      request(app.callback())
        .post('/api/v1')
        .send({
          username: '_TestUser3_',
          password: 'password1',
          email: 'invalid_email',
        })
        .expect(({ text }) => text === Messages.INVALID_EMAIL_FORMAT)
        .expect(400, done);
    });

    it('rejects duplicate email', (done) => {
      request(app.callback())
        .post('/api/v1')
        .send({
          username: '_TestUser3_',
          password: 'password1',
          email: 'test@mail.com',
        })
        .expect(({ text }) => text === Messages.DUPLICATE_EMAIL)
        .expect(409, done);
    });

    it('rejects duplicate username', (done) => {
      request(app.callback())
        .post('/api/v1')
        .send({
          username: '_TestUser1_',
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
