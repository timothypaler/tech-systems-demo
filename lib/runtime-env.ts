export type RuntimeEnv = {
  DB: D1Database;
  BUCKET: R2Bucket;
  ASSETS: Fetcher;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
};

type RuntimeGlobal = typeof globalThis & {
  __PCLOGIC_RUNTIME_ENV__?: RuntimeEnv;
};

export function setRuntimeEnv(value: RuntimeEnv) {
  (globalThis as RuntimeGlobal).__PCLOGIC_RUNTIME_ENV__ = value;
}

export const runtimeEnv = new Proxy({} as RuntimeEnv, {
  get(_target, property) {
    const current = (globalThis as RuntimeGlobal).__PCLOGIC_RUNTIME_ENV__;
    if (!current) throw new Error("Store runtime bindings are unavailable.");
    return current[property as keyof RuntimeEnv];
  },
});
