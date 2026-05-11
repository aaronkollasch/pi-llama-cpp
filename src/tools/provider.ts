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
 * Fetches models in the background and registers the real provider once
 * ready. No stub provider is registered — Pi will show no models until the
 * fetch completes, but this avoids the caching bug where Pi keeps the stub's
 * empty model list forever.
 *
 * @param pi The Pi extension API
 */
export const lazyLoadProvider = (pi: ExtensionAPI): void => {

  // Fetch models asynchronously and register the real provider once ready.
  // We intentionally skip the stub-provider pattern: registering a stub
  // first and then calling registerProvider again causes Pi to cache the
  // stub's empty model list and never pick up the real models, leading to
  // "Connection error" on the first prompt with a stale/wrong model ID.
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
      // Server unreachable — no ui from ExtensionAPI, so we rely on
      // onModelSelect to show an error when the user tries to use the provider.
    }
  })();
};
