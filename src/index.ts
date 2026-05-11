import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { PROVIDER_NAME } from "./constants";
import { onModelSelect } from "./events";
import { lazyLoadProvider } from "./tools/provider";
import { modelsCommand, notFoundCommand } from "./commands/models";

export default function (pi: ExtensionAPI) {
  // Fetch models in the background and register the real provider once ready.
  // No stub is registered — Pi shows no models until the fetch completes,
  // but this avoids the caching bug where Pi keeps the stub's empty model list.
  lazyLoadProvider(pi);

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
