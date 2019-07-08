import * as Router from 'koa-router';
import { Messages } from '../../../messages';
import { AccountInput } from '../../../types';
import { queries } from '../../../database';

export const router = new Router();

const baseRoute = '/api/v1';

router.post(baseRoute, async (ctx) => {
  const { email, password, username }: Partial<AccountInput> = ctx.request.body;

  if (!username || !password) {
    ctx.status = 400;
    ctx.body = Messages.MISSING_CREDENTIALS;
    return;
  }

  if (email) {
    if (!email.match(/\S+@\S+\.\S+/)) {
      ctx.status = 400;
      ctx.body = Messages.INVALID_EMAIL_FORMAT;
      return;
    }

    if (await queries.accountWithColumnValueExists('email', email)) {
      ctx.status = 409;
      ctx.body = Messages.DUPLICATE_EMAIL;
      return;
    }
  }

  if (await queries.accountWithColumnValueExists('username', username)) {
    ctx.status = 409;
    ctx.body = Messages.DUPLICATE_EMAIL;
    return;
  }

  const account = await queries.insertAccount({ email, password, username });

  if (!account) {
    ctx.status = 500;
    ctx.body = Messages.INTERNAL_SERVER_ERROR;
    return;
  }

  ctx.status = 201;
  ctx.body = account;
});
