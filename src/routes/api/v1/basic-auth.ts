import * as getContextUser from "basic-auth";
import type { Next, ParameterizedContext } from "koa";
import { queries } from "../../../database";

export async function basicAuth(
  ctx: ParameterizedContext,
  next: Next
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = getContextUser(ctx as any);

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

  const res = await queries.authenticateAccount({
    name: user.name,
    password: user.pass,
  });

  if (res.ok) {
    ctx.state.accountId = res.data.id;
    return await next();
  }

  if (res.error === "not_found") {
    ctx.status = 401;
    ctx.body = "Unauthorized";
    return;
  }

  ctx.status = 500;
  ctx.body = "Internal server error";
}