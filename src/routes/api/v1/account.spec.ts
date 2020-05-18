import * as assert from "assert";
import * as request from "supertest";
import { app } from "../../../app";
import { pool } from "../../../database";

describe("api/v1/account", () => {
  beforeEach(async () => {
    await pool.query("DELETE FROM accounts;");
  });

  after(async () => {
    await pool.query("DELETE FROM accounts;");
  });

  it("requires username", async () => {
    const res = await request(app.callback())
      .get("/api/v1/account")
      .auth("", "")
      .expect(400);

    assert.equal(res.text, "Username required");
  });

  it("requires password", async () => {
    const res = await request(app.callback())
      .get("/api/v1/account")
      .auth("x", "")
      .expect(400);

    assert.equal(res.text, "Password required");
  });

  it("rejects invalid", async () => {
    const res = await request(app.callback())
      .get("/api/v1/account")
      .auth("x", "x")
      .expect(401);

    assert.equal(res.text, "Not authenticated");
  });

  it("accepts valid", async () => {
    await request(app.callback())
      .post("/api/v1/register")
      .send({ username: "gabriel", password: "password" })
      .expect(201);

    const res = await request(app.callback())
      .get("/api/v1/account")
      .auth("gabriel", "password")
      .expect(200);

    const json = JSON.parse(res.text);

    assert.equal(Object.keys(json).length, 3);
    assert.equal(typeof json.id, "string");
    assert.equal(json.id.length, 36);
    assert.equal(json.username, "gabriel");
    assert.equal(json.email, null);
  });
});
