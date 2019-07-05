import * as Koa from 'koa';
import * as bodyParser from 'koa-bodyparser';

export const app = new Koa();

app.use(bodyParser());

app.use(async (ctx) => {
  ctx.status = 401;
});
