import * as assert from "assert";
import { migratorosaurus } from "migratorosaurus";
import * as request from "supertest";
import { app } from "../../../app";
import { pool } from "../../../database";

describe("api/v1/account", () => {
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
    const res = await request(app.callback())
      .get("/api/v1/account")
      .auth("x", "x")
      .expect(401);

    assert.equal(res.text, "Unauthorized");
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
