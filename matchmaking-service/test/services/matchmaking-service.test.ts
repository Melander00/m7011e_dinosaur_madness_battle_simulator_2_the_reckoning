import * as db from "../../src/db";
import * as rabbit from "../../src/messaging/rabbitmq";
import { getAmountInQueue, matchmakingService } from "../../src/services/matchmaking-service";

beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
});

beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(global, "setInterval");
    jest.spyOn(global, "clearInterval");
});

afterEach(() => {
    jest.useRealTimers();
});

jest.mock("../../src/db", () => ({
    query: jest.fn(),
}));

jest.mock("../../src/messaging/rabbitmq", () => ({
    publishMatchFound: jest.fn().mockResolvedValue(undefined),
}));

const queryMock = db.query as jest.MockedFunction<typeof db.query>;
const publishMock = rabbit.publishMatchFound as jest.MockedFunction<typeof rabbit.publishMatchFound>;

describe("MatchmakingService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers(); // for startMatchmaking interval
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe("addToQueue", () => {
        it("inserts or updates a player in queue", async () => {
            queryMock.mockResolvedValue({ rowCount: 1, rows: [], command: "", oid: 0, fields: [] } as any);

            await matchmakingService.addToQueue("user1", 1200);

            expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO matchmaking_queue"), [
                "user1",
                1200,
            ]);
        });
    });

    describe("removeFromQueue", () => {
        it("removes a player from queue", async () => {
            queryMock.mockResolvedValue({ rowCount: 1, rows: [], command: "", oid: 0, fields: [] } as any);

            await matchmakingService.removeFromQueue("user1");

            expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("DELETE FROM matchmaking_queue"), ["user1"]);
        });
    });

    describe("getQueuePosition", () => {
        it("returns position if user exists", async () => {
            queryMock.mockResolvedValueOnce({
                rows: [{ position: 3 }],
                rowCount: 1,
                command: "",
                oid: 0,
                fields: [],
            } as any);

            const pos = await matchmakingService.getQueuePosition("user1");
            expect(pos).toBe(3);
        });

        it("returns null if user not in queue", async () => {
            queryMock.mockResolvedValueOnce({
                rows: [{ position: null }],
                rowCount: 0,
                command: "",
                oid: 0,
                fields: [],
            } as any);

            const pos = await matchmakingService.getQueuePosition("userX");
            expect(pos).toBeNull();
        });
    });

    describe("findMatch", () => {
        it("does nothing if no players in queue", async () => {
            queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0, command: "", oid: 0, fields: [] } as any);

            await matchmakingService.findMatch();

            expect(queryMock).toHaveBeenCalledTimes(1); // first select
            expect(publishMock).not.toHaveBeenCalled();
        });

        it("matches two compatible players", async () => {
            // Longest waiting player
            queryMock.mockResolvedValueOnce({
                rows: [{ userid: "user1", elo: 1200, queue_start_time: new Date() }],
                rowCount: 1,
                command: "",
                oid: 0,
                fields: [],
            } as any);

            // Opponent
            queryMock.mockResolvedValueOnce({
                rows: [{ userid: "user2", elo: 1190, queue_start_time: new Date() }],
                rowCount: 1,
                command: "",
                oid: 0,
                fields: [],
            } as any);

            // Delete both players
            queryMock.mockResolvedValueOnce({ rowCount: 2, rows: [], command: "", oid: 0, fields: [] } as any);

            await matchmakingService.findMatch();

            expect(publishMock).toHaveBeenCalledWith("user1", "user2", true);
        });

        it("does nothing if no suitable opponent", async () => {
            queryMock.mockResolvedValueOnce({
                rows: [{ userid: "user1", elo: 1200, queue_start_time: new Date() }],
                rowCount: 1,
                command: "",
                oid: 0,
                fields: [],
            } as any);

            queryMock.mockResolvedValueOnce({
                rows: [],
                rowCount: 0,
                command: "",
                oid: 0,
                fields: [],
            } as any);

            await matchmakingService.findMatch();

            expect(publishMock).not.toHaveBeenCalled();
        });
    });

    describe("startMatchmaking / stopMatchmaking", () => {
        let setIntervalSpy: jest.SpyInstance;
        let clearIntervalSpy: jest.SpyInstance;

        beforeEach(() => {
            jest.useFakeTimers();
            setIntervalSpy = jest.spyOn(global, "setInterval");
            clearIntervalSpy = jest.spyOn(global, "clearInterval");
        });

        afterEach(() => {
            jest.useRealTimers();
            jest.clearAllMocks();
        });

        it("starts and stops interval", () => {
            matchmakingService.startMatchmaking();
            expect(setIntervalSpy).toHaveBeenCalled(); // <-- spy instance

            matchmakingService.stopMatchmaking();
            expect(clearIntervalSpy).toHaveBeenCalled(); // <-- spy instance
        });
    });
    describe("getQueueStats", () => {
        it("returns stats", async () => {
            queryMock.mockResolvedValueOnce({
                rows: [{ total: "2", avg_wait: "10.5" }],
                rowCount: 1,
                command: "",
                oid: 0,
                fields: [],
            } as any);

            const stats = await matchmakingService.getQueueStats();
            expect(stats.totalPlayers).toBe(2);
            expect(stats.averageWaitTime).toBe(10.5);
        });

        it("returns zeros on error", async () => {
            queryMock.mockRejectedValueOnce(new Error("fail"));

            const stats = await matchmakingService.getQueueStats();
            expect(stats.totalPlayers).toBe(0);
            expect(stats.averageWaitTime).toBe(0);
        });
    });

    describe("getAmountInQueue", () => {
        it("returns number of players", async () => {
            queryMock.mockResolvedValueOnce({
                rows: [{ count: "5" }],
                rowCount: 1,
                command: "",
                oid: 0,
                fields: [],
            } as any);

            const count = await getAmountInQueue();
            expect(count).toBe(5);
        });

        it("returns 0 if no rows", async () => {
            queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0, command: "", oid: 0, fields: [] } as any);

            const count = await getAmountInQueue();
            expect(count).toBe(0);
        });

        it("returns 0 on error", async () => {
            queryMock.mockRejectedValueOnce(new Error("DB fail"));

            const count = await getAmountInQueue();
            expect(count).toBe(0);
        });
    });
});
