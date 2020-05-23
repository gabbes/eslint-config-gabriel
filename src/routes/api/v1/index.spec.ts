import * as assert from "assert";
import * as jwt from "jsonwebtoken";
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = jwt.decode(text);

  assert.equal(Object.keys(payload).length, 4);
  assert.equal(typeof payload.id, "string");
  assert.equal(payload.id.length, 36);
  assert.equal(typeof payload.iat, "number");
  assert.equal(payload.name, input.name);
  assert.equal(payload.email, input.email || null);
}

async function assertAccountInputAndJsonResponseMatchDatabase(
  input: Input,
  text: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = jwt.decode(text);

  const { rowCount, rows } = await pool.query(`
    SELECT * FROM users WHERE id = '${payload.id}';
  `);

  assert.equal(rowCount, 1);
  assert.equal(Object.keys(rows[0]).length, 5);
  assert.equal(rows[0].id, payload.id);
  assert.equal(rows[0].name, payload.name);
  assert.notEqual(rows[0].password, input.password);
  assert.equal(rows[0].password, md5(input.password));
  assert.equal(rows[0].email, input.email || null);
  assert.ok(rows[0].created instanceof Date);
}

function assertJWT(url: string): void {
  it("requires authorization header", async () => {
    const { text } = await request(app.callback()).post(url).expect(401);

    assert.equal(text, "JWT required");
  });

  it("requires authorization header jwt token", async () => {
    const { text } = await request(app.callback())
      .post(url)
      .set("Authorization", "Bearer xxx")
      .expect(401);

    assert.equal(text, "Invalid JWT");
  });
}

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
    it("requires basic auth", async () => {
      const res = await request(app.callback()).get("/api/v1/user").expect(401);

      assert.equal(res.text, "Basic authentication required");
    });

    it("requires basic auth name", async () => {
      const res = await request(app.callback())
        .get("/api/v1/user")
        .auth("", "x")
        .expect(401);

      assert.equal(res.text, "Basic authentication name required");
    });

    it("requires basic auth password", async () => {
      const res = await request(app.callback())
        .get("/api/v1/user")
        .auth("x", "")
        .expect(401);

      assert.equal(res.text, "Basic authentication password required");
    });

    it("requires valid basic auth", async () => {
      const res = await request(app.callback())
        .get("/api/v1/user")
        .auth("x", "x")
        .expect(401);

      assert.equal(res.text, "Unauthorized");
    });

    it("authenticates account", async () => {
      const input = { name: "gabriel", password: "password" };

      await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      const { text } = await request(app.callback())
        .get("/api/v1/user")
        .auth(input.name, input.password)
        .expect(200);

      assertAccountJsonResponse(input, text);
      await assertAccountInputAndJsonResponseMatchDatabase(input, text);
    });
  });

  describe("update", () => {
    assertJWT("/api/v1/user/update");

    it("requires input body", async () => {
      const input = { name: "gabriel", password: "password" };

      const { text } = await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user/update")
        .set("Authorization", `Bearer ${text}`)
        .expect(400);

      assert.equal(res.text, "Invalid input");
    });

    it("requires input body to not be empty", async () => {
      const input = { name: "gabriel", password: "password" };

      const { text } = await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user/update")
        .set("Authorization", `Bearer ${text}`)
        .send({})
        .expect(400);

      assert.equal(res.text, "Invalid input");
    });

    it("requires input body to contain valid field", async () => {
      const input = { name: "gabriel", password: "password" };

      const { text } = await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user/update")
        .set("Authorization", `Bearer ${text}`)
        .send({ favoriteFood: "pancakes" })
        .expect(400);

      assert.equal(res.text, "Invalid input");
    });

    it("requires input body name to be minimum 2 characters", async () => {
      const input = { name: "gabriel", password: "password" };

      const { text } = await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user/update")
        .set("Authorization", `Bearer ${text}`)
        .send({ name: "x" })
        .expect(400);

      assert.equal(res.text, "Invalid input name");
    });

    it("requires input body name to be maximum 18 characters", async () => {
      const input = { name: "gabriel", password: "password" };

      const { text } = await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user/update")
        .set("Authorization", `Bearer ${text}`)
        .send({ name: "x".repeat(19) })
        .expect(400);

      assert.equal(res.text, "Invalid input name");
    });

    it("requires input body name to only contain valid characters", async () => {
      const input = { name: "gabriel", password: "password" };

      const { text } = await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user/update")
        .set("Authorization", `Bearer ${text}`)
        .send({ name: "gabriäl" })
        .expect(400);

      assert.equal(res.text, "Invalid input name");
    });

    it("requires input body password to be minumum 6 characters", async () => {
      const input = { name: "gabriel", password: "password" };

      const { text } = await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user/update")
        .set("Authorization", `Bearer ${text}`)
        .send({ password: "x".repeat(2) })
        .expect(400);

      assert.equal(res.text, "Invalid input password");
    });

    it("requires input body password to be maximum 128 characters", async () => {
      const input = { name: "gabriel", password: "password" };

      const { text } = await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user/update")
        .set("Authorization", `Bearer ${text}`)
        .send({ password: "x".repeat(129) })
        .expect(400);

      assert.equal(res.text, "Invalid input password");
    });

    it("requires input body email to follow valid format", async () => {
      const input = { name: "gabriel", password: "password" };

      const { text } = await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user/update")
        .set("Authorization", `Bearer ${text}`)
        .send({ email: "x@x" })
        .expect(400);

      assert.equal(res.text, "Invalid input email");
    });

    it("requires input body name to be unique", async () => {
      const input = { name: "gabriel", password: "password" };

      const input2 = { name: "franz", password: "password" };

      const { text } = await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      await request(app.callback())
        .post("/api/v1/user")
        .send(input2)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user/update")
        .set("Authorization", `Bearer ${text}`)
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

      const { text } = await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      await request(app.callback())
        .post("/api/v1/user")
        .send(input2)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user/update")
        .set("Authorization", `Bearer ${text}`)
        .send({ email: input2.email })
        .expect(409);

      assert.equal(res.text, "Email taken");
    });

    it("updates account name", async () => {
      const input = { name: "gabriel", password: "password" };
      const body = { name: "gabbe" };

      const { text } = await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user/update")
        .set("Authorization", `Bearer ${text}`)
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

      const { text } = await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      const res = await request(app.callback())
        .post("/api/v1/user/update")
        .set("Authorization", `Bearer ${text}`)
        .send(body)
        .expect(200);

      const merge = { ...input, ...body };
      assertAccountJsonResponse(merge, res.text);
      assertAccountInputAndJsonResponseMatchDatabase(merge, res.text);
    });
  });

  it("updates account email without email", async () => {
    const input = { name: "gabriel", password: "password" };
    const body = { email: "gabriel@mail.com" };

    const { text } = await request(app.callback())
      .post("/api/v1/user")
      .send(input)
      .expect(201);

    const res = await request(app.callback())
      .post("/api/v1/user/update")
      .set("Authorization", `Bearer ${text}`)
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

    const { text } = await request(app.callback())
      .post("/api/v1/user")
      .send(input)
      .expect(201);

    const res = await request(app.callback())
      .post("/api/v1/user/update")
      .set("Authorization", `Bearer ${text}`)
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

    const { text } = await request(app.callback())
      .post("/api/v1/user")
      .send(input)
      .expect(201);

    const res = await request(app.callback())
      .post("/api/v1/user/update")
      .set("Authorization", `Bearer ${text}`)
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

    const { text } = await request(app.callback())
      .post("/api/v1/user")
      .send(input)
      .expect(201);

    const res = await request(app.callback())
      .post("/api/v1/user/update")
      .set("Authorization", `Bearer ${text}`)
      .send(body)
      .expect(200);

    const merge = { ...input, ...body };
    assertAccountJsonResponse(merge, res.text);
    assertAccountInputAndJsonResponseMatchDatabase(merge, res.text);

    const { rowCount } = await pool.query(`
      SELECT *
      FROM users
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

    const { text } = await request(app.callback())
      .post("/api/v1/user")
      .send(input)
      .expect(201);

    const res = await request(app.callback())
      .post("/api/v1/user/update")
      .set("Authorization", `Bearer ${text}`)
      .send(input)
      .expect(200);

    assertAccountJsonResponse(input, res.text);
    assertAccountInputAndJsonResponseMatchDatabase(input, res.text);
  });

  describe("delete", () => {
    assertJWT("/api/v1/user/delete");

    it("deletes account", async () => {
      const input = { name: "gabriel", password: "password" };

      const { text } = await request(app.callback())
        .post("/api/v1/user")
        .send(input)
        .expect(201);

      await request(app.callback())
        .post("/api/v1/user/delete")
        .set("Authorization", `Bearer ${text}`)
        .expect(204);

      const { rowCount } = await pool.query(`
        SELECT * FROM users WHERE name = '${input.name}';
      `);

      assert.equal(rowCount, 0);
    });
  });
});
