import type { ParameterizedContext } from "koa";
import { queries } from "../../../database";

export async function remove(
  ctx: ParameterizedContext<{ accountId: string }>
): Promise<void> {
  const removeRes = await queries.deleteAccount({ id: ctx.state.accountId });

  if (removeRes.ok) {
    ctx.status = 204;
    return;
  }

  ctx.status = 500;
  ctx.body = "Internal server error";
}
