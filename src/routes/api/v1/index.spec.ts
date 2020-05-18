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
        .send({ username: "x".repeat(19), password: "password" })
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
      assert.notEqual(rows[0].password, "password");
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
      assert.notEqual(rows[0].password, "password");
      assert.equal(rows[0].password, md5("password"));
      assert.equal(rows[0].email, json.email);
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

  describe("update", () => {
    before(async () => {
      await request(app.callback())
        .post("/api/v1/register")
        .send({ username: "gabriel", password: "password" })
        .expect(201);
    });

    after(async () => {
      await pool.query("DELETE FROM accounts;");
    });

    it("requires username", async () => {
      const res = await request(app.callback())
        .post("/api/v1/update")
        .send({})
        .expect(400);

      assert.equal(res.text, "Username required");
    });

    it("requires password", async () => {
      const res = await request(app.callback())
        .post("/api/v1/update")
        .send({ username: "gabriel" })
        .expect(400);

      assert.equal(res.text, "Password required");
    });

    it("rejects invalid username/password", async () => {
      const res = await request(app.callback())
        .post("/api/v1/update")
        .send({ username: "x", password: "x" })
        .expect(401);

      assert.equal(res.text, "Invalid credentials");
    });

    it("rejects no input", async () => {
      const res = await request(app.callback())
        .post("/api/v1/update")
        .send({ username: "gabriel", password: "password" })
        .expect(400);

      assert.equal(res.text, "Invalid input");
    });

    it("rejects empty input", async () => {
      const res = await request(app.callback())
        .post("/api/v1/update")
        .send({ username: "gabriel", password: "password", input: {} })
        .expect(400);

      assert.equal(res.text, "Invalid input");
    });

    it("rejects non-empty invalid input", async () => {
      const res = await request(app.callback())
        .post("/api/v1/update")
        .send({
          username: "gabriel",
          password: "password",
          input: { favoriteFood: "pancakes" },
        })
        .expect(400);

      assert.equal(res.text, "Invalid input");
    });

    it("checks input password", async () => {
      const res = await request(app.callback())
        .post("/api/v1/update")
        .send({
          username: "gabriel",
          password: "password",
          input: { password: "xx" },
        })
        .expect(400);

      assert.equal(res.text, "Invalid input password");
    });

    it("checks input username minimum length", async () => {
      const res = await request(app.callback())
        .post("/api/v1/update")
        .send({
          username: "gabriel",
          password: "password",
          input: { username: "x" },
        })
        .expect(400);

      assert.equal(res.text, "Invalid input username");
    });

    it("checks input username maximum length", async () => {
      const res = await request(app.callback())
        .post("/api/v1/update")
        .send({
          username: "gabriel",
          password: "password",
          input: { username: "xxxxx".repeat(19) },
        })
        .expect(400);

      assert.equal(res.text, "Invalid input username");
    });

    it("checks input username invalid character", async () => {
      const res = await request(app.callback())
        .post("/api/v1/update")
        .send({
          username: "gabriel",
          password: "password",
          input: { username: "gabriäl" },
        })
        .expect(400);

      assert.equal(res.text, "Invalid input username");
    });

    it("checks input email", async () => {
      const res = await request(app.callback())
        .post("/api/v1/update")
        .send({
          username: "gabriel",
          password: "password",
          input: { email: "x@x" },
        })
        .expect(400);

      assert.equal(res.text, "Invalid input email");
    });

    it("updates account", async () => {
      const res = await request(app.callback())
        .post("/api/v1/update")
        .send({
          username: "gabriel",
          password: "password",
          input: {
            username: "gabbe",
            password: "dorwssap",
            email: "gabbe@mail.com",
          },
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
      assert.notEqual(rows[0].password, json.password);
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
        .post("/api/v1/update")
        .send({
          username: "pelle",
          password: "password",
          input: {
            username: "pelle",
            password: "password",
            email: "pelle@mail.com",
          },
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
      assert.notEqual(rows[0].password, json.password);
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
        .post("/api/v1/update")
        .send({
          username: "franz",
          password: "password",
          input: {
            username: "david",
          },
        })
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
        .post("/api/v1/update")
        .send({
          username: "lars",
          password: "password",
          input: {
            email: "annika@mail.com",
          },
        })
        .expect(409);

      assert.equal(res.text, "Email taken");
    });
  });
});
