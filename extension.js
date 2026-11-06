const vscode = require('vscode');
const { spawn } = require('child_process');
const path = require('path');

const SUPPORTED_EXTENSIONS = new Set(['md', 'markdown']);

function launchTypora(filePath) {
  if (process.platform === 'darwin') {
    return spawn('open', ['-a', 'Typora', filePath], { stdio: 'ignore' });
  }
  if (process.platform === 'win32') {
    return spawn('cmd', ['/c', 'start', '', 'typora', filePath], {
      detached: true,
      stdio: 'ignore'
    });
  }
  return spawn('typora', [filePath], { detached: true, stdio: 'ignore' });
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
      vscode.window.showErrorMessage('启动 Typora 失败，请确认 Typora 已安装。');
    });
    child.on('close', (code) => {
      // open 非零退出说明文件未被交给 Typora，此时重试一次
      if (code !== 0) {
        setTimeout(() => {
          try {
            const retry = launchTypora(filePath);
            retry.on('error', () => {
              vscode.window.showErrorMessage('启动 Typora 失败，请确认 Typora 已安装。');
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
