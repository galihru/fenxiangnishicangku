# 分享你是仓库

[English](README.en.md)

面向全球开发者的 GitHub Action 与 npm 模块，用于把 GitHub 仓库更新分享到社交媒体。

默认模式对个人开发者友好：不需要 API，即可生成“可直接手动发帖”的素材包。

## 功能概览

- 从 `README` 或自定义文本生成帖子文案
- 自动提取 README 与仓库中的图片/视频附件
- 将 Markdown 表格渲染为 PNG，适配社交平台展示
- 支持 Badge 链接提取与仓库链接品牌展示
- 支持手动发布素材包（caption + media）自动生成
- 采用 Class 架构，便于扩展到更多平台

## 平台支持

- 当前：LinkedIn

## 使用模式

- `manual`（默认）：不调用平台 API，生成手动发布素材包
- `auto`：通过平台 API 直接发布（LinkedIn 需要 token + author URN）

## 快速开始（无需 API，个人用户优先）

### 1. 前置条件

- 仓库已启用 GitHub Actions
- 不需要 LinkedIn 开发者应用
- 不需要配置仓库 Secrets

### 2. 添加工作流

在仓库中创建 `.github/workflows/share.yml`：

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

### 3. 执行

- 在 Actions 中手动触发，或通过 release 事件自动触发
- 下载 `social-share-package` artifact
- 手动发帖时使用：
  - `caption.txt`
  - `media/` 目录中的文件

### 4. 输出目录

默认输出目录 `.social-share-output`，包含：

- `caption.txt`
- `manifest.json`
- `README.md`
- `media/*`

## 可选：LinkedIn API 全自动发布

如果你确实需要“直接自动发到 LinkedIn”，再启用此模式。

### 1. 配置仓库 Secrets

在仓库 Settings > Secrets and variables > Actions 中添加：

- `LINKEDIN_ACCESS_TOKEN`
- `LINKEDIN_AUTHOR_URN`

说明：

- 发布身份由 `LINKEDIN_AUTHOR_URN` 决定
- LinkedIn 个人主页 URL（例如 `https://www.linkedin.com/in/...`）不是 URN，不能替代 `LINKEDIN_AUTHOR_URN`

### 2. 工作流中启用自动模式

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

## 输入参数

| 参数 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `publish-mode` | 否 | `manual` | `manual` 仅生成素材包；`auto` 通过 API 直接发布。 |
| `platform` | 否 | `linkedin` | 目标平台；当前支持 `linkedin`。 |
| `linkedin-access-token` | 条件必填 | - | 当 `publish-mode=auto` 且 `platform=linkedin` 时必填。 |
| `linkedin-author-urn` | 条件必填 | - | 当 `publish-mode=auto` 且 `platform=linkedin` 时必填。 |
| `linkedin-profile-url` | 否 | 空 | 可选品牌链接，追加到帖子文案中。 |
| `caption-source` | 否 | `readme` | 文案来源：`readme` 或 `custom`。 |
| `custom-caption` | 否 | 空 | 自定义文案。 |
| `readme-path` | 否 | `README.md` | README 文件路径。 |
| `include-repo-link` | 否 | `true` | 是否追加仓库链接。 |
| `include-badges` | 否 | `true` | 是否提取并追加 badge 目标链接。 |
| `auto-media` | 否 | `true` | 是否自动收集媒体附件。 |
| `include-readme-images` | 否 | `true` | 是否收集 README 中媒体。 |
| `include-repo-media` | 否 | `true` | 是否收集仓库中的媒体文件。 |
| `media-glob` | 否 | `**/*.{png,jpg,jpeg,gif,webp,mp4,mov,avi,webm,mkv}` | 媒体匹配规则。 |
| `table-to-image` | 否 | `true` | 是否将 Markdown 表格转为 PNG。 |
| `max-images` | 否 | `9` | 单帖最大图片数量。 |
| `dry-run` | 否 | `false` | 仅预览，不实际发布。 |
| `manual-output-dir` | 否 | `.social-share-output` | manual 模式素材包输出目录。 |

## 输出参数

| 输出 | 说明 |
|---|---|
| `mode` | 执行模式：`manual` 或 `auto` |
| `post-id` | 目标平台返回的帖子 ID（auto 模式） |
| `post-urn` | `post-id` 的兼容别名（auto 模式） |
| `platform` | 实际发布平台 |
| `media-count` | 实际选择/上传的媒体数量 |
| `package-dir` | 素材包目录绝对路径（manual 模式） |
| `caption-file` | 文案文件绝对路径（manual 模式） |
| `manifest-file` | 清单文件绝对路径（manual 模式） |
| `media-files` | 复制后媒体文件路径 JSON 数组（manual 模式） |

## 附件与内容策略

- 优先使用图片附件（最多 9 张）
- 当无图片时，视频附件最多 1 个
- README 中的徽章图不会作为附件上传，仅提取其目标链接
- README 表格可自动转换为图片附件

## npm 模块安装与使用

本节仅适用于“直接在 Node.js 项目中作为模块调用”。

若通过 GitHub Action 方式使用（`uses: ...`），无需在业务仓库安装 npm 包。

### 安装

```bash
npm install fenxiangnishicangku
```

### 使用（Class API）

```js
const {
  LinkedInPublisher,
  ReadmeAnalyzer,
  MarkdownTableRenderer,
  SocialMediaPublisher
} = require("fenxiangnishicangku");
```

主要类：

- `SocialMediaPublisher`：发布器抽象基类
- `LinkedInPublisher`：LinkedIn 平台发布实现
- `ReadmeAnalyzer`：README 解析器（文案、徽章、媒体、表格）
- `MarkdownTableRenderer`：Markdown 表格渲染器

## 常见问题

- 没有 `post-id`：manual 模式正常现象，只有 auto 模式会返回平台帖子 ID
- 发布失败且提示权限错误（auto 模式）：检查令牌权限和 URN 类型是否匹配
- 无附件上传：检查 `media-glob` 与仓库文件后缀是否匹配
- 文案不符合预期：改用 `caption-source: custom` 与 `custom-caption`

## 配置截图

截图文件统一放在 [docs/screenshots/README.md](docs/screenshots/README.md) 约定的路径与命名中，文档可持续追加。

## 许可证

MIT
