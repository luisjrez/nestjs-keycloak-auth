import type { InjectionToken, OptionalFactoryDependency, Provider } from "@nestjs/common";

/**
 * A dependency the consumer supplies that has behavior (a token store, an
 * email sender, a renderer). It can be given three ways:
 *
 *  1. A ready-made instance                 — `new MyStore(db)`
 *  2. A class for Nest to construct          — `{ useClass: MyStore }`
 *  3. A factory (with its own injections)    — `{ useFactory, inject }`
 *  4. An existing provider elsewhere         — `{ useExisting: SOME_TOKEN }`
 *
 * Forms 2–4 are real providers in the DI container: full dependency
 * injection, lifecycle hooks, and `overrideProvider` in tests. Form 1 stays
 * supported for the simple case and backwards compatibility.
 */
export type Providable<T> =
  | T
  | { useClass: new (...args: never[]) => T }
  | { useValue: T }
  | { useFactory: (...args: never[]) => T | Promise<T>; inject?: Array<InjectionToken | OptionalFactoryDependency> }
  | { useExisting: InjectionToken };

function isDescriptor(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  return (
    "useClass" in value ||
    "useValue" in value ||
    "useFactory" in value ||
    "useExisting" in value
  );
}

/**
 * Turns a `Providable<T>` into the NestJS provider(s) that bind `token`.
 *
 * - Instance / non-descriptor object → `{ provide: token, useValue }`.
 * - Descriptor → the matching provider, so the container builds it with full DI.
 *
 * `token` is the DI token to bind (e.g. EMAIL_SENDER). Returns an array so a
 * descriptor form can be spread directly into a module's `providers`.
 */
export function resolveProvidable<T>(
  token: string | symbol,
  input: Providable<T> | undefined,
  fallback: Provider,
): Provider[] {
  if (input === undefined) {
    return [fallback];
  }

  if (!isDescriptor(input)) {
    // A bare instance (or any non-descriptor value) — bind it directly.
    return [{ provide: token, useValue: input as T }];
  }

  const desc = input as Exclude<Providable<T>, T>;

  if ("useValue" in desc) {
    return [{ provide: token, useValue: desc.useValue }];
  }
  if ("useClass" in desc) {
    return [{ provide: token, useClass: desc.useClass }];
  }
  if ("useExisting" in desc) {
    return [{ provide: token, useExisting: desc.useExisting }];
  }
  // useFactory
  return [
    {
      provide: token,
      useFactory: desc.useFactory,
      inject: desc.inject ?? [],
    },
  ];
}
