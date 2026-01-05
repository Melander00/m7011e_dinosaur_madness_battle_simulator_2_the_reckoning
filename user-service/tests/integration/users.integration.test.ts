import {
  applyTestDbEnv,
  queryTestDb,
  resetUsersTable,
  startTestDb,
  stopTestDb,
} from "./setup/testDb";

type MockRes = {
  statusCode: number;
  body?: any;
  status: jest.Mock;
  json: jest.Mock;
};

function makeRes(): MockRes {
  const res: MockRes = {
    statusCode: 200,
    status: jest.fn(),
    json: jest.fn(),
  };

  res.status.mockImplementation((code: number) => {
    res.statusCode = code;
    return res as any;
  });

  res.json.mockImplementation((body: any) => {
    res.body = body;
    return res as any;
  });

  return res;
}

describe("user-service (integration)", () => {
  const devUserId = "99999999-9999-9999-9999-999999999999";
  const devUsername = "integrationUser";

  let databaseUrl: string;
  let userRepo: typeof import("../../src/repositories/userRepository");
  let handlers: typeof import("../../src/routes/users");
  let db: typeof import("../../src/db") | undefined;

  beforeAll(async () => {
    const container = await startTestDb();
    databaseUrl = container.getConnectionUri();
    applyTestDbEnv(databaseUrl);

    // Integration tests inject a fake authenticated user by directly setting req.userId/req.user.
    process.env.NODE_ENV = "test";

    jest.resetModules();
    userRepo = await import("../../src/repositories/userRepository");
    handlers = await import("../../src/routes/users");
    db = await import("../../src/db");
  });

  afterAll(async () => {
    try {
      await db?.pool.end();
    } finally {
      await stopTestDb();
    }
  });

  beforeEach(async () => {
    await resetUsersTable(databaseUrl);
  });

  it("POST /users/me lazily creates the authenticated user on first login", async () => {
    // Proves: user identity comes from auth (req.userId), not request body input.
    const req = {
      userId: devUserId,
      user: { sub: devUserId, preferred_username: devUsername },
      body: { userId: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", username: "frontend" },
    } as any;
    const res = makeRes();
    const next = jest.fn();

    await handlers.postUsersMe(req, res as any, next);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ userId: devUserId, username: devUsername });

    const dbUser = await queryTestDb<{ userid: string; username: string | null }>(
      databaseUrl,
      "SELECT userId, username FROM users WHERE userId = $1",
      [devUserId]
    );
    expect(dbUser.rows).toEqual([{ userid: devUserId, username: devUsername }]);
  });

  it("GET /users/me returns 404 before creation, then 200 after POST /users/me", async () => {
    // Proves: profile reads come from PostgreSQL and respect existence.
    const req = {
      userId: devUserId,
      user: { sub: devUserId, preferred_username: devUsername },
    } as any;

    const res404 = makeRes();
    await handlers.getUsersMe(req, res404 as any, jest.fn());
    expect(res404.statusCode).toBe(404);

    await handlers.postUsersMe({ ...req, body: {} } as any, makeRes() as any, jest.fn());

    const res200 = makeRes();
    await handlers.getUsersMe(req, res200 as any, jest.fn());
    expect(res200.statusCode).toBe(200);
    expect(res200.body).toEqual({ userId: devUserId, username: devUsername, quote: null });
  });

  it("public lookup GET /users/:userId returns only allowed fields", async () => {
    // Proves: public lookup is unauthenticated and returns a limited profile view.
    const publicUserId = "88888888-8888-8888-8888-888888888888";

    await queryTestDb(
      databaseUrl,
      "INSERT INTO users (userId, username, quote) VALUES ($1, $2, $3)",
      [publicUserId, "publicUser", "hello"]
    );

    const req = { params: { userId: publicUserId } } as any;
    const res = makeRes();
    await handlers.getPublicUserById(req, res as any, jest.fn());

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ userId: publicUserId, username: "publicUser", quote: "hello" });
  });

  it("public lookup rejects invalid UUIDs with 400", async () => {
    // Proves: UUID validation happens before any DB query.
    const req = { params: { userId: "not-a-uuid" } } as any;
    const res = makeRes();

    await handlers.getPublicUserById(req, res as any, jest.fn());
    expect(res.statusCode).toBe(400);
  });

  it("upsertUser preserves existing username when called with null", async () => {
    // Proves: the SQL COALESCE in upsert prevents erasing usernames.
    const req = {
      userId: devUserId,
      user: { sub: devUserId, preferred_username: devUsername },
      body: {},
    } as any;
    await handlers.postUsersMe(req, makeRes() as any, jest.fn());

    await userRepo.upsertUser(devUserId, null);
    const user = await userRepo.getUserById(devUserId);

    expect(user?.username).toBe(devUsername);
  });
});
