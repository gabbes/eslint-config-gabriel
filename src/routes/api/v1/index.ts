import * as Router from 'koa-router';

export const router = new Router();

const baseRoute = '/api/v1';

router.get(baseRoute, async (ctx) => {
  ctx.status = 200;
  ctx.body = 'success';
});
