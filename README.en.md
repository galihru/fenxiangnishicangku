# Fenxiangnishicangku

[中文文档](README.md)

Fenxiangnishicangku is a GitHub Action and npm module for publishing repository updates to social media.

## Features

- Build post captions from `README` or custom text
- Discover media from README references and repository files
- Convert Markdown tables into PNG attachments
- Extract badge target links for contextual captions
- Use class-based architecture for future provider expansion

## Supported Platform

- Current: LinkedIn

## Quick Start (GitHub Action)

### 1. Prerequisites

- GitHub Actions enabled in your repository
- A LinkedIn developer app with a valid access token
- Posting permission on the token (commonly `w_member_social`)
- Author URN (`urn:li:person:*` or `urn:li:organization:*`)
- Optional profile URL via `linkedin-profile-url` for branding link in caption
- No package installation required in the consumer repository (the action installs its own runtime dependencies automatically)

### 2. Configure Repository Secrets

Add these in Settings > Secrets and variables > Actions:

- `LINKEDIN_ACCESS_TOKEN`
- `LINKEDIN_AUTHOR_URN`

Notes:

- Publish identity is determined by `LINKEDIN_AUTHOR_URN`
- A LinkedIn profile URL (for example `https://www.linkedin.com/in/...`) is not an URN and cannot replace `LINKEDIN_AUTHOR_URN`

### 3. Add Workflow

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

      - name: Publish to Social Media
        uses: galihru/fenxiangnishicangku@v1
        with:
          platform: linkedin
          linkedin-access-token: ${{ secrets.LINKEDIN_ACCESS_TOKEN }}
          linkedin-author-urn: ${{ secrets.LINKEDIN_AUTHOR_URN }}
          linkedin-profile-url: "https://www.linkedin.com/in/galih-ridho-utomo-2493492b0/"
          caption-source: readme
          include-repo-link: "true"
          include-badges: "true"
          auto-media: "true"
          include-readme-images: "true"
          include-repo-media: "true"
          table-to-image: "true"
```

### 4. Run

- Manual run from the Actions tab
- Automatic run on Release publish event

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `platform` | no | `linkedin` | Target platform. Currently supports `linkedin`. |
| `linkedin-access-token` | conditional | - | LinkedIn OAuth token (`platform=linkedin`). |
| `linkedin-author-urn` | conditional | - | LinkedIn author URN (`urn:li:person:*` / `urn:li:organization:*`). |
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

## Outputs

| Output | Description |
|---|---|
| `post-id` | Published post id |
| `post-urn` | Backward-compatible alias of `post-id` |
| `platform` | Platform used for publishing |
| `media-count` | Number of uploaded media assets |

## Content And Media Rules

- Image attachments are prioritized (up to 9)
- If no images exist, at most one video is posted
- Badge images are not uploaded as attachments; only target links are appended
- Markdown tables can be rendered into image attachments

## npm Module

This section is only for direct Node.js module usage. If the project is used as a GitHub Action (`uses: ...`), skip npm installation.

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

- Permission errors: verify token scopes and URN type
- Missing attachments: verify `media-glob` and file extensions
- Caption mismatch: use `caption-source: custom` with `custom-caption`

## Setup Screenshots

Screenshot assets can be added incrementally under [docs/screenshots/README.md](docs/screenshots/README.md) naming conventions.

## License

MIT
