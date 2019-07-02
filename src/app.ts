import * as Koa from 'koa';

const app = new Koa();

app.use(async (ctx) => {
  ctx.status = 401;
});

export { app };
