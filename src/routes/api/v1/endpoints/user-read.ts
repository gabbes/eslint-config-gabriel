import type { ParameterizedContext } from "koa";
import { queries } from "../../../../database";

export async function userRead(
  ctx: ParameterizedContext<{ accountId: string }>
): Promise<void> {
  const res = await queries.getAccount({ id: ctx.state.accountId });

  if (res.ok) {
    ctx.status = 200;
    ctx.body = JSON.stringify(res.data);
    return;
  }

  if (res.error === "not_found") {
    ctx.status = 400;
    ctx.body = "Account not found";
    return;
  }

  ctx.status = 500;
  ctx.body = "Internal server error";
}
