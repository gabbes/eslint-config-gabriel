import * as mount from "koa-mount";
import * as Router from "koa-router";
import * as endpoints from "./endpoints";
import { jwt } from "./jwt";

export const router = new Router();

router.get("/api/v1/user", endpoints.userRead);
router.post("/api/v1/user", endpoints.userCreate);

// require jwt for /user endpoints below
router.use(mount("/api/v1/user", jwt));

router.post("/api/v1/user/update", endpoints.userUpdate);
router.post("/api/v1/user/delete", endpoints.userDelete);
