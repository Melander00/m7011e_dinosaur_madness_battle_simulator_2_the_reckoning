// frontend/api/gameMaster.mock.ts

import type { ActiveMatch } from "./gameMaster";

let attempts = 0;

/**
 * Simulates polling GET /match
 * - First calls fail (no active match)
 * - Later call succeeds (match found)
 */
export async function getActiveMatchMock(): Promise<ActiveMatch> {
  attempts++;

  // Simulate "no match yet"
  if (attempts < 3) {
    throw new Error("No active match");
  }

  // Simulate match becoming available
  return {
    domain: "game.example.com",
    subpath: "/match/abc123",
  };
}
