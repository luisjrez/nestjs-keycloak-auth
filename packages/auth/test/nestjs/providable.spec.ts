import { resolveProvidable } from "../../src/nestjs/providable";

const TOKEN = "TEST_TOKEN";
const fallback = { provide: TOKEN, useValue: "default" };

describe("resolveProvidable", () => {
  it("uses the fallback when input is undefined", () => {
    const [provider] = resolveProvidable(TOKEN, undefined, fallback);
    expect(provider).toBe(fallback);
  });

  it("binds a bare instance as useValue", () => {
    const instance = { hello: "world" };
    const [provider] = resolveProvidable(TOKEN, instance, fallback);
    expect(provider).toEqual({ provide: TOKEN, useValue: instance });
  });

  it("passes through a useClass descriptor", () => {
    class Foo {}
    const [provider] = resolveProvidable(TOKEN, { useClass: Foo }, fallback);
    expect(provider).toEqual({ provide: TOKEN, useClass: Foo });
  });

  it("passes through a useValue descriptor", () => {
    const [provider] = resolveProvidable(TOKEN, { useValue: "explicit" }, fallback);
    expect(provider).toEqual({ provide: TOKEN, useValue: "explicit" });
  });

  it("passes through a useExisting descriptor", () => {
    const [provider] = resolveProvidable(TOKEN, { useExisting: "OTHER" }, fallback);
    expect(provider).toEqual({ provide: TOKEN, useExisting: "OTHER" });
  });

  it("passes through a useFactory descriptor with inject defaulted to []", () => {
    const useFactory = () => "made";
    const [provider] = resolveProvidable(TOKEN, { useFactory }, fallback);
    expect(provider).toEqual({ provide: TOKEN, useFactory, inject: [] });
  });

  it("preserves an explicit inject array on useFactory", () => {
    const useFactory = (dep: string) => dep;
    const [provider] = resolveProvidable(TOKEN, { useFactory, inject: ["DEP"] }, fallback);
    expect(provider).toEqual({ provide: TOKEN, useFactory, inject: ["DEP"] });
  });
});
