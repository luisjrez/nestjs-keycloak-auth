import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import cookieParser from "cookie-parser";
import { resolve } from "path";
import { rmSync } from "node:fs";

const SQLITE_PATH = resolve(__dirname, "e2e-typeorm.sqlite");
process.env["KEYCLOAK_SERVER_URL"] = "http://localhost:8080";
process.env["SQLITE_PATH"] = SQLITE_PATH;
process.env["ACCESS_TOKEN_SECRET"] = "e2e-typeorm-access-secret-never-in-prod";
process.env["REFRESH_TOKEN_SECRET"] = "e2e-typeorm-refresh-secret-never-in-prod";
process.env["SMTP_HOST"] = "localhost";
process.env["SMTP_PORT"] = "1025";
process.env["RATE_LIMIT_DISABLED"] = "1";
process.env["KEYCLOAK_CONFIG_PATH"] = resolve(
  __dirname,
  "../../../docker/keycloak/keycloak-realm.json",
);

for (const ext of ["", "-shm", "-wal"]) {
  try {
    rmSync(`${SQLITE_PATH}${ext}`);
  } catch {
    /* not present */
  }
}

import { AppModule } from "../src/app.module";

jest.setTimeout(120_000);

function uid(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
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

describe("TypeORM store E2E", () => {
  let app: INestApplication;

  beforeAll(async () => {
    await waitForKeycloak();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    app.use(cookieParser());
    await app.init();
  }, 120_000);

  afterAll(async () => {
    await app?.close();
  });

  const user = {
    email: `to-${uid()}@test.com`,
    username: `to${uid()}`,
    password: "StrongPass1!",
  };

  it("registers a user (persisted via TypeORM)", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send(user)
      .expect(201);
    expect(res.body.user.email).toBe(user.email);
  });

  it("logs in and sets a refresh cookie", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: user.email, password: user.password })
      .expect(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    const cookies = res.headers["set-cookie"];
    expect(
      (Array.isArray(cookies) ? cookies : [cookies]).some((c: string) =>
        c.startsWith("refreshToken="),
      ),
    ).toBe(true);
  });

  it("rotates the refresh token and detects reuse (the atomic-consume contract)", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: user.email, password: user.password })
      .expect(200);
    const cookies = login.headers["set-cookie"];
    const refreshCookie = (Array.isArray(cookies) ? cookies : [cookies]).find(
      (c: string) => c.startsWith("refreshToken="),
    )!;
    const cookieValue = refreshCookie.split(";")[0]!;

    // First refresh rotates successfully.
    await request(app.getHttpServer())
      .post("/api/auth/refresh")
      .set("Cookie", cookieValue)
      .expect(200);

    // Reusing the now-consumed token must be rejected (reuse detection).
    await request(app.getHttpServer())
      .post("/api/auth/refresh")
      .set("Cookie", cookieValue)
      .expect(401);
  });

  it("rejects an unknown refresh token", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/refresh")
      .set("Cookie", "refreshToken=not-a-real-token")
      .expect(401);
  });
});
