export abstract class DomainError extends Error {
  public abstract readonly code: string;
  public abstract readonly status: number;
  public readonly timestamp: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toJSON() {
    return {
      error: this.code,
      message: this.message,
      statusCode: this.status,
      timestamp: this.timestamp,
    };
  }
}
