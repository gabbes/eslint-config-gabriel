import * as assert from "assert";
import * as md5 from "md5";
import { migratorosaurus } from "migratorosaurus";
import * as request from "supertest";
import { app } from "../../../app";
import { pool } from "../../../database";

describe("api/v1/account/update", () => {
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

  it("rejects invalid username/password", async () => {
    const res = await request(app.callback())
      .post("/api/v1/account/update")
      .auth("x", "x")
      .expect(401);

    assert.equal(res.text, "Unauthorized");
  });

  it("rejects no input", async () => {
    await request(app.callback())
      .post("/api/v1/register")
      .send({ username: "gabriel", password: "password" })
      .expect(201);

    const res = await request(app.callback())
      .post("/api/v1/account/update")
      .auth("gabriel", "password")
      .expect(400);

    assert.equal(res.text, "Invalid input");
  });

  it("rejects empty input", async () => {
    await request(app.callback())
      .post("/api/v1/register")
      .send({ username: "gabriel", password: "password" })
      .expect(201);

    const res = await request(app.callback())
      .post("/api/v1/account/update")
      .auth("gabriel", "password")
      .send({})
      .expect(400);

    assert.equal(res.text, "Invalid input");
  });

  it("rejects non-empty invalid input", async () => {
    await request(app.callback())
      .post("/api/v1/register")
      .send({ username: "gabriel", password: "password" })
      .expect(201);

    const res = await request(app.callback())
      .post("/api/v1/account/update")
      .auth("gabriel", "password")
      .send({ favoriteFood: "pancakes" })
      .expect(400);

    assert.equal(res.text, "Invalid input");
  });

  it("checks input password", async () => {
    await request(app.callback())
      .post("/api/v1/register")
      .send({ username: "gabriel", password: "password" })
      .expect(201);

    const res = await request(app.callback())
      .post("/api/v1/account/update")
      .auth("gabriel", "password")
      .send({ password: "xx" })
      .expect(400);

    assert.equal(res.text, "Invalid input password");
  });

  it("checks input username minimum length", async () => {
    await request(app.callback())
      .post("/api/v1/register")
      .send({ username: "gabriel", password: "password" })
      .expect(201);

    const res = await request(app.callback())
      .post("/api/v1/account/update")
      .auth("gabriel", "password")
      .send({ username: "x" })
      .expect(400);

    assert.equal(res.text, "Invalid input username");
  });

  it("checks input username maximum length", async () => {
    await request(app.callback())
      .post("/api/v1/register")
      .send({ username: "gabriel", password: "password" })
      .expect(201);

    const res = await request(app.callback())
      .post("/api/v1/account/update")
      .auth("gabriel", "password")
      .send({ username: "xxxxx".repeat(19) })
      .expect(400);

    assert.equal(res.text, "Invalid input username");
  });

  it("checks input username invalid character", async () => {
    await request(app.callback())
      .post("/api/v1/register")
      .send({ username: "gabriel", password: "password" })
      .expect(201);

    const res = await request(app.callback())
      .post("/api/v1/account/update")
      .auth("gabriel", "password")
      .send({ username: "gabriäl" })
      .expect(400);

    assert.equal(res.text, "Invalid input username");
  });

  it("checks input email", async () => {
    await request(app.callback())
      .post("/api/v1/register")
      .send({ username: "gabriel", password: "password" })
      .expect(201);

    const res = await request(app.callback())
      .post("/api/v1/account/update")
      .auth("gabriel", "password")
      .send({ email: "x@x" })
      .expect(400);

    assert.equal(res.text, "Invalid input email");
  });

  it("updates account username", async () => {
    await request(app.callback())
      .post("/api/v1/register")
      .send({ username: "gabriel", password: "password" })
      .expect(201);

    const res = await request(app.callback())
      .post("/api/v1/account/update")
      .auth("gabriel", "password")
      .send({ username: "gabbe" })
      .expect(200);

    const json = JSON.parse(res.text);

    assert.equal(Object.keys(json).length, 3);
    assert.equal(typeof json.id, "string");
    assert.equal(json.id.length, 36);
    assert.equal(json.username, "gabbe");
    assert.equal(json.email, null);

    const { rows } = await pool.query(`
      SELECT * FROM accounts WHERE username = 'gabbe';
    `);

    assert.equal(rows.length, 1);
    assert.equal(Object.keys(rows[0]).length, 5);
    assert.equal(rows[0].id, json.id);
    assert.equal(rows[0].username, json.username);
    assert.notEqual(rows[0].password, "password");
    assert.equal(rows[0].password, md5("password"));
    assert.equal(rows[0].email, null);
    assert.ok(rows[0].created instanceof Date);

    const { rowCount } = await pool.query(`
      SELECT * FROM accounts WHERE username = 'gabriel';
    `);

    assert.equal(rowCount, 0);
  });

  it("updates account password", async () => {
    await request(app.callback())
      .post("/api/v1/register")
      .send({ username: "gabriel", password: "password" })
      .expect(201);

    const res = await request(app.callback())
      .post("/api/v1/account/update")
      .auth("gabriel", "password")
      .send({ password: "drowssap" })
      .expect(200);

    const json = JSON.parse(res.text);

    assert.equal(Object.keys(json).length, 3);
    assert.equal(typeof json.id, "string");
    assert.equal(json.id.length, 36);
    assert.equal(json.username, "gabriel");
    assert.equal(json.email, null);

    const { rows } = await pool.query(`
      SELECT * FROM accounts WHERE username = 'gabriel';
    `);

    assert.equal(rows.length, 1);
    assert.equal(Object.keys(rows[0]).length, 5);
    assert.equal(rows[0].id, json.id);
    assert.equal(rows[0].username, json.username);
    assert.notEqual(rows[0].password, "drowssap");
    assert.equal(rows[0].password, md5("drowssap"));
    assert.equal(rows[0].email, null);
    assert.ok(rows[0].created instanceof Date);
  });

  it("updates account email", async () => {
    await request(app.callback())
      .post("/api/v1/register")
      .send({ username: "gabriel", password: "password" })
      .expect(201);

    const res = await request(app.callback())
      .post("/api/v1/account/update")
      .auth("gabriel", "password")
      .send({ email: "gabriel@mail.com" })
      .expect(200);

    const json = JSON.parse(res.text);

    assert.equal(Object.keys(json).length, 3);
    assert.equal(typeof json.id, "string");
    assert.equal(json.id.length, 36);
    assert.equal(json.username, "gabriel");
    assert.equal(json.email, "gabriel@mail.com");

    const { rows } = await pool.query(`
      SELECT * FROM accounts WHERE username = 'gabriel';
    `);

    assert.equal(rows.length, 1);
    assert.equal(Object.keys(rows[0]).length, 5);
    assert.equal(rows[0].id, json.id);
    assert.equal(rows[0].username, json.username);
    assert.notEqual(rows[0].password, "password");
    assert.equal(rows[0].password, md5("password"));
    assert.equal(rows[0].email, "gabriel@mail.com");
    assert.ok(rows[0].created instanceof Date);
  });

  it("updates account all fields", async () => {
    await request(app.callback())
      .post("/api/v1/register")
      .send({ username: "gabriel", password: "password" })
      .expect(201);

    const res = await request(app.callback())
      .post("/api/v1/account/update")
      .auth("gabriel", "password")
      .send({
        username: "gabbe",
        password: "dorwssap",
        email: "gabbe@mail.com",
      })
      .expect(200);

    const json = JSON.parse(res.text);

    assert.equal(Object.keys(json).length, 3);
    assert.equal(typeof json.id, "string");
    assert.equal(json.id.length, 36);
    assert.equal(json.username, "gabbe");
    assert.equal(json.email, "gabbe@mail.com");

    const { rows } = await pool.query(`
        SELECT * FROM accounts WHERE username = 'gabbe';
      `);

    assert.equal(rows.length, 1);
    assert.equal(Object.keys(rows[0]).length, 5);
    assert.equal(rows[0].id, json.id);
    assert.equal(rows[0].username, json.username);
    assert.notEqual(rows[0].password, "password");
    assert.equal(rows[0].password, md5("dorwssap"));
    assert.equal(rows[0].email, "gabbe@mail.com");
    assert.ok(rows[0].created instanceof Date);

    const { rowCount } = await pool.query(`
        SELECT * FROM accounts WHERE username = 'gabriel';
      `);

    assert.equal(rowCount, 0);
  });

  it("updates account with same values", async () => {
    await request(app.callback())
      .post("/api/v1/register")
      .send({
        username: "pelle",
        password: "password",
        email: "pelle@mail.com",
      })
      .expect(201);

    const res = await request(app.callback())
      .post("/api/v1/account/update")
      .auth("pelle", "password")
      .send({
        username: "pelle",
        password: "password",
        email: "pelle@mail.com",
      })
      .expect(200);

    const json = JSON.parse(res.text);

    assert.equal(Object.keys(json).length, 3);
    assert.equal(typeof json.id, "string");
    assert.equal(json.id.length, 36);
    assert.equal(json.username, "pelle");
    assert.equal(json.email, "pelle@mail.com");

    const { rows } = await pool.query(`
        SELECT * FROM accounts WHERE username = 'pelle';
      `);

    assert.equal(rows.length, 1);
    assert.equal(Object.keys(rows[0]).length, 5);
    assert.equal(rows[0].id, json.id);
    assert.equal(rows[0].username, json.username);
    assert.notEqual(rows[0].password, "password");
    assert.equal(rows[0].password, md5("password"));
    assert.equal(rows[0].email, "pelle@mail.com");
    assert.ok(rows[0].created instanceof Date);
  });

  it("rejects duplicate username", async () => {
    await request(app.callback())
      .post("/api/v1/register")
      .send({ username: "franz", password: "password" })
      .expect(201);

    await request(app.callback())
      .post("/api/v1/register")
      .send({ username: "david", password: "password" })
      .expect(201);

    const res = await request(app.callback())
      .post("/api/v1/account/update")
      .auth("franz", "password")
      .send({ username: "david" })
      .expect(409);

    assert.equal(res.text, "Username taken");
  });

  it("rejects duplicate email", async () => {
    await request(app.callback())
      .post("/api/v1/register")
      .send({
        username: "annika",
        password: "password",
        email: "annika@mail.com",
      })
      .expect(201);

    await request(app.callback())
      .post("/api/v1/register")
      .send({
        username: "lars",
        password: "password",
      })
      .expect(201);

    const res = await request(app.callback())
      .post("/api/v1/account/update")
      .auth("lars", "password")
      .send({ email: "annika@mail.com" })
      .expect(409);

    assert.equal(res.text, "Email taken");
  });
});
