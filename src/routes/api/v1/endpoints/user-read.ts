import * as basicAuth from "basic-auth";
import type { ParameterizedContext } from "koa";
import { queries } from "../../../../database";
import * as jwt from "../jwt";

export async function userRead(ctx: ParameterizedContext): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = basicAuth(ctx as any);

  if (!user || (!user.name && !user.pass)) {
    ctx.status = 401;
    ctx.body = "Basic authentication required";
    return;
  }

  if (!user.name) {
    ctx.status = 401;
    ctx.body = "Basic authentication name required";
    return;
  }

  if (!user.pass) {
    ctx.status = 401;
    ctx.body = "Basic authentication password required";
    return;
  }

  const res = await queries.readUser({
    name: user.name,
    password: user.pass,
  });

  if (res.ok) {
    ctx.status = 200;
    ctx.body = jwt.sign(res.data);
    return;
  }

  if (res.error === "not_found") {
    ctx.status = 401;
    ctx.body = "Unauthorized";
    return;
  }

  ctx.status = 500;
  ctx.body = "Internal server error";
}
