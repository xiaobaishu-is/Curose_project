import { html, nothing } from "lit";
import { formatRelativeTimestamp } from "../format.ts";
import { renderFeishuCard } from "./channels.feishu.ts";
import { renderChannelAccountCount } from "./channels.shared.ts";
import type { ChannelsProps } from "./channels.types.ts";

export function renderChannels(props: ChannelsProps) {
  const channels = props.snapshot?.channels as Record<string, unknown> | null;
  const feishu = (channels?.feishu ?? null) as Record<string, unknown> | null;
  const feishuAccounts = props.snapshot?.channelAccounts?.feishu ?? [];

  return html`
    <section class="grid grid-cols-1">
      ${renderFeishuCard({
        props,
        feishu,
        feishuAccounts,
        accountCountLabel: renderChannelAccountCount("feishu", props.snapshot?.channelAccounts ?? null),
      })}
    </section>

    <section class="card" style="margin-top: 18px;">
      <div class="row" style="justify-content: space-between;">
        <div>
          <div class="card-title">Channel 健康状态</div>
          <div class="card-sub">来自网关的 Channel 状态快照。</div>
        </div>
        <div class="muted">${props.lastSuccessAt ? formatRelativeTimestamp(props.lastSuccessAt) : "无"}</div>
      </div>
      ${
        props.lastError
          ? html`<div class="callout danger" style="margin-top: 12px;">
            ${props.lastError}
          </div>`
          : nothing
      }
      <pre class="code-block" style="margin-top: 12px;">
${props.snapshot ? JSON.stringify(props.snapshot, null, 2) : "暂无快照数据。"}
      </pre>
    </section>
  `;
}
