import { AuthExceptionFilter } from "../../../src/nestjs/filters/auth-exception.filter";
import { EmailAlreadyExistsError } from "../../../src/domain/errors/auth-errors";

describe("AuthExceptionFilter", () => {
  let filter: AuthExceptionFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockResponse: any;
  let mockHost: any;

  beforeEach(() => {
    filter = new AuthExceptionFilter();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockResponse = { status: mockStatus };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
      }),
    };
  });

  it("should catch DomainError and return correct status and JSON", () => {
    const error = new EmailAlreadyExistsError("Email is taken");

    filter.catch(error, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(409);
    expect(mockJson).toHaveBeenCalledWith(error.toJSON());
  });

  it("should handle different DomainError types", () => {
    const error = new EmailAlreadyExistsError("Test");
    filter.catch(error, mockHost);
    expect(mockStatus).toHaveBeenCalledWith(409);
  });
});
