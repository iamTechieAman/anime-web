# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | ✅ Yes             |

## Reporting a Vulnerability

If you discover a security vulnerability in ToonPlayer, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please contact us via:
- Email: security@toonplayer.app

### What to Include
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline
- We will acknowledge your report within **48 hours**
- We aim to provide a fix within **7 days** for critical vulnerabilities

## Security Best Practices

This project follows these security practices:
- All API keys are stored as environment variables
- No sensitive data is committed to version control
- Dependencies are regularly updated to patch known vulnerabilities
- Iframe sandbox attributes are used for embedded content
- Input sanitization is applied on all user-facing forms
