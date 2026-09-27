import { mkdirSync, existsSync, copyFileSync, unlinkSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { runPowerShell } from "./wsl-host.js";
import { sanitizeName, normalizeTarget, isUsableRect, normalizeCrop, safeInt } from "./shot.js";

const PRELUDE = `
$ErrorActionPreference = 'Stop'
# The console codepage mangles non-ASCII window titles; force UTF-8 on the way out.
[Console]::OutputEncoding = [Text.Encoding]::UTF8
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @"
using System;using System.Runtime.InteropServices;
public class DshShot {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
}
"@
function Dsh-I([double]$v) { if ([double]::IsNaN($v) -or [double]::IsInfinity($v)) { 0 } else { [int]$v } }
`;

function psq(s) {
  return "'" + String(s ?? "").replace(/'/g, "''") + "'";
}

/**
 * The crop is resolved on the Windows side, in window-relative coordinates, so
 * the caller never has to know where the window sits on screen or account for
 * DPI scaling between the two.
 */
export function captureScript(pid, outPath, opts = {}) {
  const { expectName = "", expectType = "", crop = null } = opts;
  const elemBlock = expectName
    ? `
# Crop to a named element. Name, not index: an index is a position in a picture
# that has already moved, and two walks of a live window disagree about it.
$walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker
$match = $null
$queue = New-Object System.Collections.Queue
$queue.Enqueue(@{ el = $el; d = 0 })
$seen = 0
while ($queue.Count -gt 0 -and $seen -lt 2000 -and $null -eq $match) {
  $item = $queue.Dequeue(); $e = $item.el; $d = $item.d
  $seen++
  if ($d -gt 0) {
    try {
      $ct = $e.Current.ControlType.ProgrammaticName.Replace('ControlType.','')
      $typeOk = ${expectType ? `($ct -eq ${psq(expectType)})` : "$true"}
      if ($typeOk -and $e.Current.Name -eq ${psq(expectName)}) { $match = $e; break }
    } catch {}
  }
  if ($d -lt 10) {
    $c = $walker.GetFirstChild($e)
    while ($c) { $queue.Enqueue(@{ el = $c; d = $d + 1 }); $c = $walker.GetNextSibling($c) }
  }
}
if ($null -eq $match) { ConvertTo-Json -Compress @{ error = ${psq("no element matched")} }; exit }
$er = $match.Current.BoundingRectangle
if ([double]::IsNaN($er.Width) -or [double]::IsInfinity($er.Width) -or $er.Width -le 0) {
  ConvertTo-Json -Compress @{ error = 'the matched element has no drawable area' }; exit
}
$cx = (Dsh-I $er.X) - $r.L; $cy = (Dsh-I $er.Y) - $r.T
$cw = Dsh-I $er.Width; $ch = Dsh-I $er.Height
$matched = @{ controlType = $match.Current.ControlType.ProgrammaticName.Replace('ControlType.',''); name = $match.Current.Name }
`
    : crop
      ? `$cx = ${crop.x}; $cy = ${crop.y}; $cw = ${crop.width}; $ch = ${crop.height}
$matched = $null
`
      : `$cx = 0; $cy = 0; $cw = $w; $ch = $ht
$matched = $null
`;

  return `${PRELUDE}
$h = [IntPtr]::Zero
if (${pid} -gt 0) {
  $cond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ProcessIdProperty, ${pid})
  $wins = [System.Windows.Automation.AutomationElement]::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children, $cond)
  foreach ($w in $wins) { if ($w.Current.NativeWindowHandle -ne 0) { $h = [IntPtr]$w.Current.NativeWindowHandle; $el = $w; break } }
} else {
  $h = [DshShot]::GetForegroundWindow()
  $el = [System.Windows.Automation.AutomationElement]::FromHandle($h)
}
if ($h -eq [IntPtr]::Zero) { ConvertTo-Json -Compress @{ error = 'no window for that pid' }; exit }
# A minimized window has no drawable area; restore it before measuring.
if ([DshShot]::IsIconic($h)) { [void][DshShot]::ShowWindow($h, 9) ; Start-Sleep -Milliseconds 250 }
$r = New-Object DshShot+RECT
if (-not [DshShot]::GetWindowRect($h, [ref]$r)) { ConvertTo-Json -Compress @{ error = 'GetWindowRect failed' }; exit }
$w = $r.R - $r.L; $ht = $r.B - $r.T
if ($w -le 0 -or $ht -le 0) { ConvertTo-Json -Compress @{ error = 'window has no drawable area'; width=$w; height=$ht }; exit }
${elemBlock}
if ($cx -lt 0) { $cw += $cx; $cx = 0 }
if ($cy -lt 0) { $ch += $cy; $cy = 0 }
if ($cx + $cw -gt $w) { $cw = $w - $cx }
if ($cy + $ch -gt $ht) { $ch = $ht - $cy }
if ($cw -le 0 -or $ch -le 0) { ConvertTo-Json -Compress @{ error = 'the crop falls outside the window'; x=$cx; y=$cy; width=$cw; height=$ch }; exit }
$bmp = New-Object System.Drawing.Bitmap $cw, $ch
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen(($r.L + $cx), ($r.T + $cy), 0, 0, $bmp.Size)
$bmp.Save(${psq(outPath)}, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
ConvertTo-Json -Compress -Depth 4 @{
  path = ${psq(outPath)}; width = $cw; height = $ch; pid = ${pid}
  x = ($r.L + $cx); y = ($r.T + $cy)
  crop = @{ x = $cx; y = $cy; width = $cw; height = $ch }
  windowWidth = $w; windowHeight = $ht
  element = $matched
}
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

  const expectName = typeof args?.expectName === "string" ? args.expectName : "";
  const expectType = typeof args?.expectType === "string" ? args.expectType : "";
  // An element crop and a coordinate crop are two ways of asking for the same
  // thing; naming an element wins, because it is the one that survives the
  // window being moved or resized.
  const crop = expectName ? null : normalizeCrop(args, { width: 0, height: 0 });

  const { stdout } = await runPowerShell(captureScript(pid, winTemp, { expectName, expectType, crop }), { timeoutMs });
  const raw = JSON.parse(stdout.trim() || "{}");
  if (raw.error) return { ok: false, error: raw.error };

  const wslPath = winTemp.replace(/^C:\\\\Users\\\\Public\\\\/, "/mnt/c/Users/Public/").replace(/\\\\/g, "/");
  if (!existsSync(wslPath)) return { ok: false, error: `capture not found at ${wslPath}` };
  const dest = join(outDir, `${base}.png`);
  copyFileSync(wslPath, dest);
  try { unlinkSync(wslPath); } catch {}
  return {
    ok: true, path: dest, bytes: statSync(dest).size,
    width: safeInt(raw.width), height: safeInt(raw.height),
    pid: safeInt(raw.pid), x: safeInt(raw.x), y: safeInt(raw.y),
    crop: raw.crop, windowWidth: safeInt(raw.windowWidth), windowHeight: safeInt(raw.windowHeight),
    element: raw.element ?? null,
  };
}

export { normalizeTarget, isUsableRect, normalizeCrop };
