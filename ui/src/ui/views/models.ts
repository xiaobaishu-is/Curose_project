import { html, nothing } from "lit";
import { t } from "../../i18n/index.ts";
import { icons } from "../icons.ts";
import type { ModelProviderEntry } from "../controllers/models.ts";

export type ModelsFormState = {
  providerId: string;
  baseUrl: string;
  api: string;
  apiKey: string;
  modelId: string;
  modelName: string;
  contextWindow: string;
  maxTokens: string;
};

export function emptyFormState(): ModelsFormState {
  return {
    providerId: "",
    baseUrl: "",
    api: "openai-completions",
    apiKey: "",
    modelId: "",
    modelName: "",
    contextWindow: "128000",
    maxTokens: "8192",
  };
}

export function formStateFromProvider(entry: ModelProviderEntry): ModelsFormState {
  return {
    providerId: entry.providerId,
    baseUrl: entry.baseUrl,
    api: entry.api,
    apiKey: entry.apiKey,
    modelId: entry.modelId,
    modelName: entry.modelName,
    contextWindow: String(entry.contextWindow),
    maxTokens: String(entry.maxTokens),
  };
}

export function formStateToProvider(form: ModelsFormState): ModelProviderEntry {
  return {
    providerId: form.providerId.trim(),
    baseUrl: form.baseUrl.trim(),
    api: form.api,
    apiKey: form.apiKey.trim(),
    modelId: form.modelId.trim(),
    modelName: form.modelName.trim(),
    contextWindow: parseInt(form.contextWindow, 10) || 128000,
    maxTokens: parseInt(form.maxTokens, 10) || 8192,
  };
}

export type ModelsProps = {
  loading: boolean;
  saving: boolean;
  activating: boolean;
  error: string | null;
  providers: ModelProviderEntry[];
  activeModel: string | null;
  formVisible: boolean;
  editingProvider: ModelProviderEntry | null;
  formState: ModelsFormState;
  onRefresh: () => void;
  onShowForm: (editing: ModelProviderEntry | null) => void;
  onHideForm: () => void;
  onFormChange: (patch: Partial<ModelsFormState>) => void;
  onSave: () => void;
  onRemove: (providerId: string) => void;
  onActivate: (providerId: string, modelId: string) => void;
  onDeactivate: () => void;
};

function maskApiKey(key: string): string {
  if (!key) return "";
  if (key.startsWith("${")) return key;
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "****" + key.slice(-4);
}

