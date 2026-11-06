# Security Policy

## Supported Versions

Only the latest released version is supported with security updates.

## Reporting a Vulnerability

If you find a security vulnerability, please **do not open a public issue**.

Report it privately via GitHub's security advisory feature:

> **Security** tab → **Report a vulnerability**

Please include:

- Description of the issue and its impact
- Steps to reproduce
- Your Trae/VS Code version and OS version

You can expect an initial response within a few days. Once the issue is
confirmed, a fix will be released and the advisory published.

## Security Scope

This extension is intentionally minimal, which bounds its attack surface:

- **No network access.** The extension never makes outbound requests.
- **No telemetry or analytics.** No usage data is collected or transmitted.
- **No file reads beyond the target file.** The extension only reads the path
  of the file you explicitly chose to open.
- **No credential or configuration access.** It does not read settings,
  secrets, environment variables, or tokens.
- **No remote code execution.** The only side effect is spawning the
  locally-installed Typora application with the selected file path.
- **No `contributes.configuration` settings.** The extension exposes no
  configuration surface.

The one thing to be aware of: the extension passes a file path to
`open -a Typora` (macOS), `Typora.exe` (Windows), or `typora` (Linux).
The path always originates from the editor's own file selection and is passed
as a separate argument (not interpolated into a shell string), so it cannot be
used for command injection.

On Windows the extension locates `Typora.exe` by checking well-known install
locations and then the system `PATH`. It reads the filesystem only to test for
the existence of that single executable — it never enumerates or reads file
contents.
