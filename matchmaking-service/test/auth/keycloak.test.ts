import { NextFunction, Request, Response } from "express";

const mockVerify = jest.fn();

// Mock jwks-rsa client to avoid fetching real JWKS
jest.mock("jwks-rsa", () => {
  return jest.fn().mockImplementation(() => ({
    getSigningKey: jest.fn((kid, cb) => cb(null, { getPublicKey: () => "publicKey" })),
  }));
});

// Mock jsonwebtoken
jest.mock("jsonwebtoken", () => ({
  verify: (...args: any[]) => {
    return mockVerify(...args);
  },
}));

describe("requireAuth middleware", () => {
  let requireAuth: (req: Request, res: Response, next: NextFunction) => void;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Reload module in isolated module context
    jest.isolateModules(() => {
      requireAuth = require("../../src/auth/keycloak").requireAuth;
    });

    req = {
      headers: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();
  });

  it("should return 401 if no Authorization header", () => {
    requireAuth(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "No authorization header" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 if malformed Authorization header", () => {
    if(req.headers)
    req.headers.authorization = "InvalidHeader";

    requireAuth(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid authorization header" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 if token verification fails", () => {
    if(req.headers)
    req.headers.authorization = "Bearer token123";
    mockVerify.mockImplementation((token, key, options, cb) => cb(new Error("Invalid token"), null));

    requireAuth(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid token: Invalid token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 if token is expired", () => {
    if(req.headers)
    req.headers.authorization = "Bearer token123";
    const err = new Error("Expired");
    (err as any).name = "TokenExpiredError";
    mockVerify.mockImplementation((token, key, options, cb) => cb(err, null));

    requireAuth(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Token has expired" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next and attach user if token is valid", () => {
    if(req.headers)
    req.headers.authorization = "Bearer token123";
    const decoded = { sub: "user1", email: "test@test.com" };
    mockVerify.mockImplementation((token, key, options, cb) => cb(null, decoded));

    requireAuth(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect((req as any).user).toEqual(decoded);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
