# Fenxiangnishicangku

[中文文档](README.md)

[![npm version](https://img.shields.io/npm/v/fenxiangnishicangku?logo=npm)](https://www.npmjs.com/package/fenxiangnishicangku)
[![npm downloads](https://img.shields.io/npm/dm/fenxiangnishicangku?logo=npm)](https://www.npmjs.com/package/fenxiangnishicangku)
[![CI](https://img.shields.io/github/actions/workflow/status/galihru/fenxiangnishicangku/ci.yml?branch=main&label=CI)](https://github.com/galihru/fenxiangnishicangku/actions/workflows/ci.yml)
[![GitHub Packages](https://img.shields.io/badge/GitHub%20Packages-@galihru%2Ffenxiangnishicangku-24292f?logo=github)](https://github.com/users/galihru/packages/npm/package/fenxiangnishicangku)

Fenxiangnishicangku is a GitHub Action and npm module for sharing repository updates to social media.

Default behavior is individual-friendly: no API required. The action generates a ready-to-post package (caption + media) so you can post manually.

## Features

- Build post captions from `README` or custom text
- Discover media from README references and repository files
- Convert Markdown tables into PNG attachments
- Extract badge target links for contextual captions
- Generate a manual share package for one-step personal posting
- Use class-based architecture for future provider expansion

## Supported Platform

- Current: LinkedIn

## Usage Modes

- `manual` (default): No API call. Generates a package for manual posting.
- `auto`: Publishes directly through platform API (LinkedIn token + author URN required).

## Package Registries

- npm (public): https://www.npmjs.com/package/fenxiangnishicangku
- GitHub Packages (scoped): `@galihru/fenxiangnishicangku`
- GitHub Packages page: https://github.com/users/galihru/packages/npm/package/fenxiangnishicangku

Install from npm:

```bash
npm install fenxiangnishicangku
```

Install from GitHub Packages:

```bash
npm config set @galihru:registry https://npm.pkg.github.com
npm config set //npm.pkg.github.com/:_authToken ${GH_PACKAGES_TOKEN}
npm install @galihru/fenxiangnishicangku
```

If the GitHub Packages page still shows 404, run the release workflow again after fixing registry auth.

## How It Works (Mermaid Diagram)

```mermaid
flowchart TD
  A[GitHub Event or Manual Trigger] --> B[Parse README and Build Caption]
  B --> C[Discover Media from README and Repository]
  C --> D[Render Markdown Tables to PNG]
  D --> E{publish-mode}
  E -->|manual| F[Generate .social-share-output package]
  F --> G[Upload Artifact for User]
  G --> H[User posts manually to LinkedIn]
  E -->|auto| I[Use LinkedIn API]
  I --> J[Upload media assets]
  J --> K[Create LinkedIn post]
```

## Quick Start (No API, Individual-Friendly)

### 1. Prerequisites

- GitHub Actions enabled in your repository
- No LinkedIn developer app required
- No repository secrets required

### 2. Add Workflow

Create `.github/workflows/share.yml`:

```yaml
name: Share Project Update

on:
  workflow_dispatch:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate social share package
        id: share
        uses: galihru/fenxiangnishicangku@v1
        with:
          publish-mode: manual
          platform: linkedin
          caption-source: readme
          include-repo-link: "true"
          include-badges: "true"
          auto-media: "true"
          include-readme-images: "true"
          include-repo-media: "true"
          table-to-image: "true"

      - name: Upload package artifact
        uses: actions/upload-artifact@v4
        with:
          name: social-share-package
          path: ${{ steps.share.outputs.package-dir }}
```

### 3. Run

- Trigger manually from Actions tab, or by release event
- Download artifact `social-share-package`
- Post manually to LinkedIn using:
  - `caption.txt`
  - files in `media/`

### 4. Package Content

By default, the package is generated in `.social-share-output` and includes:

- `caption.txt`
- `manifest.json`
- `README.md`
- `media/*`

## Optional: Fully Automatic LinkedIn Publish

Use this mode only if you want API-based posting.

### 1. Configure Repository Secrets

Add these in Settings > Secrets and variables > Actions:

- `LINKEDIN_ACCESS_TOKEN`
- `LINKEDIN_AUTHOR_URN`

Notes:

- Publish identity is determined by `LINKEDIN_AUTHOR_URN`
- A LinkedIn profile URL (for example `https://www.linkedin.com/in/...`) is not an URN and cannot replace `LINKEDIN_AUTHOR_URN`

### 2. Use Auto Mode In Workflow

```yaml
- name: Publish directly to LinkedIn API
  uses: galihru/fenxiangnishicangku@v1
  with:
    publish-mode: auto
    platform: linkedin
    linkedin-access-token: ${{ secrets.LINKEDIN_ACCESS_TOKEN }}
    linkedin-author-urn: ${{ secrets.LINKEDIN_AUTHOR_URN }}
    linkedin-profile-url: "https://www.linkedin.com/in/your-profile/"
    caption-source: readme
    include-repo-link: "true"
    include-badges: "true"
    auto-media: "true"
    include-readme-images: "true"
    include-repo-media: "true"
    table-to-image: "true"
```

### 3. LinkedIn API Setup Flow (Mermaid)

```mermaid
flowchart TD
  A[Open LinkedIn Developer App] --> B[Enable posting permission w_member_social]
  B --> C[Generate Access Token]
  C --> D[Call v2 me endpoint]
  D --> E[Build author URN: urn:li:person:id]
  E --> F[Set GitHub Secrets]
  F --> G[Run workflow with publish-mode auto]
```

### 4. LinkedIn API Setup (Step-by-Step)

1. Open your LinkedIn app auth page: https://www.linkedin.com/developers/apps/233110166/auth
2. In app products/permissions, enable the permissions needed for posting (for example, `w_member_social`).
3. Generate an access token from your LinkedIn app.
4. Resolve your author URN:

```bash
curl -s -H "Authorization: Bearer YOUR_LINKEDIN_ACCESS_TOKEN" \
  https://api.linkedin.com/v2/me
```

Use the returned `id` to build:

```text
urn:li:person:<id>
```

5. Add secrets in GitHub repository Settings > Secrets and variables > Actions:
`LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_AUTHOR_URN`.
6. Run workflow with `publish-mode: auto`.

Important notes:

- `Client ID` and `Client Secret` are app credentials, not directly used as action inputs.
- `LINKEDIN_AUTHOR_URN` must be URN format, not profile URL.
- For individual users, keep using `publish-mode: manual` when API setup is not practical.

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `publish-mode` | no | `manual` | `manual` generates package without API call. `auto` publishes through API. |
| `platform` | no | `linkedin` | Target platform. Currently supports `linkedin`. |
| `linkedin-access-token` | conditional | - | Required when `publish-mode=auto` and `platform=linkedin`. |
| `linkedin-author-urn` | conditional | - | Required when `publish-mode=auto` and `platform=linkedin`. |
| `linkedin-profile-url` | no | empty | Optional profile link appended to caption for branding. |
| `caption-source` | no | `readme` | Caption source: `readme` or `custom`. |
| `custom-caption` | no | empty | Custom caption text. |
| `readme-path` | no | `README.md` | README path for parsing. |
| `include-repo-link` | no | `true` | Append repository URL to post. |
| `include-badges` | no | `true` | Extract and append badge target links. |
| `auto-media` | no | `true` | Enable automatic media discovery. |
| `include-readme-images` | no | `true` | Include media from README references. |
| `include-repo-media` | no | `true` | Include media from repository glob match. |
| `media-glob` | no | `**/*.{png,jpg,jpeg,gif,webp,mp4,mov,avi,webm,mkv}` | Media glob pattern. |
| `table-to-image` | no | `true` | Render Markdown tables to PNG. |
| `max-images` | no | `9` | Max image attachments per post. |
| `dry-run` | no | `false` | Preview only, do not publish. |
| `manual-output-dir` | no | `.social-share-output` | Output directory used in manual mode. |

## Outputs

| Output | Description |
|---|---|
| `mode` | Execution mode: `manual` or `auto` |
| `post-id` | Published post id (auto mode) |
| `post-urn` | Backward-compatible alias of `post-id` (auto mode) |
| `platform` | Platform used for publishing |
| `media-count` | Number of selected/uploaded media assets |
| `package-dir` | Absolute path to generated package directory (manual mode) |
| `caption-file` | Absolute path to generated caption file (manual mode) |
| `manifest-file` | Absolute path to generated manifest file (manual mode) |
| `media-files` | JSON array of copied media file paths (manual mode) |

## Content And Media Rules

- Image attachments are prioritized (up to 9)
- If no images exist, at most one video is posted
- Badge images are not uploaded as attachments; only target links are appended
- Markdown tables can be rendered into image attachments

## npm Module

This section is only for direct Node.js module usage. If used as GitHub Action (`uses: ...`), skip npm installation.

### Install

```bash
npm install fenxiangnishicangku
```

### Class API

```js
const {
  LinkedInPublisher,
  ReadmeAnalyzer,
  MarkdownTableRenderer,
  SocialMediaPublisher
} = require("fenxiangnishicangku");
```

Main classes:

- `SocialMediaPublisher`: abstract publisher contract
- `LinkedInPublisher`: LinkedIn publishing implementation
- `ReadmeAnalyzer`: README parser for caption, badges, media, and tables
- `MarkdownTableRenderer`: Markdown table renderer

## Troubleshooting

- Missing `post-id`: expected in manual mode; only auto mode creates platform post id
- Permission errors in auto mode: verify token scopes and URN type
- Missing attachments: verify `media-glob` and file extensions
- Caption mismatch: use `caption-source: custom` with `custom-caption`

## Setup Screenshots

Add screenshot files under [docs/screenshots/README.md](docs/screenshots/README.md) naming conventions, then they are rendered below.

### LinkedIn/API Tutorial Screenshots

![Actions secrets page](docs/screenshots/01-actions-secrets-page.svg)
![Actions secrets sidebar](docs/screenshots/02-actions-secrets-sidebar.svg)
![LinkedIn app credentials](docs/screenshots/03-linkedin-app-credentials.svg)
![Project logo](docs/screenshots/04-project-logo.svg)

## License

MIT
