import type { ParameterizedContext } from "koa";
import { queries } from "../../../../database";
import { ErrorCode, validEmailRegex, validNameRegex } from "../constants";
import * as jwt from "../jwt";

interface Body {
  name?: string;
  password?: string;
  email?: string;
}

export async function userCreate(ctx: ParameterizedContext): Promise<void> {
  const body: Body = ctx.request.body;

  if (!body.name && !body.password) {
    ctx.status = 400;
    ctx.body = ErrorCode.UserNameAndPasswordRequired;
    return;
  }

  if (!body.name) {
    ctx.status = 400;
    ctx.body = ErrorCode.UserNameRequired;
    return;
  }

  if (!body.password) {
    ctx.status = 400;
    ctx.body = ErrorCode.UserPasswordRequired;
    return;
  }

  if (body.name.length < 2) {
    ctx.status = 400;
    ctx.body = ErrorCode.UserNameMinimum2Characters;
    return;
  }

  if (body.name.length > 18) {
    ctx.status = 400;
    ctx.body = ErrorCode.UserNameMaximum18Characters;
    return;
  }

  if (!body.name.match(validNameRegex)) {
    ctx.status = 400;
    ctx.body = ErrorCode.UserNameContainsInvalidCharacters;
    return;
  }

  if (body.password.length < 6) {
    ctx.status = 400;
    ctx.body = ErrorCode.UserPasswordMinimum6Characters;
    return;
  }

  if (body.password.length > 128) {
    ctx.status = 400;
    ctx.body = ErrorCode.UserPasswordMaximum128Characters;
    return;
  }

  if (body.email && !body.email.match(validEmailRegex)) {
    ctx.status = 400;
    ctx.body = ErrorCode.UserEmailInvalidFormat;
    return;
  }

  const res = await queries.createUser({
    name: body.name,
    password: body.password,
    email: body.email,
  });

  if (res.ok) {
    ctx.status = 201;
    ctx.body = jwt.sign(res.data);
    return;
  }

  if (res.error) {
    if (res.error === "users_name_key") {
      ctx.status = 409;
      ctx.body = ErrorCode.UserNameTaken;
      return;
    } else if (res.error === "users_email_key") {
      ctx.status = 409;
      ctx.body = ErrorCode.UserEmailTaken;
      return;
    }
  }

  ctx.status = 500;
  ctx.body = ErrorCode.UnexpectedError;
}
