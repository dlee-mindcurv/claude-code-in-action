import { test, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mockCookieSet = vi.fn();
const mockCookieGet = vi.fn();
const mockCookieDelete = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    set: mockCookieSet,
    get: mockCookieGet,
    delete: mockCookieDelete,
  }),
}));

const mockSign = vi.fn().mockResolvedValue("mock-jwt-token");
const mockSetIssuedAt = vi.fn().mockReturnValue({ sign: mockSign });
const mockSetExpirationTime = vi.fn().mockReturnValue({ setIssuedAt: mockSetIssuedAt });
const mockSetProtectedHeader = vi.fn().mockReturnValue({ setExpirationTime: mockSetExpirationTime });
const mockJwtVerify = vi.fn();

let capturedPayload: Record<string, unknown>;
vi.mock("jose", () => ({
  SignJWT: class {
    constructor(payload: Record<string, unknown>) {
      capturedPayload = payload;
    }
    setProtectedHeader = mockSetProtectedHeader;
  },
  jwtVerify: mockJwtVerify,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test("createSession sets a cookie with the correct name and options", async () => {
  const { createSession } = await import("@/lib/auth");
  await createSession("user-123", "test@example.com");

  expect(mockCookieSet).toHaveBeenCalledWith(
    "auth-token",
    "mock-jwt-token",
    expect.objectContaining({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    })
  );
});

test("createSession creates a JWT with userId and email", async () => {
  const { createSession } = await import("@/lib/auth");
  await createSession("user-456", "hello@example.com");

  expect(capturedPayload).toMatchObject({
    userId: "user-456",
    email: "hello@example.com",
  });
  expect(capturedPayload.expiresAt).toBeInstanceOf(Date);
});

test("createSession sets cookie expiration to 7 days", async () => {
  const { createSession } = await import("@/lib/auth");
  const before = Date.now();
  await createSession("user-789", "user@example.com");

  const { expires } = mockCookieSet.mock.calls[0][2];
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  expect(expires.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
  expect(expires.getTime()).toBeLessThanOrEqual(Date.now() + sevenDaysMs);
});

// getSession

test("getSession returns payload when valid token exists", async () => {
  const sessionData = { userId: "user-1", email: "a@b.com", expiresAt: new Date().toISOString() };
  mockCookieGet.mockReturnValue({ value: "valid-token" });
  mockJwtVerify.mockResolvedValue({ payload: sessionData });

  const { getSession } = await import("@/lib/auth");
  const result = await getSession();

  expect(mockJwtVerify.mock.calls[0][0]).toBe("valid-token");
  expect(result).toEqual(sessionData);
});

test("getSession returns null when no cookie exists", async () => {
  mockCookieGet.mockReturnValue(undefined);

  const { getSession } = await import("@/lib/auth");
  const result = await getSession();

  expect(result).toBeNull();
  expect(mockJwtVerify).not.toHaveBeenCalled();
});

test("getSession returns null when token verification fails", async () => {
  mockCookieGet.mockReturnValue({ value: "bad-token" });
  mockJwtVerify.mockRejectedValue(new Error("invalid signature"));

  const { getSession } = await import("@/lib/auth");
  const result = await getSession();

  expect(result).toBeNull();
});

// deleteSession

test("deleteSession removes the auth cookie", async () => {
  const { deleteSession } = await import("@/lib/auth");
  await deleteSession();

  expect(mockCookieDelete).toHaveBeenCalledWith("auth-token");
});

// verifySession

test("verifySession returns payload from request cookie", async () => {
  const sessionData = { userId: "user-2", email: "c@d.com" };
  mockJwtVerify.mockResolvedValue({ payload: sessionData });

  const request = new NextRequest("http://localhost:3000/api/test", {
    headers: { cookie: "auth-token=request-token" },
  });

  const { verifySession } = await import("@/lib/auth");
  const result = await verifySession(request);

  expect(mockJwtVerify.mock.calls[0][0]).toBe("request-token");
  expect(result).toEqual(sessionData);
});

test("verifySession returns null when request has no auth cookie", async () => {
  const request = new NextRequest("http://localhost:3000/api/test");

  const { verifySession } = await import("@/lib/auth");
  const result = await verifySession(request);

  expect(result).toBeNull();
  expect(mockJwtVerify).not.toHaveBeenCalled();
});

test("verifySession returns null when request token is invalid", async () => {
  mockJwtVerify.mockRejectedValue(new Error("expired"));

  const request = new NextRequest("http://localhost:3000/api/test", {
    headers: { cookie: "auth-token=expired-token" },
  });

  const { verifySession } = await import("@/lib/auth");
  const result = await verifySession(request);

  expect(result).toBeNull();
});
