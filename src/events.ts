import { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { PROVIDER_ID } from "./constants";
import { ModelSelectEvent } from "./interfaces/events";
import { listModels } from "./tools/retriever";
import { Status } from "./enums/status";

/**
 * Reacts to a new model event triggered by Pi
 * @param event Model selection event
 * @param ctx Pi context
 */
export const onModelSelect = async (
  event: ModelSelectEvent,
  ctx: ExtensionContext,
) => {
  if (event.model.provider !== PROVIDER_ID) return;

  let models: Awaited<ReturnType<typeof listModels>>;
  try {
    models = await listModels();
  } catch {
    ctx.ui.notify("Llama.cpp server unreachable", "error");
    return;
  }

  const model = models.find((m) => m.id === event.model.id);
  if (!model) return;

  const status = await model.getStatus();
  if (status !== Status.UNLOADED) return;

  ctx.ui.notify(`>> Loading ${model.id}...`, "info");
  await model.load();
};
