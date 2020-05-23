import type { ParameterizedContext } from "koa";
import { queries } from "../../../../database";

export async function userDelete(
  ctx: ParameterizedContext<{ userId: string }>
): Promise<void> {
  const res = await queries.deleteUser({ id: ctx.state.userId });

  if (res.ok) {
    ctx.status = 204;
    return;
  }

  ctx.status = 500;
  ctx.body = "Internal server error";
}
