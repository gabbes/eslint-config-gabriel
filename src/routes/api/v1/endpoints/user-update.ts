import type { ParameterizedContext } from "koa";
import { queries } from "../../../../database";
import { ErrorCode, validEmailRegex, validNameRegex } from "../constants";
import * as jwt from "../jwt";

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
    ctx.body = ErrorCode.InvalidBody;
    return;
  }
  if (body.name) {
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
  }

  if (body.password) {
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
  }

  if (body.email && !body.email.match(validEmailRegex)) {
    ctx.status = 400;
    ctx.body = ErrorCode.UserEmailInvalidFormat;
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
      ctx.body = ErrorCode.UserNameTaken;
      return;
    } else if (updateRes.error === "users_email_key") {
      ctx.status = 409;
      ctx.body = ErrorCode.UserEmailTaken;
      return;
    }
  }

  ctx.status = 500;
  ctx.body = ErrorCode.UnexpectedError;
}
