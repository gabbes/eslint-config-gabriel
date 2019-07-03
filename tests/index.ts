import * as request from 'supertest';
import { app } from '../src/app';

describe('server', () => {
  it('responds with 401', async (done) => {
    await request(app.callback())
      .get('/')
      .expect(401);

    done();
  });
});
