import * as Router from "koa-router";
import { queries } from "../../../database";

export const router = new Router();

const baseRoute = "/api/v1";

interface RegisterBody {
  username?: string;
  password?: string;
  email?: string;
}

router.post(`${baseRoute}/register`, async (ctx) => {
  const body: RegisterBody = ctx.request.body;

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
    !body.username.match(/^[a-zA-Z][a-zA-Z0-9_]*$/)
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

  if (body.email && !body.email.match(/\S+@\S+\.\S+/)) {
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

  if (!res.error) {
    ctx.status = 500;
    ctx.body = "Internal server error";
    return;
  }

  if (res.error === "accounts_username_key") {
    ctx.status = 409;
    ctx.body = "Username taken";
  } else if (res.error === "accounts_email_key") {
    ctx.status = 409;
    ctx.body = "Email taken";
  }
});
