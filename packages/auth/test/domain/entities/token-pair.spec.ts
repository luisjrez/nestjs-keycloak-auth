import type { TokenPair } from "../../../src/domain/entities/token-pair";

describe("TokenPair Entity", () => {
  it("should create a valid token pair", () => {
    const pair: TokenPair = {
      accessToken: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0",
      refreshToken: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJyZWZyZXNoIn0",
      expiresIn: 900,
      tokenType: "Bearer",
    };

    expect(pair.accessToken).toBeDefined();
    expect(pair.refreshToken).toBeDefined();
    expect(pair.expiresIn).toBe(900);
    expect(pair.tokenType).toBe("Bearer");
  });

  it("should have numeric expiresIn", () => {
    const pair: TokenPair = {
      accessToken: "token-a",
      refreshToken: "token-r",
      expiresIn: 3600,
      tokenType: "Bearer",
    };

    expect(typeof pair.expiresIn).toBe("number");
  });

  it("should always have Bearer token type", () => {
    const pair: TokenPair = {
      accessToken: "token-a",
      refreshToken: "token-r",
      expiresIn: 900,
      tokenType: "Bearer",
    };

    expect(pair.tokenType).toBe("Bearer");
  });
});
