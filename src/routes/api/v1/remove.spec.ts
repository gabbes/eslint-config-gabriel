import * as assert from "assert";
import { migratorosaurus } from "migratorosaurus";
import * as request from "supertest";
import { app } from "../../../app";
import { pool } from "../../../database";

describe("api/v1/account/remove", () => {
  before(async () => {
    await migratorosaurus(pool, { target: "0-create.sql" });
    await migratorosaurus(pool);
  });

  afterEach(async () => {
    await pool.query("DELETE FROM accounts;");
  });

  it("requires basic auth", async () => {
    const res = await request(app.callback())
      .get("/api/v1/account")
      .expect(401);

    assert.equal(res.text, "Basic authentication required");
  });

  it("requires username", async () => {
    const res = await request(app.callback())
      .get("/api/v1/account")
      .auth("", "x")
      .expect(401);

    assert.equal(res.text, "Basic authentication username required");
  });

  it("requires password", async () => {
    const res = await request(app.callback())
      .get("/api/v1/account")
      .auth("x", "")
      .expect(401);

    assert.equal(res.text, "Basic authentication password required");
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
