import * as Koa from "koa";
import { queries } from "../../../database";

interface RemoveBody {
  username?: string;
  password?: string;
}

export async function remove(ctx: Koa.Context): Promise<void> {
  const body: RemoveBody = ctx.request.body;

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

  const authRes = await queries.authenticateAccount({
    username: body.username,
    password: body.password,
  });

  if (!authRes.ok) {
    if (authRes.error) {
      if (authRes.error === "not_found") {
        ctx.status = 401;
        ctx.body = "Invalid credentials";
        return;
      }
    }

    ctx.status = 500;
    ctx.body = "Internal server error";
    return;
  }

  const removeRes = await queries.deleteAccount({
    username: body.username,
    password: body.password,
  });

  if (removeRes.ok) {
    ctx.status = 204;
    return;
  }

  ctx.status = 500;
  ctx.body = "Internal server error";
}
