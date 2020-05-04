import * as Koa from "koa";
import * as bodyParser from "koa-bodyparser";
import { router as apiV1 } from "./routes/api/v1";

export const app = new Koa();

app.use(bodyParser());
app.use(apiV1.routes());
app.use(apiV1.allowedMethods());

app.use(async (ctx) => {
  ctx.status = 401;
});
