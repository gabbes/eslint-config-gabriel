import * as Router from "koa-router";
import * as mount from "koa-mount";
import * as endpoints from "./endpoints";
import { basicAuth } from "./basic-auth";

export const router = new Router();

router.post("/api/v1/user", endpoints.userCreate);

// Require authentication for /user endpoints below
router.use(mount("/api/v1/user", basicAuth));

router.get("/api/v1/user", endpoints.userRead);
router.post("/api/v1/user/delete", endpoints.userDelete);
router.post("/api/v1/user/update", endpoints.userUpdate);
