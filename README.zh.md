# dsh-wsl-winshot

> 把指定的 Windows 窗口截图存入 WSL 文件，可按进程号或窗口句柄指定。

DeepSeek Harness 插件：Capture a specific Windows window to a WSL file, by process id or window handle.

属于 **[dsh-wsl-kit](https://github.com/173787247/dsh-wsl-kit)** 的一部分。

[English → README.md](./README.md)

## 安装

```sh
dsh plugin --profile web add github:173787247/dsh-wsl-winshot
```

## 用法

```
win_shot_window                                        # foreground window
win_shot_window pid=1234 name="build-output"           # a specific process
```

## 说明

Use this when you need the **picture**. Use `dsh-wsl-shot` when the image is
already on the clipboard. A minimized window is restored before measuring, because a
minimized window reports an empty rectangle.

## 依赖

- Windows + WSL，DeepSeek Harness 跑在 WSL 里。
- PowerShell 位于标准路径（插件自己会找）。

## 测试

```sh
npm test
```

单元测试在任何平台都能跑；实时测试在 WSL 之外自动跳过。

## 兼容性

| 字段 | 值 |
|------|----|
| **插件** | `dsh-wsl-winshot` **0.1.0** |
| **最低 dsh** | ≥ **0.1.2**（Web UI 一次性 `?token=`，Windows 中继 `:3081`） |
| **最新验证** | 以 [dsh-wsl-kit 兼容性](https://github.com/173787247/dsh-wsl-kit#compatibility-2026-09) 为准（当前 **`0.2.0-rc.2`**）— 套件唯一真源 |
| **套件档位** | `full` 或单独安装 |

## 许可

MIT
