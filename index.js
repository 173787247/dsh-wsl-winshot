import { detectWsl } from "./lib/wsl-host.js";
import * as shot from "./lib/shot.js";
import { execute } from "./lib/shot-exec.js";

export const name = "dsh-wsl-winshot";
export const inject = ["tools", "systemPrompt"];

export function apply(ctx, config = {}) {
  const wsl = detectWsl();

  ctx.systemPrompt.section({
    name: "tool:win_shot_window",
    order: 212,
    text: "Use win_shot_window to capture a specific Windows window into a WSL file: pass pid, or omit it for the foreground window. Use dsh-wsl-shot instead when the image is already on the clipboard.",
  });

  ctx.tools.register({
    name: "win_shot_window",
    description: "Capture a specific Windows window to a WSL file, by process id or the foreground window.",
    parameters: shot.parameters(),
    output: {
      schema: shot.outputSchema(),
      render: (_args, value) => [{ type: "text", text: shot.format(value) }],
    },
    timeoutMs: Number(config.timeoutMs) > 0 ? Number(config.timeoutMs) : 30_000,
    isConcurrencySafe: () => true,
    async execute(args) {
      if (!wsl) return { ok: false, error: "not running in WSL" };
      try {
        return await execute(args, config);
      } catch (error) {
        return { ok: false, error: String(error?.message ?? error) };
      }
    },
    presentCall: () => ({ card: "generic", title: "win_shot_window" }),
    presentResult: (_args, result) => ({ card: "generic", title: "win_shot_window", content: result?.content }),
  });
}
