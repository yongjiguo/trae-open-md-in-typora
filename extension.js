const vscode = require('vscode');
const { spawn, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SUPPORTED_EXTENSIONS = new Set(['md', 'markdown']);

// Windows 下 Typora 的常见安装位置。
// Typora 安装程序默认不把 typora.exe 加入 PATH，因此不能只依赖 PATH 查找。
const WINDOWS_TYPORA_PATHS = [
  'C:\\Program Files\\Typora\\Typora.exe',
  'C:\\Program Files (x86)\\Typora\\Typora.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Programs\\Typora\\Typora.exe'),
  path.join(process.env.APPDATA || '', 'Typora\\Typora.exe'),
];

// 在 PATH 中查找 typora.exe，返回完整路径；找不到返回 null。
function findTyporaInPath() {
  const finder = process.platform === 'win32' ? 'where' : 'which';
  try {
    const output = execFileSync(finder, ['typora'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 3000,
    });
    const first = output.split(/\r?\n/).map((s) => s.trim()).find(Boolean);
    return first || null;
  } catch (error) {
    return null;
  }
}

// 定位 Typora 可执行文件；找不到返回 null。
function resolveTyporaExecutable() {
  if (process.platform === 'win32') {
    for (const candidate of WINDOWS_TYPORA_PATHS) {
      if (candidate && fs.existsSync(candidate)) return candidate;
    }
  }
  return findTyporaInPath();
}

function launchTypora(filePath) {
  if (process.platform === 'darwin') {
    // 走 LaunchServices 按应用名定位，不依赖 PATH
    return spawn('open', ['-a', 'Typora', filePath], { stdio: 'ignore' });
  }

  if (process.platform === 'win32') {
    const executable = resolveTyporaExecutable();
    // 优先直接调用 Typora.exe：避免 cmd 的 start 解析，也避免黑窗闪烁
    if (executable) {
      return spawn(executable, [filePath], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
    }
    // 兜底：假定 typora 已在 PATH 中。
    // start 后面的空字符串是必需的占位符——start 会把第一个带引号的参数当作窗口标题。
    return spawn('cmd', ['/c', 'start', '', 'typora', filePath], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
  }

  const executable = resolveTyporaExecutable();
  if (!executable) {
    const error = new Error('未找到 Typora，可执行文件不在 PATH 中。');
    error.code = 'ENOTYPORA';
    throw error;
  }
  return spawn(executable, [filePath], { detached: true, stdio: 'ignore' });
}

function isSupported(filePath) {
  const ext = path.extname(filePath).toLowerCase().replace(/^\./, '');
  return SUPPORTED_EXTENSIONS.has(ext);
}

// 从命令参数中提取目标文件 URI。
// 资源管理器右键时首参为 URI；命令面板触发时无参；多选时首参仍为 URI、次参为附加对象。
function resolveTargetUri(args) {
  for (const arg of args) {
    if (arg && typeof arg === 'object' && typeof arg.scheme === 'string' && typeof arg.fsPath === 'string') {
      return arg;
    }
    if (Array.isArray(arg)) {
      const first = arg.find((item) => item && typeof item.scheme === 'string');
      if (first) return first;
    }
  }
  return vscode.window.activeTextEditor?.document?.uri ?? null;
}

function openInTypora(uri) {
  if (!uri || uri.scheme !== 'file') {
    vscode.window.showErrorMessage('用 Typora 打开：请先选中一个本地 Markdown 文件。');
    return;
  }
  if (!isSupported(uri.fsPath)) {
    vscode.window.showErrorMessage('用 Typora 打开仅支持 .md / .markdown 文件。');
    return;
  }

  const filePath = uri.fsPath;
  try {
    const child = launchTypora(filePath);
    child.on('error', () => {
      vscode.window.showErrorMessage(
        '启动 Typora 失败，请确认 Typora 已安装，且其可执行文件在 PATH 中。'
      );
    });
    child.on('close', (code) => {
      // 启动命令非零退出说明文件未被交给 Typora，此时重试一次
      if (code !== 0) {
        setTimeout(() => {
          try {
            const retry = launchTypora(filePath);
            retry.on('error', () => {
              vscode.window.showErrorMessage(
                '启动 Typora 失败，请确认 Typora 已安装，且其可执行文件在 PATH 中。'
              );
            });
            retry.unref();
          } catch (error) {
            vscode.window.showErrorMessage(`用 Typora 打开失败：${error.message}`);
          }
        }, 300);
      }
    });
    child.unref();
  } catch (error) {
    if (error && error.code === 'ENOTYPORA') {
      vscode.window.showErrorMessage(
        '未找到 Typora。请确认已安装 Typora，或将其可执行文件加入系统 PATH。'
      );
      return;
    }
    vscode.window.showErrorMessage(`用 Typora 打开失败：${error.message}`);
  }
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('traeOpenInTypora.openInTypora', (...args) => {
      openInTypora(resolveTargetUri(args));
    })
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
