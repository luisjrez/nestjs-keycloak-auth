import { VerifyMagicLinkUseCase } from "../../../src/application/use-cases/verify-magic-link.use-case";
import type { IAuthProvider } from "../../../src/domain/ports/auth-provider.port";
import { InMemoryTokenStore } from "../../../src/infrastructure/storage/in-memory-token.store";
import type { TokenRecord } from "../../../src/domain/ports/token-store.port";
import {
  TokenInvalidError,
  MagicLinkExpiredError,
  MagicLinkAlreadyUsedError,
} from "../../../src/domain/errors/auth-errors";

describe("VerifyMagicLinkUseCase", () => {
  let useCase: VerifyMagicLinkUseCase;
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
    useCase = new VerifyMagicLinkUseCase(mockAuthProvider, tokenStore);
  });

  const setupValidLink = async (): Promise<void> => {
    const record: TokenRecord = {
      id: "magic-1",
      userId: "user-1",
      type: "MAGIC_LINK",
      token: "valid-magic-token",
      expiresAt: new Date(Date.now() + 900000),
      createdAt: new Date(),
    };
    await tokenStore.save(record);
  };

  it("should verify a valid magic link", async () => {
    await setupValidLink();
    mockAuthProvider.issueTokens.mockResolvedValue({
      accessToken: "access-token-123",
      refreshToken: "refresh-token-123",
      expiresIn: 900,
    });

    const result = await useCase.execute({ token: "valid-magic-token" });

    expect(mockAuthProvider.issueTokens).toHaveBeenCalledWith("user-1");
    expect(result).toEqual({
      accessToken: "access-token-123",
      refreshToken: "refresh-token-123",
      expiresIn: 900,
    });
  });

  it("should mark token as consumed after verification", async () => {
    await setupValidLink();
    mockAuthProvider.issueTokens.mockResolvedValue({
      accessToken: "a",
      refreshToken: "r",
      expiresIn: 900,
    });

    await useCase.execute({ token: "valid-magic-token" });

    const record = await tokenStore.findByToken("valid-magic-token", "MAGIC_LINK");
    expect(record!.consumedAt).toBeDefined();
  });

  it("should throw for invalid token", async () => {
    await expect(
      useCase.execute({ token: "nonexistent-token" }),
    ).rejects.toThrow(TokenInvalidError);
  });

  it("should throw for expired token", async () => {
    const expired: TokenRecord = {
      id: "expired-magic",
      userId: "user-1",
      type: "MAGIC_LINK",
      token: "expired-token",
      expiresAt: new Date(Date.now() - 1000),
      createdAt: new Date(),
    };
    await tokenStore.save(expired);

    await expect(
      useCase.execute({ token: "expired-token" }),
    ).rejects.toThrow(MagicLinkExpiredError);
  });

  it("should throw for already used token", async () => {
    const used: TokenRecord = {
      id: "used-magic",
      userId: "user-1",
      type: "MAGIC_LINK",
      token: "used-token",
      expiresAt: new Date(Date.now() + 3600000),
      consumedAt: new Date(),
      createdAt: new Date(),
    };
    await tokenStore.save(used);

    await expect(
      useCase.execute({ token: "used-token" }),
    ).rejects.toThrow(MagicLinkAlreadyUsedError);
  });
});
