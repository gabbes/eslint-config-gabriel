import * as assert from "assert";
import * as md5 from "md5";
import { migratorosaurus } from "migratorosaurus";
import * as path from "path";
import * as request from "supertest";
import { app } from "../../../app";
import { pool } from "../../../database";

describe("api/v1", () => {
  before(async () => {
    // Down migrate all migrations
    await migratorosaurus(pool, {
      directory: path.resolve("migrations"),
      target: "0-create.sql",
    });

    // Up migrate all migration again
    await migratorosaurus(pool, { directory: path.resolve("migrations") });
  });

  describe("register", () => {
    after(async () => {
      await pool.query("DELETE FROM accounts;");
    });

    it("requires username", async () => {
      const res = await request(app.callback())
        .post("/api/v1/register")
        .send({})
        .expect(400);

      assert.equal(res.text, "Username required");
    });

    it("requires password", async () => {
      const res = await request(app.callback())
        .post("/api/v1/register")
        .send({ username: "gabriel" })
        .expect(400);

      assert.equal(res.text, "Password required");
    });

    it("checks username minimum length", async () => {
      const res = await request(app.callback())
        .post("/api/v1/register")
        .send({ username: "x", password: "password" })
        .expect(400);

      assert.equal(res.text, "Invalid username input");
    });

    it("checks username maximum length", async () => {
      const res = await request(app.callback())
        .post("/api/v1/register")
        .send({ username: "xxxxxxxxxxxxxxxxxxx", password: "password" })
        .expect(400);

      assert.equal(res.text, "Invalid username input");
    });

    it("checks username invalid characters", async () => {
      const res = await request(app.callback())
        .post("/api/v1/register")
        .send({ username: "gabriäl", password: "password" })
        .expect(400);

      assert.equal(res.text, "Invalid username input");
    });

    it("checks password minimum length", async () => {
      const res = await request(app.callback())
        .post("/api/v1/register")
        .send({ username: "gabriel", password: "xxxxx" })
        .expect(400);

      assert.equal(res.text, "Invalid password");
    });

    it("checks email format", async () => {
      const res = await request(app.callback())
        .post("/api/v1/register")
        .send({ username: "gabriel", password: "password", email: "x@x" })
        .expect(400);

      assert.equal(res.text, "Invalid email");
    });

    it("registers account without email", async () => {
      const res = await request(app.callback())
        .post("/api/v1/register")
        .send({ username: "gabriel", password: "password" })
        .expect(201);

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
      assert.equal(rows[0].password, md5("password"));
      assert.equal(rows[0].email, null);
      assert.ok(rows[0].created instanceof Date);
    });

    it("registers account with email", async () => {
      const res = await request(app.callback())
        .post("/api/v1/register")
        .send({
          username: "franz",
          password: "password",
          email: "franz@mail.com",
        })
        .expect(201);

      const json = JSON.parse(res.text);

      assert.equal(Object.keys(json).length, 3);
      assert.equal(typeof json.id, "string");
      assert.equal(json.id.length, 36);
      assert.equal(json.username, "franz");
      assert.equal(json.email, "franz@mail.com");

      const { rows } = await pool.query(`
        SELECT * FROM accounts WHERE username = 'franz';
      `);

      assert.equal(rows.length, 1);
      assert.equal(Object.keys(rows[0]).length, 5);
      assert.equal(rows[0].id, json.id);
      assert.equal(rows[0].username, json.username);
      assert.equal(rows[0].password, md5("password"));
      assert.equal(rows[0].email, "franz@mail.com");
      assert.ok(rows[0].created instanceof Date);
    });

    it("rejects duplicate username", async () => {
      const res = await request(app.callback())
        .post("/api/v1/register")
        .send({
          username: "franz",
          password: "password",
          email: "franz@mail.com",
        })
        .expect(409);

      assert.equal(res.text, "Username taken");
    });

    it("rejects duplicate email", async () => {
      const res = await request(app.callback())
        .post("/api/v1/register")
        .send({
          username: "franz2",
          password: "password",
          email: "franz@mail.com",
        })
        .expect(409);

      assert.equal(res.text, "Email taken");
    });
  });

  describe("authenticate", () => {
    after(async () => {
      await pool.query("DELETE FROM accounts;");
    });

    it("requires username", async () => {
      const res = await request(app.callback())
        .get("/api/v1/authenticate")
        .send({})
        .expect(400);

      assert.equal(res.text, "Username required");
    });

    it("requires password", async () => {
      const res = await request(app.callback())
        .get("/api/v1/authenticate")
        .send({ username: "x" })
        .expect(400);

      assert.equal(res.text, "Password required");
    });

    it("rejects invalid", async () => {
      const res = await request(app.callback())
        .get("/api/v1/authenticate")
        .send({ username: "x", password: "x" })
        .expect(401);

      assert.equal(res.text, "Not authenticated");
    });

    it("accepts valid", async () => {
      await request(app.callback())
        .post("/api/v1/register")
        .send({ username: "gabriel", password: "password" })
        .expect(201);

      const res = await request(app.callback())
        .get("/api/v1/authenticate")
        .send({ username: "gabriel", password: "password" })
        .expect(200);

      const json = JSON.parse(res.text);

      assert.equal(Object.keys(json).length, 3);
      assert.equal(typeof json.id, "string");
      assert.equal(json.id.length, 36);
      assert.equal(json.username, "gabriel");
      assert.equal(json.email, null);
    });
  });
});
