import * as assert from "assert";
import * as md5 from "md5";
import { migratorosaurus } from "migratorosaurus";
import * as request from "supertest";
import { app } from "../../../app";
import { pool } from "../../../database";

interface Input {
  username: string;
  password: string;
  email?: string;
}

function assertAccountJsonResponse(input: Input, text: string): void {
  const json = JSON.parse(text);

  assert.equal(Object.keys(json).length, 3);
  assert.equal(typeof json.id, "string");
  assert.equal(json.id.length, 36);
  assert.equal(json.username, input.username);
  assert.equal(json.email, input.email || null);
}

async function assertAccountInputAndJsonResponseMatchDatabase(
  input: Input,
  text: string
): Promise<void> {
  const json = JSON.parse(text);

  const { rowCount, rows } = await pool.query(`
    SELECT * FROM accounts WHERE id = '${json.id}';
  `);

  assert.equal(rowCount, 1);
  assert.equal(Object.keys(rows[0]).length, 5);
  assert.equal(rows[0].id, json.id);
  assert.equal(rows[0].username, json.username);
  assert.notEqual(rows[0].password, input.password);
  assert.equal(rows[0].password, md5(input.password));
  assert.equal(rows[0].email, input.email || null);
  assert.ok(rows[0].created instanceof Date);
}

/* eslint-disable no-unexpected-multiline */

function assertBasicAuth(url: string, method: "get" | "post" = "get"): void {
  it("requires basic auth", async () => {
    const res = await request(app.callback())[method](url).expect(401);

    assert.equal(res.text, "Basic authentication required");
  });

  it("requires basic auth username", async () => {
    const res = await request(app.callback())
      [method](url)
      .auth("", "x")
      .expect(401);

    assert.equal(res.text, "Basic authentication username required");
  });

  it("requires basic auth password", async () => {
    const res = await request(app.callback())
      [method](url)
      .auth("x", "")
      .expect(401);

    assert.equal(res.text, "Basic authentication password required");
  });

  it("requires valid basic auth", async () => {
    const res = await request(app.callback())
      [method](url)
      .auth("x", "x")
      .expect(401);

    assert.equal(res.text, "Unauthorized");
  });
}

/* eslint-enable no-unexpected-multiline */

