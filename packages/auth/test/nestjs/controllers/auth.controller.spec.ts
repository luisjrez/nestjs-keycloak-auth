import { Test, type TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import cookieParser from "cookie-parser";
import { AuthController } from "../../../src/nestjs/controllers/auth.controller";
import { JwtAuthGuard } from "../../../src/nestjs/guards/jwt-auth.guard";
import { AuthExceptionFilter } from "../../../src/nestjs/filters/auth-exception.filter";
import { RegisterUseCase } from "../../../src/application/use-cases/register.use-case";
import { LoginUseCase } from "../../../src/application/use-cases/login.use-case";
import { RefreshTokenUseCase } from "../../../src/application/use-cases/refresh-token.use-case";
import { ForgotPasswordUseCase } from "../../../src/application/use-cases/forgot-password.use-case";
import { ResetPasswordUseCase } from "../../../src/application/use-cases/reset-password.use-case";
import { SendMagicLinkUseCase } from "../../../src/application/use-cases/send-magic-link.use-case";
import { VerifyMagicLinkUseCase } from "../../../src/application/use-cases/verify-magic-link.use-case";
import { Setup2FAUseCase } from "../../../src/application/use-cases/setup-2fa.use-case";
import { Verify2FAUseCase } from "../../../src/application/use-cases/verify-2fa.use-case";
import { LogoutUseCase } from "../../../src/application/use-cases/logout.use-case";
import {
  EmailAlreadyExistsError,
  InvalidCredentialsError,
} from "../../../src/domain/errors/auth-errors";

describe("AuthController", () => {
  let app: INestApplication;

  const mockRegister = { execute: jest.fn() };
  const mockLogin = { execute: jest.fn() };
  const mockRefresh = { execute: jest.fn() };
  const mockForgotPassword = { execute: jest.fn() };
  const mockResetPassword = { execute: jest.fn() };
  const mockSendMagicLink = { execute: jest.fn() };
  const mockVerifyMagicLink = { execute: jest.fn() };
  const mockSetup2FA = { execute: jest.fn() };
  const mockVerify2FA = { execute: jest.fn() };
  const mockLogout = { execute: jest.fn() };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: RegisterUseCase, useValue: mockRegister },
        { provide: LoginUseCase, useValue: mockLogin },
        { provide: RefreshTokenUseCase, useValue: mockRefresh },
        { provide: ForgotPasswordUseCase, useValue: mockForgotPassword },
        { provide: ResetPasswordUseCase, useValue: mockResetPassword },
        { provide: SendMagicLinkUseCase, useValue: mockSendMagicLink },
        { provide: VerifyMagicLinkUseCase, useValue: mockVerifyMagicLink },
        { provide: Setup2FAUseCase, useValue: mockSetup2FA },
        { provide: Verify2FAUseCase, useValue: mockVerify2FA },
        { provide: LogoutUseCase, useValue: mockLogout },
        {
          provide: "AUTH_MODULE_OPTIONS",
          useValue: { jwt: { secret: "test-secret", expiresIn: 900 } },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn((context) => {
          const req = context.switchToHttp().getRequest();
          req.user = { sub: "u-1", email: "test@test.com", username: "testuser" };
          return true;
        }),
      })
      .compile();

    app = module.createNestApplication();
    app.use(cookieParser());
    app.useGlobalFilters(new AuthExceptionFilter());
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /auth/register", () => {
    it("should register a user", async () => {
      mockRegister.execute.mockResolvedValue({ id: "u-1", email: "test@test.com" });

      const res = await request(app.getHttpServer())
        .post("/auth/register")
        .send({ email: "test@test.com", username: "testuser", password: "Secure123" })
        .expect(201);

      expect(res.body.email).toBe("test@test.com");
    });

    it("should handle domain errors", async () => {
      mockRegister.execute.mockRejectedValue(new EmailAlreadyExistsError("Email taken"));

      const res = await request(app.getHttpServer())
        .post("/auth/register")
        .send({ email: "dup@test.com", username: "dup", password: "Secure123" })
        .expect(409);

      expect(res.body.error).toBe("EMAIL_EXISTS");
    });
  });

  describe("POST /auth/login", () => {
    const loginResponse = {
      accessToken: "at-123",
      refreshToken: "rt-123",
      expiresIn: 900,
      user: { id: "u-1", email: "test@test.com", username: "testuser" },
    };

    it("should authenticate and set refresh cookie", async () => {
      mockLogin.execute.mockResolvedValue(loginResponse);

      const res = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: "test@test.com", password: "Secure123" })
        .expect(200);

      expect(res.body.accessToken).toBe("at-123");
      expect(res.body.refreshToken).toBeUndefined();
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("should handle invalid credentials", async () => {
      mockLogin.execute.mockRejectedValue(new InvalidCredentialsError("Bad password"));

      await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: "bad@test.com", password: "wrong" })
        .expect(401);
    });
  });

  describe("POST /auth/refresh", () => {
    it("should use refresh token from cookie", async () => {
      mockRefresh.execute.mockResolvedValue({ accessToken: "new-at", refreshToken: "new-rt", expiresIn: 900 });

      await request(app.getHttpServer())
        .post("/auth/refresh")
        .set("Cookie", ["refreshToken=rt-value"])
        .expect(200);

      expect(mockRefresh.execute).toHaveBeenCalledWith("rt-value");
    });

    it("should pass empty string when no cookie", async () => {
      mockRefresh.execute.mockResolvedValue({ accessToken: "new-at", refreshToken: "new-rt", expiresIn: 900 });

      await request(app.getHttpServer())
        .post("/auth/refresh")
        .expect(200);

      expect(mockRefresh.execute).toHaveBeenCalledWith("");
    });
  });

  describe("POST /auth/logout", () => {
    it("should call logout use case and clear cookie", async () => {
      mockLogout.execute.mockResolvedValue(undefined);

      const res = await request(app.getHttpServer())
        .post("/auth/logout")
        .set("Cookie", ["refreshToken=rt-to-invalidate"]);

      expect(mockLogout.execute).toHaveBeenCalledWith({ refreshToken: "rt-to-invalidate" });
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("should still clear cookie when no refresh token", async () => {
      const res = await request(app.getHttpServer())
        .post("/auth/logout");

      expect(mockLogout.execute).not.toHaveBeenCalled();
      expect(res.headers["set-cookie"]).toBeDefined();
    });
  });

  describe("POST /auth/forgot-password", () => {
    it("should send reset email", async () => {
      mockForgotPassword.execute.mockResolvedValue({ message: "Email sent if user exists" });

      const res = await request(app.getHttpServer())
        .post("/auth/forgot-password")
        .send({ email: "test@test.com" })
        .expect(200);

      expect(res.body.message).toContain("Email sent");
    });
  });

  describe("POST /auth/reset-password", () => {
    it("should reset password", async () => {
      mockResetPassword.execute.mockResolvedValue({ message: "Password reset successfully" });

      const res = await request(app.getHttpServer())
        .post("/auth/reset-password")
        .send({ token: "reset-token", newPassword: "NewPass123" })
        .expect(200);

      expect(res.body.message).toContain("reset successfully");
    });
  });

  describe("POST /auth/magic-link", () => {
    it("should send magic link", async () => {
      mockSendMagicLink.execute.mockResolvedValue({ message: "Magic link sent" });

      const res = await request(app.getHttpServer())
        .post("/auth/magic-link")
        .send({ email: "test@test.com" })
        .expect(200);

      expect(res.body.message).toContain("Magic link sent");
    });
  });

  describe("POST /auth/magic-link/verify", () => {
    const verifyResponse = { accessToken: "at-123", refreshToken: "rt-123", expiresIn: 900 };

    it("should verify magic link and set cookie", async () => {
      mockVerifyMagicLink.execute.mockResolvedValue(verifyResponse);

      const res = await request(app.getHttpServer())
        .post("/auth/magic-link/verify")
        .send({ token: "valid-token" })
        .expect(200);

      expect(res.body.accessToken).toBe("at-123");
      expect(res.body.refreshToken).toBeUndefined();
      expect(res.headers["set-cookie"]).toBeDefined();
    });
  });

  describe("POST /auth/2fa/setup", () => {
    it("should setup 2FA for authenticated user", async () => {
      mockSetup2FA.execute.mockResolvedValue({ secret: "JBSWY", qrCodeUrl: "data:image/png;base64,test" });

      const res = await request(app.getHttpServer())
        .post("/auth/2fa/setup")
        .send({})
        .expect(200);

      expect(res.body.secret).toBe("JBSWY");
    });
  });

  describe("POST /auth/2fa/verify", () => {
    it("should verify 2FA code", async () => {
      mockVerify2FA.execute.mockResolvedValue({ verified: true });

      const res = await request(app.getHttpServer())
        .post("/auth/2fa/verify")
        .send({ code: "123456" })
        .expect(200);

      expect(res.body.verified).toBe(true);
    });
  });

  describe("GET /auth/me", () => {
    it("should return current user from JWT", async () => {
      const res = await request(app.getHttpServer())
        .get("/auth/me")
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });
});
