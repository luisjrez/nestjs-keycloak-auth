import { LoginUseCase } from "../../../src/application/use-cases/login.use-case";
import type { IAuthProvider, AuthenticateResponse } from "../../../src/domain/ports/auth-provider.port";
import type { User } from "../../../src/domain/entities/user";

describe("LoginUseCase", () => {
  let useCase: LoginUseCase;
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

    useCase = new LoginUseCase(mockAuthProvider);
  });

  it("should authenticate user successfully", async () => {
    const mockUser: User = {
      id: "user-1",
      email: "test@example.com",
      username: "testuser",
      emailVerified: true,
      enabled: true,
      createdAt: new Date(),
    };

    const mockResponse: AuthenticateResponse = {
      accessToken: "access-token-123",
      refreshToken: "refresh-token-123",
      expiresIn: 900,
      user: mockUser,
    };

    mockAuthProvider.authenticate.mockResolvedValue(mockResponse);

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
  });

  it("should propagate authentication errors", async () => {
    mockAuthProvider.authenticate.mockRejectedValue(new Error("Invalid credentials"));

    await expect(
      useCase.execute({
        email: "wrong@example.com",
        password: "WrongPass123",
      }),
    ).rejects.toThrow("Invalid credentials");
  });
});
