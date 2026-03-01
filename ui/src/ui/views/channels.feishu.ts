import { html, nothing } from "lit";
import { formatRelativeTimestamp } from "../format.ts";
import type { ChannelAccountSnapshot } from "../types.ts";
import { renderChannelConfigForm } from "./channels.config.ts";
import type { ChannelsProps } from "./channels.types.ts";

type FeishuProbe = {
  ok: boolean;
  status?: number | null;
  error?: string | null;
  appId?: string | null;
  botName?: string | null;
  botOpenId?: string | null;
};

type FeishuChannelStatus = {
  configured?: boolean;
  running?: boolean;
  lastStartAt?: number | null;
  lastStopAt?: number | null;
  lastError?: string | null;
  port?: number | null;
  probe?: FeishuProbe | null;
  lastProbeAt?: number | null;
};

// ─── helpers ────────────────────────────────────────────────

function getConfigAccounts(
  props: ChannelsProps,
): Record<string, Record<string, unknown>> {
  const form = props.configForm;
  if (!form) return {};
  const channels = form.channels as Record<string, unknown> | undefined;
  const feishu = channels?.feishu as Record<string, unknown> | undefined;
  return ((feishu?.accounts ?? {}) as Record<string, Record<string, unknown>>);
}

function getFeishuConfig(
  props: ChannelsProps,
): Record<string, unknown> {
  const form = props.configForm;
  if (!form) return {};
  const channels = form.channels as Record<string, unknown> | undefined;
  return (channels?.feishu ?? {}) as Record<string, unknown>;
}

function patchAccountField(
  props: ChannelsProps,
  accounts: Record<string, Record<string, unknown>>,
  accountId: string,
  field: string,
  value: unknown,
) {
  const next = { ...accounts };
  next[accountId] = { ...next[accountId], [field]: value };
  props.onConfigPatch(["channels", "feishu", "accounts"], next);
}

// ─── status badges & toggle ─────────────────────────────────

function renderAccountStatusBadge(running: boolean, enabled: boolean) {
  if (!enabled) {
    return html`<span class="feishu-badge feishu-badge--disabled">已禁用</span>`;
  }
  if (running) {
    return html`<span class="feishu-badge feishu-badge--running">运行中</span>`;
  }
  return html`<span class="feishu-badge feishu-badge--stopped">未运行</span>`;
}

