import type { ParameterizedContext } from "koa";
import { queries } from "../../../../database";

const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;
const emailRegex = /\S+@\S+\.\S+/;

interface Body {
  username?: string;
  password?: string;
  email?: string;
}

export async function userCreate(ctx: ParameterizedContext): Promise<void> {
  const body: Body = ctx.request.body;

  if (!body.username && !body.password) {
    ctx.status = 400;
    ctx.body = "Username and password required";
    return;
  }

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

  if (
    body.username.length < 2 ||
    body.username.length > 18 ||
    !body.username.match(usernameRegex)
  ) {
    ctx.status = 400;
    ctx.body = "Invalid username input";
    return;
  }

  if (body.password.length < 6) {
    ctx.status = 400;
    ctx.body = "Invalid password";
    return;
  }

  if (body.email && !body.email.match(emailRegex)) {
    ctx.status = 400;
    ctx.body = "Invalid email";
    return;
  }

  const res = await queries.insertAccount({
    username: body.username,
    password: body.password,
    email: body.email,
  });

  if (res.ok) {
    ctx.status = 201;
    ctx.body = JSON.stringify(res.data);
    return;
  }

  if (res.error) {
    if (res.error === "accounts_username_key") {
      ctx.status = 409;
      ctx.body = "Username taken";
      return;
    } else if (res.error === "accounts_email_key") {
      ctx.status = 409;
      ctx.body = "Email taken";
      return;
    }
  }

  ctx.status = 500;
  ctx.body = "Internal server error";
}
