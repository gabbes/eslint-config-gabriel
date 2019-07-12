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

  if (
    username.length < 2 ||
    username.length > 18 ||
    !username.match(/^[a-zA-Z][a-zA-Z0-9_]*$/)
  ) {
    ctx.status = 400;
    ctx.body = Messages.INPUT_INVALID_USERNAME;
    return;
  }

  if (password.length < 6) {
    ctx.status = 400;
    ctx.body = Messages.INPUT_INVALID_PASSWORD;
    return;
  }

  if (email) {
    if (!email.match(/\S+@\S+\.\S+/)) {
      ctx.status = 400;
      ctx.body = Messages.INPUT_INVALID_EMAIL;
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
    ctx.body = Messages.DUPLICATE_USERNAME;
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
