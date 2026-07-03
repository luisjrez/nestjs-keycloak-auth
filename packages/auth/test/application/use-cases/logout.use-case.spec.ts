import { LogoutUseCase } from "../../../src/application/use-cases/logout.use-case";
import type { IAuthProvider } from "../../../src/domain/ports/auth-provider.port";
import { InMemoryTokenStore } from "../../../src/infrastructure/storage/in-memory-token.store";

describe("LogoutUseCase", () => {
  let useCase: LogoutUseCase;
  let mockAuthProvider: jest.Mocked<IAuthProvider>;
  let tokenStore: InMemoryTokenStore;

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
    useCase = new LogoutUseCase(mockAuthProvider, tokenStore);
  });

  it("should consume a known refresh token and call the provider", async () => {
    await tokenStore.save({
      id: "rt-1",
      userId: "user-1",
      type: "REFRESH_TOKEN",
      token: "session-token",
      expiresAt: new Date(Date.now() + 3600000),
      createdAt: new Date(),
    });

    await useCase.execute({ refreshToken: "session-token" });

    const record = await tokenStore.findByToken("session-token", "REFRESH_TOKEN");
    expect(record!.consumedAt).toBeDefined();
    expect(mockAuthProvider.logout).toHaveBeenCalledWith("session-token");
  });

  it("should still call the provider when the token is unknown", async () => {
    await useCase.execute({ refreshToken: "not-in-store" });
    expect(mockAuthProvider.logout).toHaveBeenCalledWith("not-in-store");
  });
});
