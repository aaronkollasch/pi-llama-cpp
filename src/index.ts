import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { DEFAULT_LLAMA_SERVER_URL, PROVIDER_NAME } from "./constants";
import { onModelSelect } from "./events";
import { lazyLoadProvider } from "./tools/provider";
import { modelsCommand, notFoundCommand } from "./commands/models";

export default function (pi: ExtensionAPI) {
  // Register stub provider synchronously so pi shows the prompt instantly.
  // Model listing happens in the background and updates the provider when ready.
  lazyLoadProvider(pi, DEFAULT_LLAMA_SERVER_URL + "/v1");

  // /models command fetches models on-demand, so it always works
  // whether the server was up at startup or came up later.
  pi.registerCommand("models", {
    description: `${PROVIDER_NAME} models`,
    handler: async (_args: string, ctx: ExtensionCommandContext) => {
      try {
        const { listModels } = await import("./tools/retriever");
        const models = await listModels();
        await modelsCommand(ctx, pi, models);
      } catch {
        await notFoundCommand(ctx);
      }
    },
  });

  // Events registration
  pi.on("model_select", onModelSelect);
}
