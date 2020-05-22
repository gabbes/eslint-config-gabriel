import * as assert from "assert";
import * as md5 from "md5";
import { migratorosaurus } from "migratorosaurus";
import * as request from "supertest";
import { app } from "../../../app";
import { pool } from "../../../database";

interface Input {
  name: string;
  password: string;
  email?: string;
}

function assertAccountJsonResponse(input: Input, text: string): void {
  const json = JSON.parse(text);

  assert.equal(Object.keys(json).length, 3);
  assert.equal(typeof json.id, "string");
  assert.equal(json.id.length, 36);
  assert.equal(json.name, input.name);
  assert.equal(json.email, input.email || null);
}

async function assertAccountInputAndJsonResponseMatchDatabase(
  input: Input,
  text: string
): Promise<void> {
  const json = JSON.parse(text);

  const { rowCount, rows } = await pool.query(`
    SELECT * FROM users WHERE id = '${json.id}';
  `);

  assert.equal(rowCount, 1);
  assert.equal(Object.keys(rows[0]).length, 5);
  assert.equal(rows[0].id, json.id);
  assert.equal(rows[0].name, json.name);
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

  it("requires basic auth name", async () => {
    const res = await request(app.callback())
      [method](url)
      .auth("", "x")
      .expect(401);

    assert.equal(res.text, "Basic authentication name required");
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

describe("api/v1/user", () => {
  before(async () => {
    await migratorosaurus(pool, { target: "0-create.sql" });
    await migratorosaurus(pool);
  });

  afterEach(async () => {
    await pool.query("DELETE FROM users;");
  });

  describe("create", () => {
    it("requires input name and password", async () => {
      const res = await request(app.callback())
        .post("/api/v1/user")
        .expect(400);

      assert.equal(res.text, "Name and password required");
    });

    it("requires input name", async () => {
      const res = await request(app.callback())
        .post("/api/v1/user")
        .send({ password: "password" })
        .expect(400);

      assert.equal(res.text, "Name required");
    });

    it("requires input password", async () => {
      const res = await request(app.callback())
        .post("/api/v1/user")
        .send({ name: "gabriel" })
        .expect(400);

      assert.equal(res.text, "Password required");
    });

    it("requires input name to be minimum 2 characters", async () => {
      const res = await request(app.callback())
        .post("/api/v1/user")
        .send({ name: "x", password: "password" })
        .expect(400);

      assert.equal(res.text, "Invalid name input");
    });

    it("requires input name to be maximum 18 characters", async () => {
      const res = await request(app.callback())
        .post("/api/v1/user")
        .send({ name: "x".repeat(19), password: "password" })
        .expect(400);

      assert.equal(res.text, "Invalid name input");
    });

    it("requires input name to only contain valid characters", async () => {
      const res = await request(app.callback())
        .post("/api/v1/user")
        .send({ name: "gåbriäl", password: "password" })
        .expect(400);

      assert.equal(res.text, "Invalid name input");
    });

    it("requires input password to be minumum 6 characters", async () => {
      const res = await request(app.callback())
        .post("/api/v1/user")
        .send({ name: "gabriel", password: "x".repeat(5) })
        .expect(400);

      assert.equal(res.text, "Invalid password");
    });

    it("requires input password to be maximum 128 characters", async () => {
      const res = await request(app.callback())
        .post("/api/v1/user")
        .send({ name: "gabriel", password: "x".repeat(129) })
        .expect(400);

      assert.equal(res.text, "Invalid password");
    });

    it("requires input email to follow valid format", async () => {
      const res = await request(app.callback())
        .post("/api/v1/user")
        .send({ name: "gabriel", password: "password", email: "x@x" })
        .expect(400);

      assert.equal(res.text, "Invalid email");
    });

    it("registers account without email", async () => {
      const input = { name: "gabriel", password: "password" };

      const res = await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      assertAccountJsonResponse(input, res.text);
      await assertAccountInputAndJsonResponseMatchDatabase(input, res.text);
    });

    it("registers account with email", async () => {
      const input = {
        name: "gabriel",
        password: "password",
        email: "gabriel@mail.com",
      };

      const res = await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      assertAccountJsonResponse(input, res.text);
      await assertAccountInputAndJsonResponseMatchDatabase(input, res.text);
    });

    it("requires name to be unique", async () => {
      const input = { name: "gabriel", password: "password" };

      await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(409);

      assert.equal(res.text, "Name taken");
    });

    it("requires email to be unique", async () => {
      await request(app.callback())
        .post("/api/v1/user")
        .send({
          name: "gabriel",
          password: "password",
          email: "gabriel@mail.com",
        })
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user")
        .send({
          name: "gabriel2",
          password: "password",
          email: "gabriel@mail.com",
        })
        .expect(409);

      assert.equal(res.text, "Email taken");
    });
  });

  describe("read", () => {
    assertBasicAuth("/api/v1/user");

    it("authenticates account", async () => {
      const input = { name: "gabriel", password: "password" };

      await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .get("/api/v1/user")
        .auth(input.name, input.password)
        .expect(200);

      assertAccountJsonResponse(input, res.text);
    });
  });

  describe("update", () => {
    assertBasicAuth("/api/v1/user/update", "post");

    it("requires input body", async () => {
      const input = { name: "gabriel", password: "password" };

      await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user/update")
        .auth(input.name, input.password)
        .expect(400);

      assert.equal(res.text, "Invalid input");
    });

    it("requires input body to not be empty", async () => {
      const input = { name: "gabriel", password: "password" };

      await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user/update")
        .auth(input.name, input.password)
        .send({})
        .expect(400);

      assert.equal(res.text, "Invalid input");
    });

    it("requires input body to contain valid field", async () => {
      const input = { name: "gabriel", password: "password" };

      await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user/update")
        .auth(input.name, input.password)
        .send({ favoriteFood: "pancakes" })
        .expect(400);

      assert.equal(res.text, "Invalid input");
    });

    it("requires input body name to be minimum 2 characters", async () => {
      const input = { name: "gabriel", password: "password" };

      await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user/update")
        .auth(input.name, input.password)
        .send({ name: "x" })
        .expect(400);

      assert.equal(res.text, "Invalid input name");
    });

    it("requires input body name to be maximum 18 characters", async () => {
      const input = { name: "gabriel", password: "password" };

      await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user/update")
        .auth(input.name, input.password)
        .send({ name: "x".repeat(19) })
        .expect(400);

      assert.equal(res.text, "Invalid input name");
    });

    it("requires input body name to only contain valid characters", async () => {
      const input = { name: "gabriel", password: "password" };

      await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user/update")
        .auth(input.name, input.password)
        .send({ name: "gabriäl" })
        .expect(400);

      assert.equal(res.text, "Invalid input name");
    });

    it("requires input body password to be minumum 6 characters", async () => {
      const input = { name: "gabriel", password: "password" };

      await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user/update")
        .auth(input.name, input.password)
        .send({ password: "x".repeat(2) })
        .expect(400);

      assert.equal(res.text, "Invalid input password");
    });

    it("requires input body password to be maximum 128 characters", async () => {
      const input = { name: "gabriel", password: "password" };

      await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user/update")
        .auth(input.name, input.password)
        .send({ password: "x".repeat(129) })
        .expect(400);

      assert.equal(res.text, "Invalid input password");
    });

    it("requires input body email to follow valid format", async () => {
      const input = { name: "gabriel", password: "password" };

      await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user/update")
        .auth(input.name, input.password)
        .send({ email: "x@x" })
        .expect(400);

      assert.equal(res.text, "Invalid input email");
    });

    it("requires input body name to be unique", async () => {
      const input = { name: "gabriel", password: "password" };

      const input2 = { name: "franz", password: "password" };

      await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      await request(app.callback())
        .post("/api/v1/user")
        .send(input2)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user/update")
        .auth(input.name, input.password)
        .send({ name: input2.name })
        .expect(409);

      assert.equal(res.text, "Name taken");
    });

    it("requires input body email to be unique", async () => {
      const input = { name: "gabriel", password: "password" };

      const input2 = {
        name: "franz",
        password: "password",
        email: "cool@mail.com",
      };

      await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      await request(app.callback())
        .post("/api/v1/user")
        .send(input2)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user/update")
        .auth(input.name, input.password)
        .send({ email: input2.email })
        .expect(409);

      assert.equal(res.text, "Email taken");
    });

    it("updates account name", async () => {
      const input = { name: "gabriel", password: "password" };
      const body = { name: "gabbe" };

      await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user/update")
        .auth(input.name, input.password)
        .send(body)
        .expect(200);

      const merge = { ...input, ...body };
      assertAccountJsonResponse(merge, res.text);
      assertAccountInputAndJsonResponseMatchDatabase(merge, res.text);

      const { rowCount } = await pool.query(`
        SELECT * FROM users WHERE name = '${input.name}';
      `);

      assert.equal(rowCount, 0);
    });

    it("updates account password", async () => {
      const input = { name: "gabriel", password: "password" };
      const body = { password: "drowssap" };

      await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user/update")
        .auth(input.name, input.password)
        .send(body)
        .expect(200);

      const merge = { ...input, ...body };
      assertAccountJsonResponse(merge, res.text);
      assertAccountInputAndJsonResponseMatchDatabase(merge, res.text);
    });

    it("updates account email without email", async () => {
      const input = { name: "gabriel", password: "password" };
      const body = { email: "gabriel@mail.com" };

      await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user/update")
        .auth(input.name, input.password)
        .send(body)
        .expect(200);

      const merge = { ...input, ...body };
      assertAccountJsonResponse(merge, res.text);
      assertAccountInputAndJsonResponseMatchDatabase(merge, res.text);
    });

    it("updates account email with new email", async () => {
      const input = {
        name: "gabriel",
        password: "password",
        email: "gabriel@mail.com",
      };

      const body = { email: "gabbe@mail.com" };

      await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user/update")
        .auth(input.name, input.password)
        .send(body)
        .expect(200);

      const merge = { ...input, ...body };
      assertAccountJsonResponse(merge, res.text);
      assertAccountInputAndJsonResponseMatchDatabase(merge, res.text);

      const { rowCount } = await pool.query(`
        SELECT * FROM users WHERE email = '${input.email}';
      `);

      assert.equal(rowCount, 0);
    });

    it("updates account email to null", async () => {
      const input = {
        name: "gabriel",
        password: "password",
        email: "gabriel@mail.com",
      };

      const body = { email: null };

      await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user/update")
        .auth(input.name, input.password)
        .send(body)
        .expect(200);

      const merge = { ...input, ...body };
      assertAccountJsonResponse(merge, res.text);
      assertAccountInputAndJsonResponseMatchDatabase(merge, res.text);

      const { rowCount } = await pool.query(`
        SELECT * FROM users WHERE email = '${input.email}';
      `);

      assert.equal(rowCount, 0);
    });

    it("updates account all fields", async () => {
      const input = {
        name: "gabriel",
        password: "password",
        email: "gabriel@mail.com",
      };

      const body = {
        name: "gabbe",
        password: "dorwssap",
        email: "gabbe@mail.com",
      };

      await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user/update")
        .auth(input.name, input.password)
        .send(body)
        .expect(200);

      const merge = { ...input, ...body };
      assertAccountJsonResponse(merge, res.text);
      assertAccountInputAndJsonResponseMatchDatabase(merge, res.text);

      const { rowCount } = await pool.query(`
        SELECT * FROM users
        WHERE name = '${input.name}'
        OR email = '${input.email}';
      `);

      assert.equal(rowCount, 0);
    });

    it("updates account with same values", async () => {
      const input = {
        name: "gabriel",
        password: "password",
        email: "gabriel@mail.com",
      };

      await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user/update")
        .auth(input.name, input.password)
        .send(input)
        .expect(200);

      assertAccountJsonResponse(input, res.text);
      assertAccountInputAndJsonResponseMatchDatabase(input, res.text);
    });
  });

  describe("delete", () => {
    assertBasicAuth("/api/v1/user/delete", "post");

    it("removes account", async () => {
      const input = { name: "gabriel", password: "password" };

      await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      await request(app.callback())
        .post("/api/v1/user/delete")
        .auth(input.name, input.password)
        .expect(204);

      const { rowCount } = await pool.query(`
        SELECT * FROM users WHERE name = '${input.name}';
      `);

      assert.equal(rowCount, 0);
    });
  });
});
