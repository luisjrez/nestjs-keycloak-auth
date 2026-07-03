import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import cookieParser from "cookie-parser";
import { execSync } from "child_process";
import { resolve } from "path";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

// ─── Env Setup — MUST be set before any module is imported ──
const TEST_DB_URL = "postgresql://auth_demo:auth_demo@localhost:5434/auth_demo";

process.env["KEYCLOAK_SERVER_URL"] = "http://localhost:8080";
process.env["DATABASE_URL"] = TEST_DB_URL;
// The E2E registers many users in quick succession; the throttler is
// exercised in its own dedicated test instead.
process.env["RATE_LIMIT_DISABLED"] = "1";
process.env["ACCESS_TOKEN_SECRET"] = "e2e-test-access-secret-never-use-in-prod";
process.env["REFRESH_TOKEN_SECRET"] = "e2e-test-refresh-secret-never-use-in-prod";
process.env["SMTP_HOST"] = "localhost";
process.env["SMTP_PORT"] = "1025";
process.env["EMAIL_FROM"] = "noreply@e2e-test.com";
process.env["KEYCLOAK_CONFIG_PATH"] = resolve(
  __dirname,
  "../../../docker/keycloak/keycloak-realm.json",
);

// Push Prisma schema to test DB before suite loads
execSync("npx prisma db push --accept-data-loss --force-reset 2>&1", {
  cwd: resolve(__dirname, ".."),
  env: { ...process.env, DATABASE_URL: TEST_DB_URL },
});

// ─── Helpers ────────────────────────────────────────────────
jest.setTimeout(120_000);

function uid(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`;
}

async function waitForKeycloak(retries = 30): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(
        "http://localhost:8080/realms/test-realm/.well-known/openid-configuration",
      );
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Keycloak did not become available in time");
}

async function getMailpitMessages(): Promise<any[]> {
  const res = await fetch("http://localhost:8025/api/v1/messages");
  const data = (await res.json()) as { messages: any[] };
  return data.messages ?? [];
}

async function getMessageDetail(id: string): Promise<any> {
  const res = await fetch(`http://localhost:8025/api/v1/message/${id}`);
  return res.json();
}

async function deleteMailpitMessages(): Promise<void> {
  await fetch("http://localhost:8025/api/v1/messages", { method: "DELETE" });
}

function extractTokenFromHtml(html: string): string | null {
  const match = html.match(/[?&]token=([a-zA-Z0-9\-_.]+)/);
  return match?.[1] ?? null;
}

