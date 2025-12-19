import { CoreV1Api, KubeConfig, NetworkingV1Api } from "@kubernetes/client-node";
import { GameServer, ServerOptions } from "../../src/game/GameServer";

jest.mock("../../src/k8s/gamePod", () => ({
  createPodManifest: jest.fn(() => ({ mock: "pod" })),
}));
jest.mock("../../src/k8s/gameService", () => ({
  createServiceManifest: jest.fn(() => ({ mock: "service" })),
}));
jest.mock("../../src/k8s/gameIngress", () => ({
  createIngressManifest: jest.fn(() => ({ mock: "ingress" })),
}));

describe("GameServer", () => {
  let coreApi: jest.Mocked<CoreV1Api>;
  let networkApi: jest.Mocked<NetworkingV1Api>;
  let options: ServerOptions;

  beforeEach(() => {
    coreApi = {
      createNamespacedPod: jest.fn(),
      createNamespacedService: jest.fn(),
      deleteNamespacedPod: jest.fn(),
      deleteNamespacedService: jest.fn(),
    } as any;

    networkApi = {
      createNamespacedIngress: jest.fn(),
      deleteNamespacedIngress: jest.fn(),
    } as any;

    options = {
      matchId: "match1",
      user1: "u1",
      user2: "u2",
      namespace: "ns",
      domain: "example.com",
      ranked: true,
      subpath: "/test",
    };
  });

  test("init sets podName, serviceName, ingressName", async () => {
    coreApi.createNamespacedPod.mockResolvedValue({ metadata: { name: "pod1" } } as any);
    coreApi.createNamespacedService.mockResolvedValue({ metadata: { name: "svc1" } } as any);
    networkApi.createNamespacedIngress.mockResolvedValue({ metadata: { name: "ing1" } } as any);

    const server = new GameServer(options, coreApi, networkApi);
    await server.init();

    expect(server.podName).toBe("pod1");
    expect(server.serviceName).toBe("svc1");
    expect(server.ingressName).toBe("ing1");
  });

  test("create calls init and returns instance", async () => {
    coreApi.createNamespacedPod.mockResolvedValue({ metadata: { name: "pod1" } } as any);
    coreApi.createNamespacedService.mockResolvedValue({ metadata: { name: "svc1" } } as any);
    networkApi.createNamespacedIngress.mockResolvedValue({ metadata: { name: "ing1" } } as any);

    const server = await GameServer.create(options, coreApi, networkApi);
    expect(server).toBeInstanceOf(GameServer);
    expect(server.podName).toBe("pod1");
  });

  test("stop calls delete methods if resources exist", async () => {
    const server = new GameServer(options, coreApi, networkApi);
    server.podName = "pod1";
    server.serviceName = "svc1";
    server.ingressName = "ing1";

    await server.stop();

    expect(coreApi.deleteNamespacedPod).toHaveBeenCalledWith({ name: "pod1", namespace: "ns" });
    expect(coreApi.deleteNamespacedService).toHaveBeenCalledWith({ name: "svc1", namespace: "ns" });
    expect(networkApi.deleteNamespacedIngress).toHaveBeenCalledWith({ name: "ing1", namespace: "ns" });
  });

  test("wait resolves when pod is ready", async () => {
    const watchMock = {
      watch: jest.fn().mockImplementation(async (_path, _opts, cb, _errCb) => ({
        abort: jest.fn(),
      })),
    };
    const kc = {} as KubeConfig;

    // @ts-ignore
    jest.spyOn(require("@kubernetes/client-node"), "Watch").mockImplementation(() => watchMock);

    const server = new GameServer(options, coreApi, networkApi);
    server.podName = "pod1";

    // simulate ready pod
    watchMock.watch.mockImplementationOnce(async (_path, _opts, cb) => {
      cb("MODIFIED", { status: { phase: "Running", conditions: [{ type: "Ready", status: "True" }] } });
      return { abort: jest.fn() };
    });

    await expect(server.wait(kc)).resolves.toBeUndefined();
  });

  test("wait rejects when pod fails", async () => {
    const abortMock = jest.fn();
    const watchMock = {
      watch: jest.fn().mockImplementation(async (_path, _opts, cb) => ({
        abort: abortMock,
      })),
    };
    const kc = {} as KubeConfig;

    // @ts-ignore
    jest.spyOn(require("@kubernetes/client-node"), "Watch").mockImplementation(() => watchMock);

    const server = new GameServer(options, coreApi, networkApi);
    server.podName = "pod1";

    watchMock.watch.mockImplementationOnce(async (_path, _opts, cb) => {
      cb("MODIFIED", { status: { phase: "Failed" } });
      return { abort: abortMock };
    });

    await expect(server.wait(kc)).rejects.toThrow("Pod pod1 failed to start");
  });
});