function renderProviderCard(
  entry: ModelProviderEntry,
  activeModel: string | null,
  props: ModelsProps,
) {
  const modelRef = `${entry.providerId}/${entry.modelId}`;
  const isActive = activeModel === modelRef;

  return html`
    <div class="card ${isActive ? "card--active" : ""}">
      <div class="row" style="justify-content: space-between; align-items: flex-start;">
        <div style="flex: 1; min-width: 0;">
          <div class="row" style="gap: 8px; align-items: center;">
            <div class="card-title" style="margin: 0;">${entry.providerId}</div>
            ${isActive ? html`<span class="pill success" style="font-size: 11px;">${t("models.activated")}</span>` : nothing}
          </div>
          <div class="card-sub" style="margin-top: 4px;">
            ${entry.modelName || entry.modelId}
            <span class="muted"> &middot; ${entry.api}</span>
          </div>
        </div>
        <div class="row" style="gap: 6px; flex-shrink: 0;">
          ${
            isActive
              ? html`<button
                  class="btn btn--sm btn--outline"
                  ?disabled=${props.activating}
                  @click=${() => props.onDeactivate()}
                >${t("models.deactivate")}</button>`
              : html`<button
                  class="btn btn--sm btn--primary"
                  ?disabled=${props.activating || props.saving}
                  @click=${() => props.onActivate(entry.providerId, entry.modelId)}
                >${props.activating ? t("models.activating") : t("models.activate")}</button>`
          }
          <button
            class="btn btn--sm"
            ?disabled=${props.saving}
            @click=${() => props.onShowForm(entry)}
          >${icons.edit}</button>
          <button
            class="btn btn--sm btn--danger"
            ?disabled=${props.saving}
            @click=${() => {
              if (confirm(t("models.confirmDelete").replace("{id}", entry.providerId))) {
                props.onRemove(entry.providerId);
              }
            }}
          >${icons.trash}</button>
        </div>
      </div>
      <div class="stack" style="margin-top: 12px; gap: 6px;">
        <div class="row" style="gap: 16px; flex-wrap: wrap;">
          <div>
            <span class="muted">Base URL: </span>
            <span class="mono" style="font-size: 12px;">${entry.baseUrl || "—"}</span>
          </div>
          <div>
            <span class="muted">API Key: </span>
            <span class="mono" style="font-size: 12px;">${maskApiKey(entry.apiKey) || "—"}</span>
          </div>
        </div>
        <div class="row" style="gap: 16px; flex-wrap: wrap;">
          <div>
            <span class="muted">Model ID: </span>
            <span class="mono" style="font-size: 12px;">${entry.modelId}</span>
          </div>
          <div>
            <span class="muted">Context: </span>
            <span class="mono" style="font-size: 12px;">${entry.contextWindow.toLocaleString()}</span>
          </div>
          <div>
            <span class="muted">Max Tokens: </span>
            <span class="mono" style="font-size: 12px;">${entry.maxTokens.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderForm(props: ModelsProps) {
  const form = props.formState;
  const isEditing = !!props.editingProvider;
  const title = isEditing ? t("models.editProvider") : t("models.addProvider");

  return html`
    <div class="card" style="border: 1px solid var(--border-accent, #4a9eff33);">
      <div class="row" style="justify-content: space-between; margin-bottom: 16px;">
        <div class="card-title" style="margin: 0;">${title}</div>
        <button class="btn btn--sm" @click=${props.onHideForm}>${t("models.cancel")}</button>
      </div>
      <div class="form-grid">
        <label class="field">
          <span>${t("models.providerId")}</span>
          <input
            .value=${form.providerId}
            ?disabled=${isEditing}
            placeholder=${t("models.providerIdHint")}
            @input=${(e: Event) => props.onFormChange({ providerId: (e.target as HTMLInputElement).value })}
          />
        </label>
        <label class="field">
          <span>${t("models.baseUrl")}</span>
          <input
            .value=${form.baseUrl}
            placeholder=${t("models.baseUrlHint")}
            @input=${(e: Event) => props.onFormChange({ baseUrl: (e.target as HTMLInputElement).value })}
          />
        </label>
        <label class="field">
          <span>${t("models.apiType")}</span>
          <select
            .value=${form.api}
            @change=${(e: Event) => props.onFormChange({ api: (e.target as HTMLSelectElement).value })}
          >
            <option value="openai-completions" ?selected=${form.api === "openai-completions"}>OpenAI Completions</option>
            <option value="anthropic-messages" ?selected=${form.api === "anthropic-messages"}>Anthropic Messages</option>
          </select>
        </label>
        <label class="field">
          <span>${t("models.apiKey")}</span>
          <input
            type="password"
            .value=${form.apiKey}
            placeholder=${t("models.apiKeyHint")}
            @input=${(e: Event) => props.onFormChange({ apiKey: (e.target as HTMLInputElement).value })}
          />
        </label>
        <label class="field">
          <span>${t("models.modelId")}</span>
          <input
            .value=${form.modelId}
            placeholder=${t("models.modelIdHint")}
            @input=${(e: Event) => props.onFormChange({ modelId: (e.target as HTMLInputElement).value })}
          />
        </label>
        <label class="field">
          <span>${t("models.modelName")}</span>
          <input
            .value=${form.modelName}
            placeholder=${t("models.modelNameHint")}
            @input=${(e: Event) => props.onFormChange({ modelName: (e.target as HTMLInputElement).value })}
          />
        </label>
        <label class="field">
          <span>${t("models.contextWindow")}</span>
          <input
            type="number"
            .value=${form.contextWindow}
            @input=${(e: Event) => props.onFormChange({ contextWindow: (e.target as HTMLInputElement).value })}
          />
        </label>
        <label class="field">
          <span>${t("models.maxTokens")}</span>
          <input
            type="number"
            .value=${form.maxTokens}
            @input=${(e: Event) => props.onFormChange({ maxTokens: (e.target as HTMLInputElement).value })}
          />
        </label>
      </div>
      <div class="row" style="justify-content: flex-end; margin-top: 16px; gap: 8px;">
        <button class="btn" @click=${props.onHideForm}>${t("models.cancel")}</button>
        <button
          class="btn btn--primary"
          ?disabled=${props.saving || !form.providerId.trim() || !form.modelId.trim()}
          @click=${props.onSave}
        >${props.saving ? t("models.saving") : t("models.save")}</button>
      </div>
    </div>
  `;
}

export function renderModels(props: ModelsProps) {
  return html`
    <section>
      ${props.error ? html`<div class="callout danger" style="margin-bottom: 16px;">${props.error}</div>` : nothing}

      <div class="card" style="margin-bottom: 16px;">
        <div class="row" style="justify-content: space-between; align-items: center;">
          <div>
            <span class="muted">${t("models.activeModel")}: </span>
            <span class="mono" style="font-weight: 600;">${props.activeModel || t("models.none")}</span>
          </div>
          <div class="row" style="gap: 8px;">
            <button class="btn btn--sm" ?disabled=${props.loading} @click=${props.onRefresh}>
              ${props.loading ? "..." : "Refresh"}
            </button>
            ${
              !props.formVisible
                ? html`<button
                    class="btn btn--primary btn--sm"
                    ?disabled=${props.saving}
                    @click=${() => props.onShowForm(null)}
                  >${t("models.addProvider")}</button>`
                : nothing
            }
          </div>
        </div>
        ${props.activating ? html`<div class="callout warn" style="margin-top: 12px;">${t("models.restartNote")}</div>` : nothing}
      </div>

      ${props.formVisible ? renderForm(props) : nothing}

      ${
        props.providers.length === 0 && !props.loading
          ? html`<div class="callout" style="margin-top: 16px;">${t("models.noProviders")}</div>`
          : nothing
      }

      <div class="stack" style="gap: 12px; margin-top: 12px;">
        ${props.providers.map((entry) => renderProviderCard(entry, props.activeModel, props))}
      </div>
    </section>
  `;
}
