import * as Router from "koa-router";
import { authenticate } from "./authenticate";
import { register } from "./register";
import { update } from "./update";

export const router = new Router();

router.get(`/api/v1/authenticate`, authenticate);
router.post(`/api/v1/update`, update);
router.post(`/api/v1/register`, register);
