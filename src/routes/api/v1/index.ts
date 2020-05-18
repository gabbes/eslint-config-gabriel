import * as Router from "koa-router";
import * as mount from "koa-mount";
import { authenticate } from "./authenticate";
import { register } from "./register";
import { remove } from "./remove";
import { update } from "./update";
import * as utils from "./utils";

export const router = new Router();

router.post("/api/v1/register", register);
router.use(mount("/api/v1/account", utils.authenticate));
router.get("/api/v1/account/authenticate", authenticate);
router.post("/api/v1/account/remove", remove);
router.post("/api/v1/account/update", update);
