import type { ParameterizedContext } from "koa";
import { queries } from "../../../../database";
import * as jwt from "../jwt";

const nameRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;
const emailRegex = /\S+@\S+\.\S+/;

interface Body {
  name?: string;
  password?: string;
  email?: null | string;
}

export async function userUpdate(
  ctx: ParameterizedContext<{ userId: string }>
): Promise<void> {
  const body: Body = ctx.request.body;

  if (!body || (!body.name && !body.password && body.email === undefined)) {
    ctx.status = 400;
    ctx.body = "Invalid input";
    return;
  }

  if (
    body.password &&
    (body.password.length < 6 || body.password.length > 128)
  ) {
    ctx.status = 400;
    ctx.body = "Invalid input password";
    return;
  }

  if (
    body.name &&
    (body.name.length < 2 ||
      body.name.length > 18 ||
      !body.name.match(nameRegex))
  ) {
    ctx.status = 400;
    ctx.body = "Invalid input name";
    return;
  }

  if (body.email && !body.email.match(emailRegex)) {
    ctx.status = 400;
    ctx.body = "Invalid input email";
    return;
  }

  const updateRes = await queries.updateUser({
    id: ctx.state.userId,
    input: {
      name: body.name,
      password: body.password,
      email: body.email,
    },
  });

  if (updateRes.ok) {
    ctx.status = 200;
    ctx.body = jwt.sign(updateRes.data);
    return;
  }

  if (updateRes.error) {
    if (updateRes.error === "users_name_key") {
      ctx.status = 409;
      ctx.body = "Name taken";
      return;
    } else if (updateRes.error === "users_email_key") {
      ctx.status = 409;
      ctx.body = "Email taken";
      return;
    }
  }

  ctx.status = 500;
  ctx.body = "Internal server error";
}
