import type { ParameterizedContext } from "koa";
import { queries } from "../../../../database";

export async function userDelete(
  ctx: ParameterizedContext<{ accountId: string }>
): Promise<void> {
  const res = await queries.deleteAccount({ id: ctx.state.accountId });

  if (res.ok) {
    ctx.status = 204;
    return;
  }

  ctx.status = 500;
  ctx.body = "Internal server error";
}
