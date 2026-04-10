import { requireSDK } from "../sdk";

const ENV_PREFIX = "QUICKSSRF_";

class SecretStoreClass {
  get(key: string): string | undefined {
    const sdk = requireSDK();
    const value = sdk.env.getVar(`${ENV_PREFIX}${key}`);
    return value === undefined || value === "" ? undefined : value;
  }

  async set(key: string, value: string): Promise<void> {
    const sdk = requireSDK();
    await sdk.env.setVar({
      name: `${ENV_PREFIX}${key}`,
      value,
      secret: true,
      global: true,
    });
  }

  async clear(key: string): Promise<void> {
    const sdk = requireSDK();
    await sdk.env.setVar({
      name: `${ENV_PREFIX}${key}`,
      value: "",
      secret: true,
      global: true,
    });
  }
}

export const secretStore = new SecretStoreClass();
