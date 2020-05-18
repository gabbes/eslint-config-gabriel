import * as Router from "koa-router";
import { authenticate } from "./authenticate";
import { register } from "./register";
import { remove } from "./remove";
import { update } from "./update";

export const router = new Router();

router.get(`/api/v1/authenticate`, authenticate);
router.post(`/api/v1/register`, register);
router.post(`/api/v1/remove`, remove);
router.post(`/api/v1/update`, update);