function renderToggleSwitch(params: {
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  const { checked, disabled, onChange } = params;
  return html`
    <label class="feishu-toggle" @click=${(e: Event) => e.stopPropagation()}>
      <input
        type="checkbox"
        .checked=${checked}
        ?disabled=${disabled}
        @change=${onChange}
      />
      <span class="feishu-toggle__track">
        <span class="feishu-toggle__thumb"></span>
      </span>
      <span class="feishu-toggle__label">${checked ? "启用" : "禁用"}</span>
    </label>
  `;
}

// ─── account manager card ───────────────────────────────────

function renderAccountManagerCard(params: {
  accountId: string;
  config: Record<string, unknown>;
  runtime: ChannelAccountSnapshot | undefined;
  props: ChannelsProps;
  allAccounts: Record<string, Record<string, unknown>>;
  disabled: boolean;
}) {
  const { accountId, config, runtime, props, allAccounts, disabled } = params;
  const enabled = config.enabled !== false;
  const appId = (config.appId as string) ?? "";
  const appSecret = (config.appSecret as string) ?? "";
  const name = (config.name as string) ?? "";
  const running = runtime?.running ?? false;
  const probe = runtime?.probe as FeishuProbe | undefined;

  return html`
    <div class="feishu-account ${enabled ? "feishu-account--enabled" : "feishu-account--disabled"}">
      <div class="feishu-account__header">
        <div class="feishu-account__title-row">
          <span class="feishu-account__name">
            ${probe?.botName || name || accountId}
          </span>
          ${renderAccountStatusBadge(running, enabled)}
        </div>
        <div class="feishu-account__actions">
          ${renderToggleSwitch({
            checked: enabled,
            disabled,
            onChange: () => {
              patchAccountField(props, allAccounts, accountId, "enabled", !enabled);
            },
          })}
          <button
            class="btn danger feishu-account__delete"
            ?disabled=${disabled}
            @click=${() => {
              if (!confirm(`确定删除账号 "${name || accountId}" 吗？`)) return;
              const next = { ...allAccounts };
              delete next[accountId];
              props.onConfigPatch(["channels", "feishu", "accounts"], next);
            }}
          >
            删除
          </button>
        </div>
      </div>

      <div class="feishu-account__fields">
        <div class="feishu-account__field">
          <label class="feishu-account__label">账号 ID</label>
          <span class="feishu-account__id-value">${accountId}</span>
        </div>

        <div class="feishu-account__field">
          <label class="feishu-account__label">名称</label>
          <input
            type="text"
            class="feishu-account__input"
            placeholder="给账号起个名字"
            .value=${name}
            ?disabled=${disabled}
            @change=${(e: Event) => {
              patchAccountField(props, allAccounts, accountId, "name",
                (e.target as HTMLInputElement).value);
            }}
          />
        </div>

        <div class="feishu-account__field">
          <label class="feishu-account__label">App ID</label>
          <input
            type="text"
            class="feishu-account__input"
            placeholder="cli_xxxxxxxxxx"
            .value=${appId}
            ?disabled=${disabled}
            @change=${(e: Event) => {
              patchAccountField(props, allAccounts, accountId, "appId",
                (e.target as HTMLInputElement).value.trim());
            }}
          />
        </div>

        <div class="feishu-account__field">
          <label class="feishu-account__label">App Secret</label>
          <input
            type="password"
            class="feishu-account__input"
            placeholder="App Secret"
            .value=${appSecret}
            ?disabled=${disabled}
            @change=${(e: Event) => {
              patchAccountField(props, allAccounts, accountId, "appSecret",
                (e.target as HTMLInputElement).value.trim());
            }}
          />
        </div>
      </div>

      ${runtime
        ? html`
          <div class="feishu-account__status">
            ${probe?.botName
              ? html`<div class="feishu-account__status-item">
                  <span class="feishu-account__status-label">机器人</span>
                  <span>${probe.botName}</span>
                </div>`
              : nothing}
            ${probe?.appId
              ? html`<div class="feishu-account__status-item">
                  <span class="feishu-account__status-label">App ID</span>
                  <span class="feishu-account__mono">${probe.appId}</span>
                </div>`
              : nothing}
            ${runtime.lastStartAt
              ? html`<div class="feishu-account__status-item">
                  <span class="feishu-account__status-label">最近启动</span>
                  <span>${formatRelativeTimestamp(runtime.lastStartAt)}</span>
                </div>`
              : nothing}
            ${runtime.lastInboundAt
              ? html`<div class="feishu-account__status-item">
                  <span class="feishu-account__status-label">最近消息</span>
                  <span>${formatRelativeTimestamp(runtime.lastInboundAt)}</span>
                </div>`
              : nothing}
          </div>
        `
        : nothing}

      ${runtime?.lastError
        ? html`<div class="callout danger feishu-account__error">${runtime.lastError}</div>`
        : nothing}
    </div>
  `;
}

// ─── account manager list ───────────────────────────────────

function renderFeishuAccountManager(params: {
  props: ChannelsProps;
  feishuAccounts: ChannelAccountSnapshot[];
}) {
  const { props, feishuAccounts } = params;
  const accounts = getConfigAccounts(props);
  const feishuCfg = getFeishuConfig(props);
  const disabled = props.configSaving || props.configSchemaLoading;
  const hasAccounts = Object.keys(accounts).length > 0;
  const topLevelAppId = feishuCfg.appId as string | undefined;

  const allIds = new Set<string>(Object.keys(accounts));
  for (const a of feishuAccounts) {
    if (hasAccounts || a.accountId !== "default") {
      allIds.add(a.accountId);
    }
  }
  const sortedIds = [...allIds].sort();

  return html`
    <div class="feishu-manager">
      <div class="feishu-manager__header">
        <div>
          <div class="feishu-manager__title">飞书账号管理</div>
          <div class="feishu-manager__sub">
            配置多个飞书应用账号，每个账号可独立启用或禁用。
          </div>
        </div>
        <button
          class="btn primary"
          ?disabled=${disabled}
          @click=${() => {
            let index = 1;
            let key = `account-${index}`;
            while (key in accounts) {
              index++;
              key = `account-${index}`;
            }
            const next = {
              ...accounts,
              [key]: { enabled: true, name: "", appId: "", appSecret: "" },
            };
            props.onConfigPatch(["channels", "feishu", "accounts"], next);
          }}
        >
          + 添加账号
        </button>
      </div>

      ${!hasAccounts && topLevelAppId
        ? html`
          <div class="callout feishu-manager__hint">
            当前为单账号模式（App ID: <code>${topLevelAppId}</code>）。
            点击"添加账号"可切换到多账号模式，支持同时运行多个飞书机器人。
            <br/>
            <button
              class="btn feishu-manager__migrate-btn"
              ?disabled=${disabled}
              @click=${() => {
                const appSecret = (feishuCfg.appSecret as string) ?? "";
                const next = {
                  ...accounts,
                  "account-1": {
                    enabled: true,
                    name: "默认账号",
                    appId: topLevelAppId,
                    appSecret: appSecret,
                  },
                };
                props.onConfigPatch(["channels", "feishu", "accounts"], next);
              }}
            >
              迁移当前账号到多账号模式
            </button>
          </div>
        `
        : nothing}

      ${sortedIds.length > 0
        ? html`
          <div class="feishu-manager__list">
            ${sortedIds.map((id) =>
              renderAccountManagerCard({
                accountId: id,
                config: accounts[id] ?? {},
                runtime: feishuAccounts.find((a) => a.accountId === id),
                props,
                allAccounts: accounts,
                disabled,
              }),
            )}
          </div>
        `
        : nothing}

      ${!hasAccounts && !topLevelAppId
        ? html`
          <div class="feishu-manager__empty">
            尚未配置任何飞书账号。点击上方"添加账号"开始配置。
          </div>
        `
        : nothing}
    </div>
  `;
}

// ─── advanced settings with account selector ────────────────

const FEISHU_ADVANCED_EXCLUDE = new Set([
  "enabled",
  "appId",
  "appSecret",
  "accounts",
]);

const SHARED_KEY = "__shared__";

let feishuAdvancedAccountId = SHARED_KEY;

function renderFeishuAdvancedSettings(params: {
  props: ChannelsProps;
  accounts: Record<string, Record<string, unknown>>;
}) {
  const { props, accounts } = params;
  const accountIds = Object.keys(accounts).sort();
  const disabled = props.configSaving || props.configSchemaLoading;

  if (feishuAdvancedAccountId !== SHARED_KEY && !accounts[feishuAdvancedAccountId]) {
    feishuAdvancedAccountId = SHARED_KEY;
  }

  const isAccountMode = feishuAdvancedAccountId !== SHARED_KEY;

  let configValue: Record<string, unknown> | null;
  let onPatch: (path: Array<string | number>, value: unknown) => void;

  if (isAccountMode) {
    const acctCfg = accounts[feishuAdvancedAccountId] ?? {};
    configValue = {
      ...(props.configForm ?? {}),
      channels: {
        ...((props.configForm?.channels ?? {}) as Record<string, unknown>),
        feishu: acctCfg,
      },
    };
    onPatch = (path, value) => {
      if (
        path.length > 2 &&
        path[0] === "channels" &&
        path[1] === "feishu"
      ) {
        const field = path.slice(2);
        props.onConfigPatch([
          "channels", "feishu", "accounts", feishuAdvancedAccountId, ...field,
        ], value);
      } else {
        props.onConfigPatch(path, value);
      }
    };
  } else {
    configValue = props.configForm;
    onPatch = props.onConfigPatch;
  }

  return html`
    <div style="margin-top: 16px;">
      ${accountIds.length > 0
        ? html`
          <div class="feishu-adv-selector">
            <label class="feishu-adv-selector__label">配置范围</label>
            <select
              class="feishu-adv-selector__select"
              @change=${(e: Event) => {
                feishuAdvancedAccountId = (e.target as HTMLSelectElement).value;
                props.onRefresh(false);
              }}
            >
              <option
                value=${SHARED_KEY}
                ?selected=${feishuAdvancedAccountId === SHARED_KEY}
              >
                共享设置（所有账号的默认值）
              </option>
              ${accountIds.map((id) => {
                const acct = accounts[id] ?? {};
                const name = (acct.name as string) || "";
                const appId = (acct.appId as string) || "";
                const label = name
                  ? `${name}${appId ? ` (${appId})` : ""}`
                  : id + (appId ? ` (${appId})` : "");
                return html`
                  <option
                    value=${id}
                    ?selected=${feishuAdvancedAccountId === id}
                  >
                    ${label}
                  </option>
                `;
              })}
            </select>
            <div class="feishu-adv-selector__hint">
              ${isAccountMode
                ? "修改仅应用于此账号，未设置的项将自动继承共享设置。"
                : "共享设置是所有账号的默认值，各账号可单独覆盖。"}
            </div>
          </div>
        `
        : nothing}

      ${props.configSchemaLoading
        ? html`<div class="muted">Loading config schema…</div>`
        : renderChannelConfigForm({
            channelId: "feishu",
            configValue,
            schema: props.configSchema,
            uiHints: props.configUiHints,
            disabled,
            excludeProperties: FEISHU_ADVANCED_EXCLUDE,
            onPatch,
          })}

      <div class="row" style="margin-top: 12px;">
        <button
          class="btn primary"
          ?disabled=${disabled || !props.configFormDirty}
          @click=${() => props.onConfigSave()}
        >
          ${props.configSaving ? "保存中…" : "保存"}
        </button>
        <button
          class="btn"
          ?disabled=${disabled}
          @click=${() => props.onConfigReload()}
        >
          撤销
        </button>
      </div>
    </div>
  `;
}

// ─── main card ──────────────────────────────────────────────

export function renderFeishuCard(params: {
  props: ChannelsProps;
  feishu?: FeishuChannelStatus | null;
  feishuAccounts: ChannelAccountSnapshot[];
  accountCountLabel: unknown;
}) {
  const { props, feishu, feishuAccounts, accountCountLabel } = params;
  const accounts = getConfigAccounts(props);

  return html`
    <div class="card" style="grid-column: 1 / -1;">
      <div class="card-title">飞书 / Lark</div>
      <div class="card-sub">飞书企业消息通道，支持 WebSocket 和 Webhook 两种连接模式。</div>
      ${accountCountLabel}

      ${renderFeishuAccountManager({ props, feishuAccounts })}

      ${props.configFormDirty
        ? html`
          <div class="row" style="margin-top: 14px;">
            <button
              class="btn primary"
              ?disabled=${props.configSaving}
              @click=${() => props.onConfigSave()}
            >
              ${props.configSaving ? "保存中…" : "保存配置"}
            </button>
            <button
              class="btn"
              ?disabled=${props.configSaving}
              @click=${() => props.onConfigReload()}
            >
              撤销修改
            </button>
          </div>
        `
        : nothing}

      ${feishu?.lastError
        ? html`<div class="callout danger" style="margin-top: 12px;">
            ${feishu.lastError}
          </div>`
        : nothing}

      ${feishu?.probe
        ? html`<div class="callout" style="margin-top: 12px;">
            探测 ${feishu.probe.ok ? "成功" : "失败"}
            ${feishu.probe.botName ? ` · 机器人: ${feishu.probe.botName}` : ""}
            ${feishu.probe.error ? ` · ${feishu.probe.error}` : ""}
          </div>`
        : nothing}

      <details class="feishu-advanced" style="margin-top: 16px;">
        <summary class="feishu-advanced__summary">高级频道设置</summary>
        <div class="feishu-advanced__content">
          ${renderFeishuAdvancedSettings({ props, accounts })}
        </div>
      </details>

      <div class="row" style="margin-top: 12px;">
        <button class="btn" @click=${() => props.onRefresh(true)}>
          探测连接
        </button>
      </div>
    </div>
  `;
}
