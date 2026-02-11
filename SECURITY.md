# Security Policy

## Supported Versions

| Version          | Supported        |
| ---------------- | ---------------- |
| Latest release   | ✅               |
| Previous release | ⚠️ (Best effort) |
| Older versions   | ❌               |

## Reporting a Vulnerability

If you discover a security vulnerability in Awan, please report it responsibly.

### How to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please send your report to:

- **Email:** security@risangbaskoro.com
- **GitHub Security Advisory** (if you have GitHub account): Use the "Security" tab on this repository

### What to Include

Please include as much of the following information as possible:

- **Vulnerability type** (e.g., authentication bypass, data exposure, etc.)
- **Affected versions** of Awan
- **Steps to reproduce** the vulnerability
- **Impact assessment** (what could an attacker do with this vulnerability?)
- **Proof of concept** (if available)
- **Suggested mitigation** (if you have ideas)

### Response Timeline

- **Initial response:** Within 48 hours
- **Detailed assessment:** Within 7 days
- **Public disclosure:** After fix is released and coordinated disclosure period

### Security Principles

Awan follows these security principles:

- **Privacy-first** — Your data never touches Awan servers
- **Minimal permissions** — Only requests necessary S3 permissions
- **Secure credential storage** — Uses Obsidian's encrypted settings and device keychain
- **No telemetry** — No data collection or analytics
- **Direct communication** — Vault-to-S3 communication only

### Common Security Considerations

- **Credential Protection** — Always use strong, unique S3 credentials
- **Network Security** — Ensure HTTPS/TLS is used for S3 endpoints
- **Access Control** — Implement least-privilege IAM policies
- **Encryption** — Enable S3 bucket encryption (AES-256 recommended)
- **Versioning** — Enable S3 bucket versioning for recovery

## Security Features

### Built-in Protections

- **Encrypted credential storage** using device keychain (Obsidian 1.11.0+)
- **TLS/HTTPS** for all S3 communications
- **No third-party servers** or data collection
- **S3 integration only** with proper authentication

### Recommended Hardening

- Enable S3 bucket versioning
- Use bucket policies to restrict access
- Implement IP restrictions on S3 buckets
- Regular credential rotation
- Monitor S3 access logs

## Acknowledgments

We appreciate security research and responsible disclosure. If you discover and report a security vulnerability, we'll credit you in our release notes and security advisories (with your permission).