import { GatewayRequestError, type GatewayBrowserClient } from "../gateway.ts";
import type { ConfigSnapshot } from "../types.ts";

export type ModelProviderEntry = {
  providerId: string;
  baseUrl: string;
  api: string;
  apiKey: string;
  modelId: string;
  modelName: string;
  contextWindow: number;
  maxTokens: number;
};

export type ModelsState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  modelsLoading: boolean;
  modelsError: string | null;
  modelsSaving: boolean;
  modelsActivating: boolean;
  modelsProviders: ModelProviderEntry[];
  modelsActiveModel: string | null;
  modelsFormVisible: boolean;
  modelsEditingProvider: ModelProviderEntry | null;
  modelsConfigHash: string | null;
  lastError: string | null;
};

function formatError(err: unknown): string {
  if (err instanceof GatewayRequestError) {
    const base = err.message;
    const details = err.details as { issues?: { path?: string; message?: string }[] } | undefined;
    if (details?.issues?.length) {
      const issueText = details.issues
        .map((i) => `${i.path ?? ""}: ${i.message ?? ""}`)
        .join("; ");
      return `${base} — ${issueText}`;
    }
    return base;
  }
  return String(err);
}

function extractProviders(config: Record<string, unknown>): ModelProviderEntry[] {
  const models = config.models as { providers?: Record<string, unknown> } | undefined;
  if (!models?.providers || typeof models.providers !== "object") {
    return [];
  }
  const entries: ModelProviderEntry[] = [];
  for (const [providerId, raw] of Object.entries(models.providers)) {
    if (!raw || typeof raw !== "object") continue;
    const provider = raw as Record<string, unknown>;
    const modelsArr = Array.isArray(provider.models) ? provider.models : [];
    const firstModel = modelsArr[0] as Record<string, unknown> | undefined;
    entries.push({
      providerId,
      baseUrl: String(provider.baseUrl ?? ""),
      api: String(provider.api ?? "openai-completions"),
      apiKey: String(provider.apiKey ?? ""),
      modelId: String(firstModel?.id ?? ""),
      modelName: String(firstModel?.name ?? ""),
      contextWindow: Number(firstModel?.contextWindow ?? 128000),
      maxTokens: Number(firstModel?.maxTokens ?? 8192),
    });
  }
  return entries;
}

function extractActiveModel(config: Record<string, unknown>): string | null {
  const agents = config.agents as { defaults?: { model?: unknown } } | undefined;
  const model = agents?.defaults?.model;
  if (typeof model === "string") return model;
  if (model && typeof model === "object" && !Array.isArray(model)) {
    const primary = (model as { primary?: unknown }).primary;
    if (typeof primary === "string") return primary;
  }
  return null;
}

export async function loadModelsConfig(state: ModelsState) {
  if (!state.client || !state.connected) return;
  state.modelsLoading = true;
  state.modelsError = null;
  try {
    const snapshot = await state.client.request<ConfigSnapshot>("config.get", {});
    state.modelsConfigHash = snapshot.hash ?? null;
    const config = (snapshot.config ?? {}) as Record<string, unknown>;
    state.modelsProviders = extractProviders(config);
    state.modelsActiveModel = extractActiveModel(config);
  } catch (err) {
    state.modelsError = formatError(err);
  } finally {
    state.modelsLoading = false;
  }
}

function buildProviderPatchObject(entry: ModelProviderEntry): Record<string, unknown> {
  return {
    baseUrl: entry.baseUrl,
    api: entry.api,
    apiKey: entry.apiKey,
    models: [
      {
        id: entry.modelId,
        name: entry.modelName || entry.modelId,
        reasoning: false,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: entry.contextWindow,
        maxTokens: entry.maxTokens,
      },
    ],
  };
}

export async function saveModelProvider(state: ModelsState, entry: ModelProviderEntry) {
  if (!state.client || !state.connected) return;
  state.modelsSaving = true;
  state.modelsError = null;
  try {
    const providerObj = buildProviderPatchObject(entry);

    const configPatch: Record<string, unknown> = {
      models: {
        providers: {
          [entry.providerId]: providerObj,
        },
      },
    };

    const baseHash = state.modelsConfigHash;
    if (!baseHash) {
      state.modelsError = "Config hash missing; please reload.";
      return;
    }
    await state.client.request("config.patch", {
      raw: JSON.stringify(configPatch),
      baseHash,
    });

    await state.client.request("models.config.save", {
      providers: { [entry.providerId]: providerObj },
    });

    await loadModelsConfig(state);
    state.modelsFormVisible = false;
    state.modelsEditingProvider = null;
  } catch (err) {
    state.modelsError = formatError(err);
  } finally {
    state.modelsSaving = false;
  }
}

export async function removeModelProvider(state: ModelsState, providerId: string) {
  if (!state.client || !state.connected) return;
  state.modelsSaving = true;
  state.modelsError = null;
  try {
    const configPatch: Record<string, unknown> = {
      models: {
        providers: {
          [providerId]: null,
        },
      },
    };

    const isActive = state.modelsActiveModel?.startsWith(`${providerId}/`);
    if (isActive) {
      (configPatch as Record<string, unknown>).agents = {
        defaults: { model: null },
      };
    }

    const baseHash = state.modelsConfigHash;
    if (!baseHash) {
      state.modelsError = "Config hash missing; please reload.";
      return;
    }
    await state.client.request("config.patch", {
      raw: JSON.stringify(configPatch),
      baseHash,
    });

    await state.client.request("models.config.save", {
      providers: { [providerId]: null },
    });

    await loadModelsConfig(state);
  } catch (err) {
    state.modelsError = formatError(err);
  } finally {
    state.modelsSaving = false;
  }
}

export async function activateModel(
  state: ModelsState,
  providerId: string,
  modelId: string,
) {
  if (!state.client || !state.connected) return;
  state.modelsActivating = true;
  state.modelsError = null;
  try {
    const modelRef = `${providerId}/${modelId}`;
    const configPatch = {
      agents: {
        defaults: {
          model: {
            primary: modelRef,
          },
        },
      },
    };
    const baseHash = state.modelsConfigHash;
    if (!baseHash) {
      state.modelsError = "Config hash missing; please reload.";
      return;
    }
    await state.client.request("config.patch", {
      raw: JSON.stringify(configPatch),
      baseHash,
    });
    await loadModelsConfig(state);
  } catch (err) {
    state.modelsError = formatError(err);
  } finally {
    state.modelsActivating = false;
  }
}

export async function deactivateModel(state: ModelsState) {
  if (!state.client || !state.connected) return;
  state.modelsActivating = true;
  state.modelsError = null;
  try {
    const configPatch = {
      agents: {
        defaults: {
          model: null,
        },
      },
    };
    const baseHash = state.modelsConfigHash;
    if (!baseHash) {
      state.modelsError = "Config hash missing; please reload.";
      return;
    }
    await state.client.request("config.patch", {
      raw: JSON.stringify(configPatch),
      baseHash,
    });
    await loadModelsConfig(state);
  } catch (err) {
    state.modelsError = formatError(err);
  } finally {
    state.modelsActivating = false;
  }
}
