import { vi } from "vitest";

export function createMockSDK() {
  return {
    console: {
      log: vi.fn(),
      error: vi.fn(),
    },
    meta: {
      path: vi.fn().mockReturnValue("/tmp/quickssrf-test"),
      id: vi.fn().mockReturnValue("quickssrf"),
      db: vi.fn(),
      assetsPath: vi.fn(),
      version: vi.fn().mockReturnValue("2.0.0"),
      updateAvailable: vi.fn(),
    },
    api: {
      send: vi.fn(),
      register: vi.fn(),
    },
    env: {
      getVar: vi.fn(),
      getVars: vi.fn().mockReturnValue([]),
      setVar: vi.fn().mockResolvedValue(undefined),
    },
    events: {
      onInterceptRequest: vi.fn(),
      onInterceptResponse: vi.fn(),
      onProjectChange: vi.fn(),
      onUpstream: vi.fn(),
    },
    findings: { create: vi.fn() },
    requests: { send: vi.fn() },
    replay: {},
    projects: { getCurrent: vi.fn() },
    scope: {},
    runtime: {},
    graphql: {},
    hostedFile: {},
    net: {},
  };
}
