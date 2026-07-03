import { RefreshTokenUseCase } from "../../../src/application/use-cases/refresh-token.use-case";
import type { IAuthProvider } from "../../../src/domain/ports/auth-provider.port";
import { InMemoryTokenStore } from "../../../src/infrastructure/storage/in-memory-token.store";
import {
  TokenInvalidError,
  TokenReuseDetectedError,
} from "../../../src/domain/errors/auth-errors";
import type { TokenRecord } from "../../../src/domain/ports/token-store.port";

describe("RefreshTokenUseCase", () => {
  let useCase: RefreshTokenUseCase;
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
    useCase = new RefreshTokenUseCase(mockAuthProvider, tokenStore);
  });

  const saveActiveToken = async (token: string, userId = "user-1"): Promise<void> => {
    const record: TokenRecord = {
      id: token,
      userId,
      type: "REFRESH_TOKEN",
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    };
    await tokenStore.save(record);
  };

  it("should reject an unknown token instead of minting new tokens", async () => {
    await expect(useCase.execute("unknown-refresh-token")).rejects.toThrow(TokenInvalidError);
    // A token not in the store must never reach the provider.
    expect(mockAuthProvider.refreshToken).not.toHaveBeenCalled();
  });

  it("should rotate a known unused token", async () => {
    await saveActiveToken("rt-value");

    mockAuthProvider.refreshToken.mockResolvedValue({
      accessToken: "new-at",
      refreshToken: "new-rt",
      expiresIn: 900,
      sub: "user-1",
    });

    const result = await useCase.execute("rt-value");

    const consumed = await tokenStore.findByToken("rt-value", "REFRESH_TOKEN");
    expect(consumed?.consumedAt).toBeDefined();
    expect(result.accessToken).toBe("new-at");
    expect(result.refreshToken).toBe("new-rt");

    // The freshly issued token is persisted and usable.
    const fresh = await tokenStore.findByToken("new-rt", "REFRESH_TOKEN");
    expect(fresh).not.toBeNull();
  });

  it("should detect reuse of a consumed token and revoke all sessions", async () => {
    await saveActiveToken("used-rt");
    await saveActiveToken("other-session-rt");
    // Consume it once (normal rotation).
    const record = await tokenStore.findByToken("used-rt", "REFRESH_TOKEN");
    await tokenStore.markConsumed(record!.id);

    await expect(useCase.execute("used-rt")).rejects.toThrow(TokenReuseDetectedError);

    // Every session for that user is wiped.
    expect(await tokenStore.findByToken("other-session-rt", "REFRESH_TOKEN")).toBeNull();
  });

  it("should propagate errors from auth provider", async () => {
    await saveActiveToken("known-rt");
    mockAuthProvider.refreshToken.mockRejectedValue(new Error("Provider exploded"));

    await expect(useCase.execute("known-rt")).rejects.toThrow("Provider exploded");
  });
});
