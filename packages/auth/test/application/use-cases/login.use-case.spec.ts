import { LoginUseCase } from "../../../src/application/use-cases/login.use-case";
import type { IAuthProvider, AuthenticateResponse } from "../../../src/domain/ports/auth-provider.port";
import type { User } from "../../../src/domain/entities/user";
import { InMemoryTokenStore } from "../../../src/infrastructure/storage/in-memory-token.store";
import { InvalidCredentialsError, AccountLockedError } from "../../../src/domain/errors/auth-errors";

describe("LoginUseCase", () => {
  let useCase: LoginUseCase;
  let mockAuthProvider: jest.Mocked<IAuthProvider>;
  let tokenStore: InMemoryTokenStore;

  const mockUser: User = {
    id: "user-1",
    email: "test@example.com",
    username: "testuser",
    emailVerified: true,
    enabled: true,
    createdAt: new Date(),
  };

  const successResponse: AuthenticateResponse = {
    accessToken: "access-token-123",
    refreshToken: "refresh-token-123",
    expiresIn: 900,
    user: mockUser,
  };

  beforeEach(() => {
    mockAuthProvider = {
      register: jest.fn(),
      authenticate: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
      initiatePasswordReset: jest.fn(),
      completePasswordReset: jest.fn(),
      getUserById: jest.fn(),
      getUserByEmail: jest.fn(),
      setup2FA: jest.fn(),
      verify2FA: jest.fn(),
      disable2FA: jest.fn(),
      sendVerifyEmail: jest.fn(),
      verifyEmail: jest.fn(),
      issueTokens: jest.fn(),
    };

    tokenStore = new InMemoryTokenStore();
    useCase = new LoginUseCase(mockAuthProvider, tokenStore, {
      maxFailedAttempts: 5,
      lockoutDurationMs: 15 * 60 * 1000,
    });
  });

  it("should authenticate user successfully", async () => {
    mockAuthProvider.authenticate.mockResolvedValue(successResponse);

    const result = await useCase.execute({
      email: "test@example.com",
      password: "SecurePass123@",
    });

    expect(mockAuthProvider.authenticate).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "SecurePass123@",
    });

    expect(result).toEqual({
      accessToken: "access-token-123",
      refreshToken: "refresh-token-123",
      expiresIn: 900,
      user: {
        id: "user-1",
        email: "test@example.com",
        username: "testuser",
      },
    });

    const saved = await tokenStore.findByToken("refresh-token-123", "REFRESH_TOKEN");
    expect(saved).not.toBeNull();
  });

  it("should normalize the email before authenticating", async () => {
    mockAuthProvider.authenticate.mockResolvedValue(successResponse);

    await useCase.execute({ email: "  Test@Example.COM ", password: "SecurePass123@" });

    expect(mockAuthProvider.authenticate).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "SecurePass123@",
    });
  });

  it("should return a 2FA challenge instead of tokens when TOTP is configured", async () => {
    await tokenStore.saveUserData("user-1", "totpSecret", "JBSWY3DPEHPK3PXP");
    mockAuthProvider.authenticate.mockResolvedValue(successResponse);

    const result = await useCase.execute({
      email: "test@example.com",
      password: "SecurePass123@",
    });

    expect(result).toMatchObject({ twoFactorRequired: true });
    if ("twoFactorRequired" in result) {
      expect(result.preAuthToken).toEqual(expect.any(String));
      // No refresh token session should have been created yet.
      const rt = await tokenStore.findByToken("refresh-token-123", "REFRESH_TOKEN");
      expect(rt).toBeNull();
      // The pre-auth token is persisted for the completion step.
      const preAuth = await tokenStore.findByToken(result.preAuthToken, "PRE_AUTH_2FA");
      expect(preAuth).not.toBeNull();
    }
  });

  it("should propagate authentication errors and track failed attempts", async () => {
    mockAuthProvider.authenticate.mockRejectedValue(new InvalidCredentialsError("Invalid credentials"));

    await expect(
      useCase.execute({
        email: "wrong@example.com",
        password: "WrongPass123",
      }),
    ).rejects.toThrow("Invalid credentials");

    const raw = await tokenStore.getUserData("system", "login_failed:wrong@example.com");
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).count).toBe(1);
  });

  it("should count case-insensitive emails as the same account", async () => {
    mockAuthProvider.authenticate.mockRejectedValue(new InvalidCredentialsError("Bad"));

    await expect(
      useCase.execute({ email: "Case@example.com", password: "Wrong" }),
    ).rejects.toThrow("Bad");
    await expect(
      useCase.execute({ email: "case@EXAMPLE.com", password: "Wrong" }),
    ).rejects.toThrow("Bad");

    const raw = await tokenStore.getUserData("system", "login_failed:case@example.com");
    expect(JSON.parse(raw!).count).toBe(2);
  });

  it("should lock account after max failed attempts", async () => {
    mockAuthProvider.authenticate.mockRejectedValue(new InvalidCredentialsError("Bad"));

    for (let i = 0; i < 5; i++) {
      await expect(
        useCase.execute({ email: "lock@example.com", password: "Wrong" }),
      ).rejects.toThrow("Bad");
    }

    await expect(
      useCase.execute({ email: "lock@example.com", password: "Right" }),
    ).rejects.toThrow(AccountLockedError);
  });

  it("should reset failed attempts on successful login", async () => {
    mockAuthProvider.authenticate.mockRejectedValueOnce(new InvalidCredentialsError("Bad"));

    await expect(
      useCase.execute({ email: "retry@example.com", password: "Wrong" }),
    ).rejects.toThrow("Bad");

    mockAuthProvider.authenticate.mockResolvedValue({
      ...successResponse,
      user: { ...mockUser, id: "retry-1", email: "retry@example.com" },
    });

    await useCase.execute({ email: "retry@example.com", password: "Correct" });

    const attempts = await tokenStore.getUserData("system", "login_failed:retry@example.com");
    expect(attempts).toBeNull();
  });
});
