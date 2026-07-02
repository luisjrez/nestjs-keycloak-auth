import { Injectable } from "@nestjs/common";
import type { AuthEvent } from "./auth-events";

type EventHandler<T extends AuthEvent> = (event: T) => void | Promise<void>;

@Injectable()
export class AuthEventBus {
  private handlers = new Map<string, EventHandler<any>[]>();

  on<T extends AuthEvent>(
    EventClass: new (...args: any[]) => T,
    handler: EventHandler<T>,
  ): void {
    const key = EventClass.name;
    const existing = this.handlers.get(key) ?? [];
    existing.push(handler);
    this.handlers.set(key, existing);
  }

  off<T extends AuthEvent>(
    EventClass: new (...args: any[]) => T,
    handler: EventHandler<T>,
  ): void {
    const key = EventClass.name;
    const existing = this.handlers.get(key);
    if (!existing) return;
    this.handlers.set(
      key,
      existing.filter((h) => h !== handler),
    );
  }

  async emit(event: AuthEvent): Promise<void> {
    const key = event.constructor.name;
    const handlers = this.handlers.get(key) ?? [];
    await Promise.all(handlers.map((handler) => handler(event)));
  }

  removeAll(): void {
    this.handlers.clear();
  }
}
