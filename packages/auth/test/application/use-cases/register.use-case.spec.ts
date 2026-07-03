import { RegisterUseCase } from "../../../src/application/use-cases/register.use-case";
import type { IAuthProvider, RegisterRequest } from "../../../src/domain/ports/auth-provider.port";
import type { User } from "../../../src/domain/entities/user";

describe("RegisterUseCase", () => {
  let useCase: RegisterUseCase;
  let mockAuthProvider: jest.Mocked<IAuthProvider>;

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

    useCase = new RegisterUseCase(mockAuthProvider);
  });

  it("should register a user successfully", async () => {
    const mockUser: User = {
      id: "kc-user-1",
      email: "test@example.com",
      username: "testuser",
      emailVerified: false,
      enabled: true,
      createdAt: new Date(),
    };

    mockAuthProvider.register.mockResolvedValue(mockUser);

    const result = await useCase.execute({
      email: "test@example.com",
      username: "testuser",
      password: "SecurePass123@",
    });

    expect(mockAuthProvider.register).toHaveBeenCalledWith({
      email: "test@example.com",
      username: "testuser",
      password: "SecurePass123@",
    } satisfies RegisterRequest);

    expect(result).toEqual({
      user: mockUser,
      message: expect.stringContaining("successful"),
    });
  });

  it("should throw when email is invalid", async () => {
    await expect(
      useCase.execute({
        email: "not-an-email",
        username: "testuser",
        password: "SecurePass123@",
      }),
    ).rejects.toThrow("Invalid email");
  });

  it("should throw when password is too short", async () => {
    await expect(
      useCase.execute({
        email: "test@example.com",
        username: "testuser",
        password: "Abc1",
      }),
    ).rejects.toThrow("at least 8 characters");
  });

  it("should throw when password lacks complexity", async () => {
    await expect(
      useCase.execute({
        email: "test@example.com",
        username: "testuser",
        password: "1234567890",
      }),
    ).rejects.toThrow("uppercase letter");
  });

  it("should propagate auth provider errors", async () => {
    mockAuthProvider.register.mockRejectedValue(new Error("Keycloak unavailable"));

    await expect(
      useCase.execute({
        email: "test@example.com",
        username: "testuser",
        password: "SecurePass123@",
      }),
    ).rejects.toThrow("Keycloak unavailable");
  });
});