describe("api/v1", () => {
  before(async () => {
    await migratorosaurus(pool, { target: "0-create.sql" });
    await migratorosaurus(pool);
  });

  afterEach(async () => {
    await pool.query("DELETE FROM accounts;");
  });

  describe("register", () => {
    it("requires input username and password", async () => {
      const res = await request(app.callback())
        .post("/api/v1/register")
        .expect(400);

      assert.equal(res.text, "Username and password required");
    });

    it("requires input username", async () => {
      const res = await request(app.callback())
        .post("/api/v1/register")
        .send({ password: "password" })
        .expect(400);

      assert.equal(res.text, "Username required");
    });

    it("requires input password", async () => {
      const res = await request(app.callback())
        .post("/api/v1/register")
        .send({ username: "gabriel" })
        .expect(400);

      assert.equal(res.text, "Password required");
    });

    it("requires input username to be minimum 2 characters", async () => {
      const res = await request(app.callback())
        .post("/api/v1/register")
        .send({ username: "x", password: "password" })
        .expect(400);

      assert.equal(res.text, "Invalid username input");
    });

    it("requires input username to be maximum 18 characters", async () => {
      const res = await request(app.callback())
        .post("/api/v1/register")
        .send({ username: "x".repeat(19), password: "password" })
        .expect(400);

      assert.equal(res.text, "Invalid username input");
    });

    it("requires input username to only contain valid characters", async () => {
      const res = await request(app.callback())
        .post("/api/v1/register")
        .send({ username: "gåbriäl", password: "password" })
        .expect(400);

      assert.equal(res.text, "Invalid username input");
    });

    it("requires input password to be minumum 6 characters", async () => {
      const res = await request(app.callback())
        .post("/api/v1/register")
        .send({ username: "gabriel", password: "x".repeat(5) })
        .expect(400);

      assert.equal(res.text, "Invalid password");
    });

    it("requires input email to follow valid format", async () => {
      const res = await request(app.callback())
        .post("/api/v1/register")
        .send({ username: "gabriel", password: "password", email: "x@x" })
        .expect(400);

      assert.equal(res.text, "Invalid email");
    });

    it("registers account without email", async () => {
      const input = { username: "gabriel", password: "password" };

      const res = await request(app.callback())
        .post("/api/v1/register")
        .send(input)
        .expect(201);

      assertAccountJsonResponse(input, res.text);
      await assertAccountInputAndJsonResponseMatchDatabase(input, res.text);
    });

    it("registers account with email", async () => {
      const input = {
        username: "gabriel",
        password: "password",
        email: "gabriel@mail.com",
      };

      const res = await request(app.callback())
        .post("/api/v1/register")
        .send(input)
        .expect(201);

      assertAccountJsonResponse(input, res.text);
      await assertAccountInputAndJsonResponseMatchDatabase(input, res.text);
    });

    it("requires username to be unique", async () => {
      const input = { username: "gabriel", password: "password" };

      await request(app.callback())
        .post("/api/v1/register")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/register")
        .send(input)
        .expect(409);

      assert.equal(res.text, "Username taken");
    });

    it("requires email to be unique", async () => {
      await request(app.callback())
        .post("/api/v1/register")
        .send({
          username: "gabriel",
          password: "password",
          email: "gabriel@mail.com",
        })
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/register")
        .send({
          username: "gabriel2",
          password: "password",
          email: "gabriel@mail.com",
        })
        .expect(409);

      assert.equal(res.text, "Email taken");
    });
  });

  describe("account", () => {
    assertBasicAuth("/api/v1/account");

    it("authenticates account", async () => {
      const input = { username: "gabriel", password: "password" };

      await request(app.callback())
        .post("/api/v1/register")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .get("/api/v1/account")
        .auth(input.username, input.password)
        .expect(200);

      assertAccountJsonResponse(input, res.text);
    });
  });

  describe("account/update", () => {
    assertBasicAuth("/api/v1/account/update", "post");

    it("requires input body", async () => {
      const input = { username: "gabriel", password: "password" };

      await request(app.callback())
        .post("/api/v1/register")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/account/update")
        .auth(input.username, input.password)
        .expect(400);

      assert.equal(res.text, "Invalid input");
    });

    it("requires input body to not be empty", async () => {
      const input = { username: "gabriel", password: "password" };

      await request(app.callback())
        .post("/api/v1/register")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/account/update")
        .auth(input.username, input.password)
        .send({})
        .expect(400);

      assert.equal(res.text, "Invalid input");
    });

    it("requires input body to contain valid field", async () => {
      const input = { username: "gabriel", password: "password" };

      await request(app.callback())
        .post("/api/v1/register")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/account/update")
        .auth(input.username, input.password)
        .send({ favoriteFood: "pancakes" })
        .expect(400);

      assert.equal(res.text, "Invalid input");
    });

    it("requires input body username to be minimum 2 characters", async () => {
      const input = { username: "gabriel", password: "password" };

      await request(app.callback())
        .post("/api/v1/register")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/account/update")
        .auth(input.username, input.password)
        .send({ username: "x" })
        .expect(400);

      assert.equal(res.text, "Invalid input username");
    });

    it("requires input body username to be maximum 18 characters", async () => {
      const input = { username: "gabriel", password: "password" };

      await request(app.callback())
        .post("/api/v1/register")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/account/update")
        .auth(input.username, input.password)
        .send({ username: "x".repeat(19) })
        .expect(400);

      assert.equal(res.text, "Invalid input username");
    });

    it("requires input body username to only contain valid characters", async () => {
      const input = { username: "gabriel", password: "password" };

      await request(app.callback())
        .post("/api/v1/register")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/account/update")
        .auth(input.username, input.password)
        .send({ username: "gabriäl" })
        .expect(400);

      assert.equal(res.text, "Invalid input username");
    });

    it("requires input body password to be minumum 6 characters", async () => {
      const input = { username: "gabriel", password: "password" };

      await request(app.callback())
        .post("/api/v1/register")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/account/update")
        .auth(input.username, input.password)
        .send({ password: "x".repeat(2) })
        .expect(400);

      assert.equal(res.text, "Invalid input password");
    });

    it("requires input body email to follow valid format", async () => {
      const input = { username: "gabriel", password: "password" };

      await request(app.callback())
        .post("/api/v1/register")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/account/update")
        .auth(input.username, input.password)
        .send({ email: "x@x" })
        .expect(400);

      assert.equal(res.text, "Invalid input email");
    });

    it("requires input body username to be unique", async () => {
      const input = { username: "gabriel", password: "password" };

      const input2 = { username: "franz", password: "password" };

      await request(app.callback())
        .post("/api/v1/register")
        .send(input)
        .expect(201);

      await request(app.callback())
        .post("/api/v1/register")
        .send(input2)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/account/update")
        .auth(input.username, input.password)
        .send({ username: input2.username })
        .expect(409);

      assert.equal(res.text, "Username taken");
    });

    it("requires input body email to be unique", async () => {
      const input = { username: "gabriel", password: "password" };

      const input2 = {
        username: "franz",
        password: "password",
        email: "cool@mail.com",
      };

      await request(app.callback())
        .post("/api/v1/register")
        .send(input)
        .expect(201);

      await request(app.callback())
        .post("/api/v1/register")
        .send(input2)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/account/update")
        .auth(input.username, input.password)
        .send({ email: input2.email })
        .expect(409);

      assert.equal(res.text, "Email taken");
    });

    it("updates account username", async () => {
      const input = { username: "gabriel", password: "password" };
      const body = { username: "gabbe" };

      await request(app.callback())
        .post("/api/v1/register")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/account/update")
        .auth(input.username, input.password)
        .send(body)
        .expect(200);

      const merge = { ...input, ...body };
      assertAccountJsonResponse(merge, res.text);
      assertAccountInputAndJsonResponseMatchDatabase(merge, res.text);

      const { rowCount } = await pool.query(`
        SELECT * FROM accounts WHERE username = '${input.username}';
      `);

      assert.equal(rowCount, 0);
    });

    it("updates account password", async () => {
      const input = { username: "gabriel", password: "password" };
      const body = { password: "drowssap" };

      await request(app.callback())
        .post("/api/v1/register")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/account/update")
        .auth(input.username, input.password)
        .send(body)
        .expect(200);

      const merge = { ...input, ...body };
      assertAccountJsonResponse(merge, res.text);
      assertAccountInputAndJsonResponseMatchDatabase(merge, res.text);
    });

    it("updates account email without email", async () => {
      const input = { username: "gabriel", password: "password" };
      const body = { email: "gabriel@mail.com" };

      await request(app.callback())
        .post("/api/v1/register")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/account/update")
        .auth(input.username, input.password)
        .send(body)
        .expect(200);

      const merge = { ...input, ...body };
      assertAccountJsonResponse(merge, res.text);
      assertAccountInputAndJsonResponseMatchDatabase(merge, res.text);
    });

    it("updates account email with new email", async () => {
      const input = {
        username: "gabriel",
        password: "password",
        email: "gabriel@mail.com",
      };

      const body = { email: "gabbe@mail.com" };

      await request(app.callback())
        .post("/api/v1/register")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/account/update")
        .auth(input.username, input.password)
        .send(body)
        .expect(200);

      const merge = { ...input, ...body };
      assertAccountJsonResponse(merge, res.text);
      assertAccountInputAndJsonResponseMatchDatabase(merge, res.text);

      const { rowCount } = await pool.query(`
        SELECT * FROM accounts WHERE email = '${input.email}';
      `);

      assert.equal(rowCount, 0);
    });

    it("updates account email to null", async () => {
      const input = {
        username: "gabriel",
        password: "password",
        email: "gabriel@mail.com",
      };

      const body = { email: null };

      await request(app.callback())
        .post("/api/v1/register")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/account/update")
        .auth(input.username, input.password)
        .send(body)
        .expect(200);

      const merge = { ...input, ...body };
      assertAccountJsonResponse(merge, res.text);
      assertAccountInputAndJsonResponseMatchDatabase(merge, res.text);

      const { rowCount } = await pool.query(`
        SELECT * FROM accounts WHERE email = '${input.email}';
      `);

      assert.equal(rowCount, 0);
    });

    it("updates account all fields", async () => {
      const input = {
        username: "gabriel",
        password: "password",
        email: "gabriel@mail.com",
      };

      const body = {
        username: "gabbe",
        password: "dorwssap",
        email: "gabbe@mail.com",
      };

      await request(app.callback())
        .post("/api/v1/register")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/account/update")
        .auth(input.username, input.password)
        .send(body)
        .expect(200);

      const merge = { ...input, ...body };
      assertAccountJsonResponse(merge, res.text);
      assertAccountInputAndJsonResponseMatchDatabase(merge, res.text);

      const { rowCount } = await pool.query(`
        SELECT * FROM accounts
        WHERE username = '${input.username}'
        OR email = '${input.email}';
      `);

      assert.equal(rowCount, 0);
    });

    it("updates account with same values", async () => {
      const input = {
        username: "gabriel",
        password: "password",
        email: "gabriel@mail.com",
      };

      await request(app.callback())
        .post("/api/v1/register")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/account/update")
        .auth(input.username, input.password)
        .send(input)
        .expect(200);

      assertAccountJsonResponse(input, res.text);
      assertAccountInputAndJsonResponseMatchDatabase(input, res.text);
    });
  });

  describe("account/remove", () => {
    assertBasicAuth("/api/v1/account/remove", "post");

    it("removes account", async () => {
      const input = { username: "gabriel", password: "password" };

      await request(app.callback())
        .post("/api/v1/register")
        .send(input)
        .expect(201);

      await request(app.callback())
        .post("/api/v1/account/remove")
        .auth(input.username, input.password)
        .expect(204);

      const { rowCount } = await pool.query(`
        SELECT * FROM accounts WHERE username = '${input.username}';
      `);

      assert.equal(rowCount, 0);
    });
  });
});
