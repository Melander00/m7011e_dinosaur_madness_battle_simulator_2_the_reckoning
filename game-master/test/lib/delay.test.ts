import { delay } from "../../src/lib/delay";

jest.useFakeTimers();

describe("delay", () => {
  test("resolves after given milliseconds", async () => {
    const promise = delay(1000);

    // Fast-forward all timers
    jest.advanceTimersByTime(1000);

    await expect(promise).resolves.toBeUndefined();
  });

  test("works with zero milliseconds", async () => {
    const promise = delay(0);

    jest.advanceTimersByTime(0);

    await expect(promise).resolves.toBeUndefined();
  });
});
