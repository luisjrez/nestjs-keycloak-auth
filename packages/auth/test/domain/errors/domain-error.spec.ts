import { DomainError } from "../../../src/domain/errors/domain-error";

class TestError extends DomainError {
  public readonly code = "TEST_ERROR";
  public readonly status = 418;
}

describe("DomainError", () => {
  it("should set the correct error name", () => {
    const err = new TestError("Something went wrong");
    expect(err.name).toBe("TestError");
  });

  it("should set the message", () => {
    const err = new TestError("Something went wrong");
    expect(err.message).toBe("Something went wrong");
  });

  it("should set a timestamp", () => {
    const err = new TestError("Something went wrong");
    expect(err.timestamp).toBeDefined();
    expect(typeof err.timestamp).toBe("string");
    expect(() => new Date(err.timestamp)).not.toThrow();
  });

  it("should produce correct toJSON output", () => {
    const err = new TestError("I'm a teapot");
    const json = err.toJSON();

    expect(json).toEqual({
      error: "TEST_ERROR",
      message: "I'm a teapot",
      statusCode: 418,
      timestamp: err.timestamp,
    });
  });

  it("should be an instance of Error", () => {
    const err = new TestError("test");
    expect(err).toBeInstanceOf(Error);
  });

  it("should be an instance of DomainError", () => {
    const err = new TestError("test");
    expect(err).toBeInstanceOf(DomainError);
  });

  it("should have a stack trace", () => {
    const err = new TestError("test");
    expect(err.stack).toBeDefined();
  });
});
