import type { Next, ParameterizedContext } from "koa";
import * as jsonwebtoken from "jsonwebtoken";
import { ErrorCode } from "./constants";

const bearerRegex = /^Bearer /;

interface Data {
  id: string;
  name: string;
  email: null | string;
}

interface Payload {
  id: string;
  iat: number;
  name: string;
  email: null | string;
}

export function sign(data: Data): string {
  return jsonwebtoken.sign(data, process.env.JWT_SECRET as string);
}

export async function jwt(
  ctx: ParameterizedContext,
  next: Next
): Promise<void> {
  if (!ctx.header.authorization) {
    ctx.status = 401;
    ctx.body = ErrorCode.JsonWebTokenRequired;
    return;
  }

  try {
    const payload = jsonwebtoken.verify(
      ctx.header.authorization.replace(bearerRegex, ""),
      process.env.JWT_SECRET as string
    ) as Payload;

    if (typeof payload.id === "string") {
      ctx.state.userId = payload.id;
      return await next();
    }
  } catch (error) {
    ctx.status = 401;
    ctx.body = ErrorCode.JsonWebTokenInvalid;
    return;
  }

  ctx.status = 500;
  ctx.body = ErrorCode.UnexpectedError;
  return;
}
