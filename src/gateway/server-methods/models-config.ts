import fs from "node:fs/promises";
import path from "node:path";
import { resolveOpenClawAgentDir } from "../../agents/agent-paths.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";
import type { GatewayRequestHandlers } from "./types.js";

export const modelsConfigHandlers: GatewayRequestHandlers = {
  "models.config.save": async ({ params, respond }) => {
    const providers = (params as { providers?: unknown }).providers;
    if (!providers || typeof providers !== "object" || Array.isArray(providers)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          "models.config.save requires providers (object)",
        ),
      );
      return;
    }

    const agentDir = resolveOpenClawAgentDir();
    const targetPath = path.join(agentDir, "models.json");

    let existing: Record<string, unknown> = {};
    try {
      const raw = await fs.readFile(targetPath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        existing = parsed as Record<string, unknown>;
      }
    } catch {
      // file doesn't exist yet
    }

    const existingProviders =
      existing.providers && typeof existing.providers === "object" && !Array.isArray(existing.providers)
        ? (existing.providers as Record<string, unknown>)
        : {};

    const merged: Record<string, unknown> = { ...existingProviders };
    for (const [key, value] of Object.entries(providers as Record<string, unknown>)) {
      if (value === null) {
        delete merged[key];
      } else {
        merged[key] = value;
      }
    }

    const next = { providers: merged };
    await fs.mkdir(agentDir, { recursive: true });
    await fs.writeFile(targetPath, JSON.stringify(next, null, 2) + "\n", { mode: 0o600 });

    respond(true, { ok: true, path: targetPath, providerCount: Object.keys(merged).length }, undefined);
  },

  "models.config.get": async ({ respond }) => {
    const agentDir = resolveOpenClawAgentDir();
    const targetPath = path.join(agentDir, "models.json");

    let providers: Record<string, unknown> = {};
    try {
      const raw = await fs.readFile(targetPath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const obj = parsed as { providers?: unknown };
        if (obj.providers && typeof obj.providers === "object" && !Array.isArray(obj.providers)) {
          providers = obj.providers as Record<string, unknown>;
        }
      }
    } catch {
      // file doesn't exist
    }

    respond(true, { providers, path: targetPath }, undefined);
  },
};
