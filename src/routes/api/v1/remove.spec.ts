import * as assert from "assert";
import * as request from "supertest";
import { app } from "../../../app";
import { pool } from "../../../database";

describe("api/v1/account/remove", () => {
  beforeEach(async () => {
    await pool.query("DELETE FROM accounts;");
  });

  after(async () => {
    await pool.query("DELETE FROM accounts;");
  });

  it("requires username", async () => {
    const res = await request(app.callback())
      .post("/api/v1/account/remove")
      .auth("", "")
      .expect(400);

    assert.equal(res.text, "Username required");
  });

  it("requires password", async () => {
    const res = await request(app.callback())
      .post("/api/v1/account/remove")
      .auth("x", "")
      .expect(400);

    assert.equal(res.text, "Password required");
  });

  it("rejects invalid", async () => {
    await request(app.callback())
      .post("/api/v1/account/remove")
      .auth("x", "x")
      .expect(401);
  });

  it("accepts valid", async () => {
    await request(app.callback())
      .post("/api/v1/register")
      .send({ username: "gabriel", password: "password" })
      .expect(201);

    await request(app.callback())
      .post("/api/v1/account/remove")
      .auth("gabriel", "password")
      .expect(204);

    const { rowCount } = await pool.query(`
      SELECT * FROM accounts WHERE username = 'gabriel';
    `);

    assert.equal(rowCount, 0);
  });
});
