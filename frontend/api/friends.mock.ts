// frontend/api/friends.mock.ts

import type { Friend } from "./friends";

export async function getFriendsMock(): Promise<Friend[]> {
  return [
    { id: "uuid-alice", username: "Alice" },
    { id: "uuid-bob", username: "Bob" },
    { id: "uuid-charlie", username: "Charlie" },
  ];
}