// ─── Test Suite ─────────────────────────────────────────────
describe("Auth E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    await waitForKeycloak();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    app.use(cookieParser());
    await app.init();

    prisma = app.get(PrismaService);
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  // ── Health ───────────────────────────────────────────────
  describe("Health Check", () => {
    it("GET /api/health returns status ok", async () => {
      const res = await request(app.getHttpServer()).get("/api/health");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: "ok" });
      expect(res.body.timestamp).toBeDefined();
    });
  });

  // ── Registration ─────────────────────────────────────────
  describe("Registration", () => {
    const regData = {
      email: `e2e-${uid()}@test.com`,
      username: `e2e-${uid()}`,
      password: "StrongPass1!",
    };

    it("POST /api/auth/register creates a user and returns 201", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/register")
        .send(regData)
        .expect(201);

      expect(res.body).toMatchObject({
        message: expect.any(String),
        user: { email: regData.email, username: regData.username },
      });
      expect(res.body.user.id).toBeDefined();
    });

    it("POST /api/auth/register with duplicate email returns 409", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/register")
        .send(regData)
        .expect(409);

      expect(res.body.message).toMatch(/exists/i);
    });
  });

  // ── Login ────────────────────────────────────────────────
  describe("Login", () => {
    const loginUser = {
      email: `e2e-${uid()}@test.com`,
      username: `e2e-${uid()}`,
      password: "StrongPass1!",
    };

    beforeAll(async () => {
      await request(app.getHttpServer())
        .post("/api/auth/register")
        .send(loginUser)
        .expect(201);
    });

    it("POST /api/auth/login with valid credentials returns tokens + cookie", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: loginUser.email, password: loginUser.password })
        .expect(200);

      expect(res.body).toMatchObject({
        accessToken: expect.any(String),
        expiresIn: expect.any(Number),
        user: expect.objectContaining({
          email: loginUser.email,
          username: loginUser.username,
        }),
      });

      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      expect(
        (Array.isArray(cookies) ? cookies : [cookies]).some((c: string) =>
          c.startsWith("refreshToken="),
        ),
      ).toBe(true);
    });

    it("POST /api/auth/login with wrong password returns 401", async () => {
      await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: loginUser.email, password: "WrongPass1!" })
        .expect(401);
    });

    it("POST /api/auth/login with non-existent email returns 401", async () => {
      await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: `noone-${uid()}@test.com`, password: "SomePass1!" })
        .expect(401);
    });
  });

  // ── Authenticated flows (refresh, me, logout) ────────────
  describe("Authenticated flows", () => {
    const authUser = {
      email: `e2e-${uid()}@test.com`,
      username: `e2e-${uid()}`,
      password: "StrongPass1!",
    };
    let accessToken: string;

    beforeAll(async () => {
      await request(app.getHttpServer())
        .post("/api/auth/register")
        .send(authUser)
        .expect(201);

      const loginRes = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: authUser.email, password: authUser.password })
        .expect(200);

      accessToken = loginRes.body.accessToken;
    });

    it("POST /api/auth/refresh returns new access token", async () => {
      const loginRes = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: authUser.email, password: authUser.password })
        .expect(200);

      const cookies = loginRes.headers["set-cookie"];
      const refreshCookie = (Array.isArray(cookies) ? cookies : [cookies]).find(
        (c: string) => c.startsWith("refreshToken="),
      );

      expect(refreshCookie).toBeDefined();
      const cookieValue = refreshCookie!.split(";")[0]!;

      const res = await request(app.getHttpServer())
        .post("/api/auth/refresh")
        .set("Cookie", cookieValue)
        .expect(200);

      expect(res.body).toMatchObject({
        accessToken: expect.any(String),
        expiresIn: expect.any(Number),
      });
    });

    it("GET /api/auth/me returns user profile with valid token", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        email: authUser.email,
        username: authUser.username,
      });
    });

    it("GET /api/auth/me returns 401 without token", async () => {
      await request(app.getHttpServer()).get("/api/auth/me").expect(401);
    });

    it("POST /api/auth/logout clears session", async () => {
      const loginRes = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: authUser.email, password: authUser.password })
        .expect(200);

      const cookies = loginRes.headers["set-cookie"];
      const refreshCookie = (Array.isArray(cookies) ? cookies : [cookies]).find(
        (c: string) => c.startsWith("refreshToken="),
      );
      const cookieValue = refreshCookie?.split(";")[0] ?? "";

      const res = await request(app.getHttpServer())
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${loginRes.body.accessToken}`)
        .set("Cookie", cookieValue)
        .expect(200);

      expect(res.body).toMatchObject({ message: "Logged out successfully" });

      const clearCookies = res.headers["set-cookie"];
      expect(clearCookies).toBeDefined();
      if (Array.isArray(clearCookies)) {
        expect(
          clearCookies.some((c: string) => /refreshToken=;?\s/.test(c)),
        ).toBe(true);
      }
    });
  });

  // ── Forgot / Reset Password ──────────────────────────────
  describe("Password Reset", () => {
    const resetUser = {
      email: `e2e-${uid()}@test.com`,
      username: `e2e-${uid()}`,
      password: "StrongPass1!",
    };

    beforeAll(async () => {
      await request(app.getHttpServer())
        .post("/api/auth/register")
        .send(resetUser)
        .expect(201);
      await deleteMailpitMessages();
    });

    it("POST /api/auth/forgot-password sends email via Mailpit", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/forgot-password")
        .send({ email: resetUser.email })
        .expect(200);

      expect(res.body).toMatchObject({ message: expect.any(String) });

      await new Promise((r) => setTimeout(r, 3000));

      const messages = await getMailpitMessages();
      const resetEmail = messages.find(
        (m: any) =>
          m.Subject?.toLowerCase().includes("reset") ||
          m.Subject?.toLowerCase().includes("password"),
      );
      expect(resetEmail).toBeDefined();
    });

    it("POST /api/auth/reset-password with valid token changes password", async () => {
      const messages = await getMailpitMessages();
      const resetEmail = messages.find(
        (m: any) =>
          m.Subject?.toLowerCase().includes("reset") ||
          m.Subject?.toLowerCase().includes("password"),
      );
      expect(resetEmail).toBeDefined();

      const detail = await getMessageDetail(resetEmail!.ID);
      const token = extractTokenFromHtml(detail.HTML ?? "");
      expect(token).toBeTruthy();

      const newPassword = "NewStrongPass1!";

      const res = await request(app.getHttpServer())
        .post("/api/auth/reset-password")
        .send({ token, newPassword })
        .expect(200);

      expect(res.body).toMatchObject({ message: expect.any(String) });

      const loginRes = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: resetUser.email, password: newPassword })
        .expect(200);

      expect(loginRes.body.accessToken).toBeDefined();
    });
  });

  // ── Magic Link ───────────────────────────────────────────
  describe("Magic Link", () => {
    const magicUser = {
      email: `e2e-${uid()}@test.com`,
      username: `e2e-${uid()}`,
      password: "StrongPass1!",
    };

    beforeAll(async () => {
      await request(app.getHttpServer())
        .post("/api/auth/register")
        .send(magicUser)
        .expect(201);
      await deleteMailpitMessages();
    });

    it("POST /api/auth/magic-link sends email via Mailpit", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/magic-link")
        .send({ email: magicUser.email })
        .expect(200);

      expect(res.body).toMatchObject({ message: expect.any(String) });

      await new Promise((r) => setTimeout(r, 3000));

      const messages = await getMailpitMessages();
      const magicEmail = messages.find(
        (m: any) =>
          m.Subject?.toLowerCase().includes("magic") ||
          m.Subject?.toLowerCase().includes("sign in"),
      );
      expect(magicEmail).toBeDefined();
    });

    it("POST /api/auth/magic-link/verify authenticates with token", async () => {
      const messages = await getMailpitMessages();
      const magicEmail = messages.find(
        (m: any) =>
          m.Subject?.toLowerCase().includes("magic") ||
          m.Subject?.toLowerCase().includes("sign in"),
      );
      expect(magicEmail).toBeDefined();

      const detail = await getMessageDetail(magicEmail!.ID);
      const token = extractTokenFromHtml(detail.HTML ?? "");
      expect(token).toBeTruthy();

      const res = await request(app.getHttpServer())
        .post("/api/auth/magic-link/verify")
        .send({ token })
        .expect(200);

      expect(res.body).toMatchObject({
        accessToken: expect.any(String),
        expiresIn: expect.any(Number),
      });

      const meRes = await request(app.getHttpServer())
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${res.body.accessToken}`)
        .expect(200);

      expect(meRes.body.email).toBe(magicUser.email);
    });
  });

  // ── 2FA ──────────────────────────────────────────────────
  describe("2FA", () => {
    const faUser = {
      email: `e2e-${uid()}@test.com`,
      username: `e2e-${uid()}`,
      password: "StrongPass1!",
    };
    let accessToken: string;

    beforeAll(async () => {
      await request(app.getHttpServer())
        .post("/api/auth/register")
        .send(faUser)
        .expect(201);

      const loginRes = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: faUser.email, password: faUser.password })
        .expect(200);

      accessToken = loginRes.body.accessToken;
    });

    let totpSecret: string;

    it("POST /api/auth/2fa/setup generates secret and QR code", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/2fa/setup")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({})
        .expect(200);

      expect(res.body).toMatchObject({
        secret: expect.any(String),
        qrCodeUrl: expect.any(String),
      });
      totpSecret = res.body.secret;
    });

    it("POST /api/auth/2fa/setup again returns 409 when already configured", async () => {
      await request(app.getHttpServer())
        .post("/api/auth/2fa/setup")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({})
        .expect(409);
    });

    it("POST /api/auth/2fa/verify returns verified boolean", async () => {
      const speakeasy = await import("speakeasy");
      const validCode = speakeasy.totp({ secret: totpSecret, encoding: "base32" });

      const res = await request(app.getHttpServer())
        .post("/api/auth/2fa/verify")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ code: validCode })
        .expect(200);

      expect(res.body).toMatchObject({
        verified: true,
      });
    });

    it("login now requires 2FA and completes via /2fa/complete", async () => {
      const speakeasy = await import("speakeasy");

      const loginRes = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: faUser.email, password: faUser.password })
        .expect(200);

      // With TOTP configured, login yields a pre-auth token, not a session.
      expect(loginRes.body.twoFactorRequired).toBe(true);
      expect(loginRes.body.preAuthToken).toEqual(expect.any(String));
      expect(loginRes.body.accessToken).toBeUndefined();

      const validCode = speakeasy.totp({ secret: totpSecret, encoding: "base32" });

      const completeRes = await request(app.getHttpServer())
        .post("/api/auth/2fa/complete")
        .send({ preAuthToken: loginRes.body.preAuthToken, code: validCode })
        .expect(200);

      expect(completeRes.body.accessToken).toEqual(expect.any(String));

      const meRes = await request(app.getHttpServer())
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${completeRes.body.accessToken}`)
        .expect(200);

      expect(meRes.body.email).toBe(faUser.email);
    });
  });
});
