import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { PROVIDER_ID, PROVIDER_NAME } from "../constants";
import type { BaseModel } from "../models/baseModel";
import { resolveApiKey, resolveUrl } from "./resolver";
import { listModels } from "./retriever";

/**
 * Registers the Llama.cpp provider and returns the fetched models.
 * If the server is unreachable, registers a stub provider with no models.
 *
 * @param pi The Pi extension API
 * @returns The list of models fetched from the server (empty if unreachable)
 */
export const registerLlamaCppProvider = async (
  pi: ExtensionAPI,
): Promise<BaseModel[]> => {
  const baseUrl = `${await resolveUrl(process.cwd())}/v1`;

  let models: BaseModel[];
  try {
    models = await listModels();
  } catch {
    // Server is unreachable — register a stub provider so the extension
    // still loads, but /models will show an offline message.
    pi.registerProvider(PROVIDER_ID, {
      name: PROVIDER_NAME,
      baseUrl,
      api: "openai-completions",
      apiKey: await resolveApiKey(),
      models: [],
    });
    return [];
  }

  pi.registerProvider(PROVIDER_ID, {
    name: PROVIDER_NAME,
    baseUrl,
    api: "openai-completions",
    apiKey: await resolveApiKey(),
    models: models.map((m) => m.toProviderConfig()),
  });

  return models;
};

/**
 * Registers a stub provider synchronously, then fetches models in the
 * background. This avoids blocking pi's startup on the /models HTTP call.
 *
 * @param pi The Pi extension API
 * @param fallbackBaseUrl URL to use if the resolver can't find a config
 */
export const lazyLoadProvider = (
  pi: ExtensionAPI,
  fallbackBaseUrl: string,
): void => {
  // 1. Register stub immediately — no await, no blocking I/O
  pi.registerProvider(PROVIDER_ID, {
    name: PROVIDER_NAME,
    baseUrl: fallbackBaseUrl,
    api: "openai-completions",
    apiKey: "sk-placeholder",
    models: [],
  });

  // 2. Fetch models in the background (fire-and-forget)
  (async () => {
    try {
      const baseUrl = `${await resolveUrl(process.cwd())}/v1`;
      const models = await listModels();
      const apiKey = await resolveApiKey();

      pi.registerProvider(PROVIDER_ID, {
        name: PROVIDER_NAME,
        baseUrl,
        api: "openai-completions",
        apiKey,
        models: models.map((m) => m.toProviderConfig()),
      });
    } catch {
      // Server unreachable — keep the stub provider (no models)
    }
  })();
};
