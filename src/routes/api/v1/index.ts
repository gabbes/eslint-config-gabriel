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

  if (res.error) {
    if (res.error === "accounts_username_key") {
      ctx.status = 409;
      ctx.body = "Username taken";
    } else if (res.error === "accounts_email_key") {
      ctx.status = 409;
      ctx.body = "Email taken";
    }

    return;
  }

  ctx.status = 500;
  ctx.body = "Internal server error";
});

interface AuthenticateBody {
  username?: string;
  password?: string;
}

router.get(`${baseRoute}/authenticate`, async (ctx) => {
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
});

interface UpdateBody {
  username?: string;
  password?: string;
  input: {
    username?: string;
    password?: string;
    email?: null | string;
  };
}

router.post(`${baseRoute}/update`, async (ctx) => {
  const body: UpdateBody = ctx.request.body;

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

  if (
    !body.input ||
    (!body.input.username && !body.input.password && !body.input.email)
  ) {
    ctx.status = 400;
    ctx.body = "Invalid input";
    return;
  }

  if (body.input.password && body.input.password.length < 6) {
    ctx.status = 400;
    ctx.body = "Invalid input password";
    return;
  }

  if (
    body.input.username &&
    (body.input.username.length < 2 ||
      body.input.username.length > 18 ||
      !body.input.username.match(/^[a-zA-Z][a-zA-Z0-9_]*$/))
  ) {
    ctx.status = 400;
    ctx.body = "Invalid input username";
    return;
  }

  if (body.input.email && !body.input.email.match(/\S+@\S+\.\S+/)) {
    ctx.status = 400;
    ctx.body = "Invalid input email";
    return;
  }

  const updateRes = await queries.updateAccount({
    username: body.username,
    password: body.password,
    input: {
      username: body.input.username,
      password: body.input.password,
      email: body.input.email,
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
});
