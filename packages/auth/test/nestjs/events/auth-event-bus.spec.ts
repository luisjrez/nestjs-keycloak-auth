import { AuthEventBus } from "../../../src/nestjs/events/auth-event-bus";
import {
  UserRegisteredEvent,
  UserLoggedInEvent,
} from "../../../src/nestjs/events/auth-events";

describe("AuthEventBus", () => {
  let eventBus: AuthEventBus;

  beforeEach(() => {
    eventBus = new AuthEventBus();
  });

  describe("on / emit", () => {
    it("should call handler when event is emitted", async () => {
      const handler = jest.fn();
      eventBus.on(UserRegisteredEvent, handler);

      const event = new UserRegisteredEvent("user-1", "test@example.com", "testuser");
      await eventBus.emit(event);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(event);
    });

    it("should support multiple handlers for same event", async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.on(UserRegisteredEvent, handler1);
      eventBus.on(UserRegisteredEvent, handler2);

      const event = new UserRegisteredEvent("user-1", "test@example.com", "testuser");
      await eventBus.emit(event);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it("should not call handlers for different events", async () => {
      const handler = jest.fn();
      eventBus.on(UserRegisteredEvent, handler);

      const event = new UserLoggedInEvent("user-1", "test@example.com");
      await eventBus.emit(event);

      expect(handler).not.toHaveBeenCalled();
    });

    it("should work with async handlers", async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      eventBus.on(UserRegisteredEvent, handler);

      const event = new UserRegisteredEvent("user-1", "test@example.com", "testuser");
      await eventBus.emit(event);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("should not throw when no handlers registered", async () => {
      const event = new UserRegisteredEvent("user-1", "test@example.com", "testuser");
      await expect(eventBus.emit(event)).resolves.not.toThrow();
    });

    it("should pass correct event payload", async () => {
      const handler = jest.fn();
      eventBus.on(UserRegisteredEvent, handler);

      const event = new UserRegisteredEvent("user-1", "test@example.com", "testuser");
      await eventBus.emit(event);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          keycloakId: "user-1",
          email: "test@example.com",
          username: "testuser",
        }),
      );
    });

    it("should set timestamp on event", async () => {
      const handler = jest.fn();
      eventBus.on(UserRegisteredEvent, handler);

      const event = new UserRegisteredEvent("user-1", "test@example.com", "testuser");
      await eventBus.emit(event);

      expect(event.timestamp).toBeDefined();
      expect(() => new Date(event.timestamp)).not.toThrow();
    });
  });

  describe("off", () => {
    it("should remove a handler", async () => {
      const handler = jest.fn();
      eventBus.on(UserRegisteredEvent, handler);
      eventBus.off(UserRegisteredEvent, handler);

      const event = new UserRegisteredEvent("user-1", "test@example.com", "testuser");
      await eventBus.emit(event);

      expect(handler).not.toHaveBeenCalled();
    });

    it("should not throw when removing nonexistent handler", () => {
      const handler = jest.fn();
      expect(() => eventBus.off(UserRegisteredEvent, handler)).not.toThrow();
    });
  });

  describe("removeAll", () => {
    it("should remove all handlers", async () => {
      const handler = jest.fn();
      eventBus.on(UserRegisteredEvent, handler);
      eventBus.removeAll();

      const event = new UserRegisteredEvent("user-1", "test@example.com", "testuser");
      await eventBus.emit(event);

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
