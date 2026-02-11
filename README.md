# Awan

Awan is a synchronization plugin for [Obsidian](https://obsidian.md) that uses S3-compatible storage to keep your vaults in sync across devices. Own your data, control your costs, and sync on your terms.

## Features

- **Bring your own storage** — Use any S3-compatible provider (Amazon S3, Cloudflare R2, Backblaze B2, Wasabi, DigitalOcean Spaces, MinIO, etc.)
- **Conflict resolution** — Automatically handles sync conflicts with *auto merge* or *create conflict files*.
- **Selective sync** — Sync your Markdown files as well as image, audio, video, PDF, and other file types.
- **Privacy-first** — Your credentials and data never touch Awan. Direct vault-to-S3 communication only.
- **Lightweight** — Minimal UI, runs in background, native Obsidian styling.

## Quick Start

1. **Create an S3 bucket** with your preferred provider 
	<!-- (see [Setup Guide](https://awan.risangbaskoro.com/setup) for provider-specific instructions) -->
2. **Install Awan** (see Installation below) 
3. **Configure credentials** in **Settings** → **Community plugins** → **Awan**, under **S3** settings group
4. **Test connection** and start syncing


> [!WARNING]
> 
> **Before using Awan, back up your vault completely**. If you are using Awan alongside other cloud storage provider, such as [Obsidian Sync](https://obsidian.md/sync), Dropbox, Google Drive, OneDrive, or iCloud Drive, please back up your Obsidian files to prevent sync conflicts. 
> 
> *Simultaneous syncing can cause data loss*.
> 
> See the official [Obsidian Help](https://help.obsidian.md/backup) for more information about ways of ways back up your vault.

## Installation

### From Community Plugins (Coming soon)

> [!WARNING] 
> This method will be available when Obsidian team approve this plugin to be displayed in Community plugins.
<!-- 
1. Open Obsidian Settings → Community Plugins
2. Disable Safe Mode if prompted
3. Click Browse and search for "Awan"
4. Click Install, then Enable 
-->

### Using BRAT

Requirement: Install BRAT from Community plugins.

[Install with BRAT](obsidian://brat?plugin=risangbaskoro/awan)

1. Open BRAT settings tab
2. Click "Add beta plugin"
3. Enter Awan's repository URL: `https://github.com/risangbaskoro/awan`
4. Click "Add plugin"

> [!NOTE] 
> Refer to [BRAT's documentation](https://tfthacker.com/brat-quick-guide#Adding+a+beta+plugin) for more in-depth guide.

### Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/risangbaskoro/awan/releases)
2. Extract `main.js`, `manifest.json`, and `styles.css` into `[your-vault]/.obsidian/plugins/awan/`
3. Reload Obsidian
4. Enable Awan in Settings → Community Plugins

## Disclosures

- Awan is not an official sync plugin for Obsidian and is not related to [Obsidian Sync](https://obsidian.md/sync).
- Awan requires you to set up your own S3-compatible storage.
- Awan needs an internet access to upload to and download files from your S3-compatible storage.

## Comparison

| Feature                      | Awan                                  | Obsidian Sync                     | Remotely Save                                                      |
| ---------------------------- | ------------------------------------- | --------------------------------- | ------------------------------------------------------------------ |
| **Cost**                     | Your S3 costs (~$0.01-5/mo)           | $4-5/mo (Sync Standard)           | Your S3 costs + PRO cost for features                              |
| **Storage limit**            | Your bucket size (unlimited)          | 1GB (Sync Standard)               | Your bucket size                                                   |
| Maximum file size            | Unlimited                             | 5MB                               | Unlimited                                                          |
| **Conflict resolution**      | Auto-merge or conflict files          | Automatic merge or conflict files | Last-modified or larger-size wins (free), Smart Conflict for PRO   |
| **Security**                 | Keychain credential storage (1.11.0+) | End-to-end encrypted              | Plain text (opt-in obfuscation) in settings, stored in `data.json` |
| **Data ownership**           | Full (your S3 bucket)                 | Encrypted on Obsidian servers     | Full (your storage)                                                |
| **Setup complexity**         | Moderate (requires S3)                | Easy (zero config)                | Easy - moderate                                                    |
| **Minimum Obsidian version** | 1.11.5                                | Any version                       | 0.12.15                                                            |
| **Privacy**                  | Direct vault-to-S3                    | End-to-end encrypted              | Direct vault-to-storage                                            |
| **Support**                  | Community (GitHub issues)             | Official Obsidian support         | Community                                                          |

### Choose Awan if:

- You want **automatic conflict merging** without paying for Obsidian Sync
- You value **enhanced credential security** (Keychain vs plain text)
- You want full control over your data and storage provider
- You're comfortable with S3 setup or want to learn
- You want to minimize recurring costs

### Choose Obsidian Sync if:

- You want zero-configuration, officially supported sync
- You're willing to pay for maximum convenience
- You need guaranteed compatibility with all Obsidian features

### Choose Remotely Save if:

- You need Obsidian version older than 1.11.0
- You prefer manual conflict resolution control

## Security & Privacy

### Your data stays yours

- **No Awan servers**: Your vault syncs directly to your S3 bucket. Awan (the plugin) never sees your data.
- **Credentials storage**: Stored locally in Obsidian's encrypted settings file on your device.
- **Encryption**:
    - In transit: TLS/HTTPS to your S3 endpoint
    - At rest: Awan relies on S3 server-side encryption. Please refer to your provider's documentation.
- **No telemetry**: Awan doesn't phone home, track usage, or collect analytics.

### Recommendations

- Use S3 bucket encryption (AES-256).
- Enable bucket versioning for additional protection.
- Restrict IAM/API token permissions to minimum required.
- Don't share credentials or reuse them elsewhere.

## Known Limitations

- Large vaults may have slow initial sync.
- Mobile sync requires app to be open.
- No partial/differential sync yet; full file re-upload on change.
- Symlinks not supported.

## Security Vulnerability Reporting

If you discover a security vulnerability in Awan, please review [Security Policy](SECURITY.md) for responsible disclosure guidelines. Please **do not** report security vulnerabilities through public GitHub issues.

## Credits

Created by [@risangbaskoro](https://github.com/risangbaskoro). Inspired by Obsidian Sync and [Remotely Save](https://github.com/remotely-save/remotely-save).

---

**Disclaimer:** Awan is not affiliated with Obsidian or Obsidian Sync. It's an independent community plugin. Use at your own risk and always maintain backups.

---

## Support Development 

Awan is free and open source. If it saves you money or makes your workflow better, consider supporting its development: 

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-GitHub-pink?logo=github)](https://github.com/sponsors/risangbaskoro) [![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-yellow?logo=buymeacoffee)](https://buymeacoffee.com/baskoro)

Every contribution helps maintain and improve Awan. Thank you! ❤️