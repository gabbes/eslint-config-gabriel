import * as request from "supertest";
import { app } from "./app";

describe("app", () => {
  it("responds with 401", async () => {
    await request(app.callback()).get("/").expect(401);
  });
});
