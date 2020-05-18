import type { ParameterizedContext } from "koa";
import { queries } from "../../../database";

export async function account(
  ctx: ParameterizedContext<{ accountId: string }>
): Promise<void> {
  const res = await queries.getAccount({ id: ctx.state.accountId });

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
}
