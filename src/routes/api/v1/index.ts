import * as mount from "koa-mount";
import * as Router from "koa-router";
import * as endpoints from "./endpoints";
import { Endpoint } from "./constants";
import { jwt } from "./jwt";

export const router = new Router();

router.get(Endpoint.User, endpoints.userRead);
router.post(Endpoint.User, endpoints.userCreate);

// require jwt for /user endpoints below
router.use(mount(Endpoint.User, jwt));

router.post(Endpoint.UserDelete, endpoints.userDelete);
router.post(Endpoint.UserUpdate, endpoints.userUpdate);
