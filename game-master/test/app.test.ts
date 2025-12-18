import { createApp } from "../src/app";

jest.mock("../src/routes", () => ({
  initRoutes: (app: any) => app, // no-op for now
}));

jest.mock("../src/db/redis", () => ({
  getMetrics: jest.fn(),
  getUserActiveMatch: jest.fn(),
  getMatchById: jest.fn(),
}));

describe("Express App", () => {
  let app = createApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should create an Express app", async () => {
    expect(app).toBeDefined();
    expect(app.use).toBeDefined();
  });

  // Example if you want to test real routes from initRoutes
  // test("GET /metrics returns metrics", async () => {
  //   (getMetrics as jest.Mock).mockResolvedValue({ contentType: "text/plain", metrics: "data" });
  //   const res = await request(app).get("/metrics");
  //   expect(res.status).toBe(200);
  //   expect(res.text).toBe("data");
  // });
});
