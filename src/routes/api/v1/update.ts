import type { ParameterizedContext } from "koa";
import { queries } from "../../../database";

interface UpdateBody {
  username?: string;
  password?: string;
  email?: null | string;
}

export async function update(
  ctx: ParameterizedContext<{ accountId: string }>
): Promise<void> {
  const body: UpdateBody = ctx.request.body;

  if (!body || (!body.username && !body.password && body.email === undefined)) {
    ctx.status = 400;
    ctx.body = "Invalid input";
    return;
  }

  if (body.password && body.password.length < 6) {
    ctx.status = 400;
    ctx.body = "Invalid input password";
    return;
  }

  if (
    body.username &&
    (body.username.length < 2 ||
      body.username.length > 18 ||
      !body.username.match(/^[a-zA-Z][a-zA-Z0-9_]*$/))
  ) {
    ctx.status = 400;
    ctx.body = "Invalid input username";
    return;
  }

  if (body.email && !body.email.match(/\S+@\S+\.\S+/)) {
    ctx.status = 400;
    ctx.body = "Invalid input email";
    return;
  }

  const updateRes = await queries.updateAccount({
    id: ctx.state.accountId,
    input: {
      username: body.username,
      password: body.password,
      email: body.email,
    },
  });

  if (updateRes.ok) {
    ctx.status = 200;
    ctx.body = JSON.stringify(updateRes.data);
    return;
  }

  if (updateRes.error) {
    if (updateRes.error === "accounts_username_key") {
      ctx.status = 409;
      ctx.body = "Username taken";
      return;
    } else if (updateRes.error === "accounts_email_key") {
      ctx.status = 409;
      ctx.body = "Email taken";
      return;
    }
  }

  ctx.status = 500;
  ctx.body = "Internal server error";
}
