// test/monitoring/prometheus.test.ts
describe("Prometheus metrics (mocked)", () => {
  let Prom: typeof import("../../src/monitoring/prometheus");
  let incMock: jest.Mock;
  let decMock: jest.Mock;
  let observeMock: jest.Mock;
  let metricsMock: jest.Mock;

  beforeEach(() => {
    incMock = jest.fn();
    decMock = jest.fn();
    observeMock = jest.fn();
    metricsMock = jest.fn().mockResolvedValue("mock-metrics");

    jest.isolateModules(() => {
      jest.mock("prom-client", () => {
        const Counter = jest.fn().mockImplementation(() => ({ inc: incMock }));
        const Gauge = jest.fn().mockImplementation(() => ({ inc: incMock, dec: decMock }));
        const Histogram = jest.fn().mockImplementation(() => ({ observe: observeMock }));
        const register = { metrics: metricsMock, contentType: "text/plain" };
        return { Counter, Gauge, Histogram, register };
      });

      // Import the module AFTER mocking
      Prom = require("../../src/monitoring/prometheus");
    });
  });

  test("incRequestCount calls counter.inc with correct labels", () => {
    Prom.incRequestCount(200, { method: "GET", endpoint: "/mock" });
    expect(incMock).toHaveBeenCalledWith({
      method: "GET",
      endpoint: "/mock",
      status: 200,
      service: "game-master",
    });
  });

  test("createRequestDuration.observe is called on end", () => {
    const timer = Prom.createRequestDuration({ method: "POST", endpoint: "/mock" });
    timer.end();
    expect(observeMock).toHaveBeenCalledWith(
      { method: "POST", endpoint: "/mock", service: "game-master" },
      expect.any(Number)
    );
  });

  test("incMatches calls counter.inc", () => {
    Prom.incMatches();
    expect(incMock).toHaveBeenCalledWith({ service: "game-master" });
  });

  test("incActiveMatches and decActiveMatches call gauge.inc/gauge.dec", () => {
    Prom.incActiveMatches();
    Prom.decActiveMatches();
    expect(incMock).toHaveBeenCalledWith({ service: "game-master" });
    expect(decMock).toHaveBeenCalledWith({ service: "game-master" });
  });

  test("createMatchDuration.observe is called on end", () => {
    const timer = Prom.createMatchDuration();
    timer.end();
    expect(observeMock).toHaveBeenCalledWith({ service: "game-master" }, expect.any(Number));
  });

  test("getMetrics returns mocked metrics and contentType", async () => {
    const result = await Prom.getMetrics();
    expect(result.metrics).toBe("mock-metrics");
    expect(result.contentType).toBe("text/plain");
  });
});
