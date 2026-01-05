// frontend/api/gameMaster.ts

export type ActiveMatch = {
  domain: string;
  subpath: string;
};

/**
 * GET /match
 * Requires JWT
 * Returns active match connection info
 */
export async function getActiveMatch(token: string): Promise<ActiveMatch> {
  throw new Error(
    "getActiveMatch (real) is not implemented yet. Use mock client."
  );
}
