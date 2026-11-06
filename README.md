# 用 Typora 打开 (Trae Code/IDE)

在 Trae Code/IDE 中右键 Markdown 文件即可用 [Typora](https://typora.io/) 打开，支持资源管理器、编辑器标签页、标题栏与编辑器内右键菜单。不联网、不收集数据，开箱即用。

Right-click a Markdown file in Trae Code/IDE to open it in [Typora](https://typora.io/). Works in the Explorer, on editor tabs, in the title bar and inside the editor. No network calls, no data collection.

![icon](icon.png)

## 功能

在以下位置右键 `.md` / `.markdown` 文件，会出现「用 Typora 打开」菜单项：

- **资源管理器** —— 右键文件
- **编辑器标签页** —— 右键标签
- **编辑器标题栏** —— 打开 md 文件后，编辑器右上角的操作菜单
- **编辑器内** —— 在编辑区右键

菜单项**只在 Markdown 文件上出现**，其他文件不受影响。

## 安装

### 从源码安装

```bash
git clone https://github.com/yongjiguo/trae-open-md-in-typora.git
cd trae-open-md-in-typora
npm install
npm run package
```

产物在 `dist/` 目录下（`*.vsix`），然后安装：

```bash
trae --install-extension dist/trae-open-md-in-typora-0.0.3.vsix
```

如果 `trae` 不在 PATH 中，可用完整路径：

```bash
/Applications/Trae.app/Contents/Resources/app/bin/trae \
  --install-extension dist/trae-open-md-in-typora-0.0.3.vsix
```

安装后重载 Trae Code/IDE 窗口（命令面板执行 `Developer: Reload Window`）即可生效。

### 卸载

```bash
trae --uninstall-extension yongjiguo.trae-open-md-in-typora
```

## 使用前提

需要本机已安装 Typora。未安装时菜单项会提示启动失败。

## 平台支持

| 平台 | 状态 | 说明 |
|---|---|---|
| macOS | ✅ 已验证 | 通过 LaunchServices 按应用名定位，不依赖 PATH |
| Windows | ⚠️ 支持有限 | 见下方说明 |
| Linux | ⚠️ 未验证 | 依赖 `typora` 在 PATH 中 |

**Windows 支持有限。** 扩展会依次尝试以下方式定位 Typora：

1. 常见安装位置（`C:\Program Files\Typora\Typora.exe` 等）
2. 系统 `PATH` 中的 `typora.exe`

若 Typora 安装在自定义位置且未加入 `PATH`，扩展会提示「未找到 Typora」。
**如需在 Windows 上使用自定义路径，可自行在 Code agent 中实现**，
或参考 [extension.js](extension.js) 中的 `resolveTyporaExecutable()` 扩展候选路径。

## 已知限制

**资源管理器右键菜单需在 IDE 模式下使用。**

Trae Code/IDE 的资源管理器右键菜单 ID 是动态选择的：

```js
menuId: soloModeManagerService.isSoloLiteMode
    ? MenuId.ExplorerContextSoloLite   // SOLO 模式：Trae Code/IDE 私有菜单
    : MenuId.ExplorerContext,          // IDE 模式：标准菜单
```

`ExplorerContextSoloLite` 不在扩展贡献点白名单内，因此 SOLO 模式下
`explorer/context` 的扩展贡献**不会渲染**。若在 SOLO 模式下右键看不到本菜单，
切到 IDE 模式（标题栏左上角 `SOLO | IDE` 切换）即可。

**编辑器标签页右键菜单在两种模式下均可用。** 该菜单使用标准的
`MenuId.EditorTitleContext`，不受上述限制。

## 工作原理

扩展在菜单点击时读取目标文件路径，然后调用系统命令唤起 Typora：

| 平台 | 命令 |
|---|---|
| macOS | `open -a Typora <file>` |
| Windows | `Typora.exe <file>`（直接调用；未找到时回退 `cmd /c start "" typora <file>`） |
| Linux | `typora <file>` |

文件路径始终作为独立参数传递（不拼接进 shell 字符串），因此不存在命令注入风险。

Windows 下直接调用 `Typora.exe` 时会设置 `windowsHide: true`，避免每次右键都闪出
一个 cmd 黑窗。命令面板与编辑器内右键菜单同样可用。

扩展不联网、不收集任何数据，仅在本地启动 Typora 进程。详见 [SECURITY.md](SECURITY.md)。

## 关于 activationEvents

本扩展使用 `activationEvents: ["*"]`（启动即激活）。虽然官方文档建议优先使用
更精细的激活条件（如 `onCommand:`），但本扩展刻意保留 `*`，原因是：

菜单贡献点需要在扩展**已激活**时才会被完整注册。若等到用户点击菜单才激活，
会出现「第一次右键无反应、第二次才生效」的偶发问题。启动即激活可以彻底避免
这一时序竞争。

由于扩展本身很轻量（仅注册一个命令，无后台任务、无网络请求），启动即激活
的性能影响可以忽略。

## 开发

```bash
npm install        # 安装依赖
npm run package    # 打包成 vsix（输出到 dist/）
npm run lint       # 语法检查
```

## License

[MIT](LICENSE.txt)

