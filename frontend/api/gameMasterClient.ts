// frontend/api/gameMasterClient.ts

import { getActiveMatch as getActiveMatchReal } from "./gameMaster";
import { getActiveMatchMock } from "./gameMaster.mock";
import type { ActiveMatch } from "./gameMaster";

// Toggle this later via env if you want
const USE_MOCKS = true;

export async function getActiveMatch(token: string): Promise<ActiveMatch> {
  if (USE_MOCKS) {
    return getActiveMatchMock();
  }

  return getActiveMatchReal(token);
}
