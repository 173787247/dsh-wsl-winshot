import { mkdirSync, existsSync, copyFileSync, unlinkSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { runPowerShell } from "./wsl-host.js";
import { sanitizeName, normalizeTarget, isUsableRect, safeInt } from "./shot.js";

const PRELUDE = `
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @"
using System;using System.Runtime.InteropServices;
public class DshShot {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
}
"@
`;

export function captureScript(pid, outPath) {
  return `${PRELUDE}
$h = [IntPtr]::Zero
if (${pid} -gt 0) {
  $cond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ProcessIdProperty, ${pid})
  $wins = [System.Windows.Automation.AutomationElement]::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children, $cond)
  foreach ($w in $wins) { if ($w.Current.NativeWindowHandle -ne 0) { $h = [IntPtr]$w.Current.NativeWindowHandle; break } }
} else {
  $h = [DshShot]::GetForegroundWindow()
}
if ($h -eq [IntPtr]::Zero) { ConvertTo-Json -Compress @{ error = 'no window for that pid' }; exit }
# A minimized window has no drawable area; restore it before measuring.
if ([DshShot]::IsIconic($h)) { [void][DshShot]::ShowWindow($h, 9) ; Start-Sleep -Milliseconds 250 }
$r = New-Object DshShot+RECT
if (-not [DshShot]::GetWindowRect($h, [ref]$r)) { ConvertTo-Json -Compress @{ error = 'GetWindowRect failed' }; exit }
$w = $r.R - $r.L; $ht = $r.B - $r.T
if ($w -le 0 -or $ht -le 0) { ConvertTo-Json -Compress @{ error = 'window has no drawable area'; width=$w; height=$ht }; exit }
$bmp = New-Object System.Drawing.Bitmap $w, $ht
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($r.L, $r.T, 0, 0, $bmp.Size)
$bmp.Save('${outPath.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
ConvertTo-Json -Compress @{ path = '${outPath.replace(/'/g, "''")}'; width = $w; height = $ht; pid = ${pid}; x = $r.L; y = $r.T }
`;
}

export async function execute(args, config = {}) {
  const timeoutMs = Math.min(120_000, Math.max(1000, Number(config.timeoutMs) || 30_000));
  const pid = safeInt(args?.pid);
  const outDir = typeof args?.outDir === "string" && args.outDir.trim()
    ? args.outDir.trim() : join(homedir(), ".dsh", "shots");
  mkdirSync(outDir, { recursive: true });
  const base = sanitizeName(args?.name, `window-${Date.now()}`);
  const winTemp = `C:\\\\Users\\\\Public\\\\dsh-winshot-${Date.now()}.png`;
  const { stdout } = await runPowerShell(captureScript(pid, winTemp), { timeoutMs });
  const raw = JSON.parse(stdout.trim() || "{}");
  if (raw.error) return { ok: false, error: raw.error };

  const wslPath = `${winTemp.replace(/^C:\\\\Users\\\\Public\\\\/, "/mnt/c/Users/Public/")}`.replace(/\\\\/g, "/");
  if (!existsSync(wslPath)) return { ok: false, error: `capture not found at ${wslPath}` };
  const dest = join(outDir, `${base}.png`);
  copyFileSync(wslPath, dest);
  try { unlinkSync(wslPath); } catch {}
  const size = statSync(dest).size;
  return {
    ok: true, path: dest, bytes: size,
    width: safeInt(raw.width), height: safeInt(raw.height),
    pid: safeInt(raw.pid), x: safeInt(raw.x), y: safeInt(raw.y),
  };
}

export { normalizeTarget, isUsableRect };
