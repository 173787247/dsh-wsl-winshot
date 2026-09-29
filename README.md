# dsh-wsl-winshot

DeepSeek Harness plugin: Capture a specific Windows window to a WSL file, by process id or window handle.

Part of **[dsh-wsl-kit](https://github.com/173787247/dsh-wsl-kit)**.

[中文说明 → README.zh.md](./README.zh.md)

## Install

```sh
dsh plugin --profile web add github:173787247/dsh-wsl-winshot
```

## Usage

```
win_shot_window                                        # foreground window
win_shot_window pid=1234 name="build-output"           # a specific process
```

## Notes

Use this when you need the **picture**. Use `dsh-wsl-shot` when the image is
already on the clipboard. A minimized window is restored before measuring, because a
minimized window reports an empty rectangle.

## Requirements

- Windows with WSL, and DeepSeek Harness running inside it.
- PowerShell reachable at the standard path (the plugin finds it itself).

## Tests

```sh
npm test
```

The unit tests run anywhere. The live tests are skipped outside WSL.

## Compatibility

| Field | Value |
|-------|-------|
| **Plugin** | `dsh-wsl-winshot` **0.1.0** |
| **Minimum dsh** | ≥ **0.1.2** (web UI one-shot `?token=` on Windows relay `:3081`) |
| **Latest verified** | See [dsh-wsl-kit Compatibility](https://github.com/173787247/dsh-wsl-kit#compatibility-2026-09) (currently **`0.2.0-rc.2`**) — single source of truth for the suite |
| **Kit set** | `full` or install alone |

## License

MIT
