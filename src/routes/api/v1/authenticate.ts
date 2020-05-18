import * as Koa from "koa";
import { queries } from "../../../database";

interface AuthenticateBody {
  username?: string;
  password?: string;
}

export async function authenticate(ctx: Koa.Context): Promise<void> {
  const body: AuthenticateBody = ctx.request.body;

  if (!body.username) {
    ctx.status = 400;
    ctx.body = "Username required";
    return;
  }

  if (!body.password) {
    ctx.status = 400;
    ctx.body = "Password required";
    return;
  }

  const res = await queries.authenticateAccount({
    username: body.username,
    password: body.password,
  });

  if (res.ok) {
    ctx.status = 200;
    ctx.body = JSON.stringify(res.data);
    return;
  }

  if (res.error) {
    if (res.error === "not_found") {
      ctx.status = 401;
      ctx.body = "Not authenticated";
    }

    return;
  }

  ctx.status = 500;
  ctx.body = "Internal server error";
}
