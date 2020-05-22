import type { ParameterizedContext } from "koa";
import { queries } from "../../../../database";

const nameRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;
const emailRegex = /\S+@\S+\.\S+/;

interface Body {
  name?: string;
  password?: string;
  email?: string;
}

export async function userCreate(ctx: ParameterizedContext): Promise<void> {
  const body: Body = ctx.request.body;

  if (!body.name && !body.password) {
    ctx.status = 400;
    ctx.body = "Name and password required";
    return;
  }

  if (!body.name) {
    ctx.status = 400;
    ctx.body = "Name required";
    return;
  }

  if (!body.password) {
    ctx.status = 400;
    ctx.body = "Password required";
    return;
  }

  if (
    body.name.length < 2 ||
    body.name.length > 18 ||
    !body.name.match(nameRegex)
  ) {
    ctx.status = 400;
    ctx.body = "Invalid name input";
    return;
  }

  if (body.password.length < 6 || body.password.length > 128) {
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
    name: body.name,
    password: body.password,
    email: body.email,
  });

  if (res.ok) {
    ctx.status = 201;
    ctx.body = JSON.stringify(res.data);
    return;
  }

  if (res.error) {
    if (res.error === "users_name_key") {
      ctx.status = 409;
      ctx.body = "Name taken";
      return;
    } else if (res.error === "users_email_key") {
      ctx.status = 409;
      ctx.body = "Email taken";
      return;
    }
  }

  ctx.status = 500;
  ctx.body = "Internal server error";
}
