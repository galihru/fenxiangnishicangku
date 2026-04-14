# 分享你是仓库

[English](README.en.md)

面向全球开发者的 GitHub Action 与 npm 模块，用于将 GitHub 仓库内容自动发布到社交媒体。

## 功能概览

- 从 `README` 或自定义文本生成帖子文案
- 自动提取 README 与仓库中的图片/视频附件
- 将 Markdown 表格渲染为 PNG，适配社交平台展示
- 支持 Badge 链接提取与仓库链接品牌展示
- 采用 Class 架构，便于扩展到更多平台

## 平台支持

- 当前：LinkedIn

## 快速开始（GitHub Action）

### 1. 前置条件

- 仓库已启用 GitHub Actions
- 拥有 LinkedIn 开发者应用和可用访问令牌
- 令牌具备发布权限（通常需要 `w_member_social`）
- 已知发布主体 URN（`urn:li:person:*` 或 `urn:li:organization:*`）
- 如需在帖子末尾附加个人主页链接，可选提供 `linkedin-profile-url`
- 使用 GitHub Action 时，消费方仓库无需执行 `npm install`（Action 运行前会自动安装自身运行依赖）

### 2. 配置仓库 Secrets

在仓库 Settings > Secrets and variables > Actions 中添加：

- `LINKEDIN_ACCESS_TOKEN`
- `LINKEDIN_AUTHOR_URN`

说明：

- 发布身份由 `LINKEDIN_AUTHOR_URN` 决定
- LinkedIn 个人主页 URL（例如 `https://www.linkedin.com/in/...`）不是 URN，不能替代 `LINKEDIN_AUTHOR_URN`

### 3. 添加工作流

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

### 4. 执行

- 手动触发：Actions > Share Project Update > Run workflow
- 自动触发：发布 Release 后自动执行

## 输入参数

| 参数 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `platform` | 否 | `linkedin` | 目标平台；当前支持 `linkedin`。 |
| `linkedin-access-token` | 条件必填 | - | LinkedIn OAuth 令牌（`platform=linkedin` 时必填）。 |
| `linkedin-author-urn` | 条件必填 | - | LinkedIn 作者 URN（`urn:li:person:*` / `urn:li:organization:*`）。 |
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

## 输出参数

| 输出 | 说明 |
|---|---|
| `post-id` | 目标平台返回的帖子 ID |
| `post-urn` | `post-id` 的兼容别名 |
| `platform` | 实际发布平台 |
| `media-count` | 实际上传媒体数量 |

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

- 发布失败且提示权限错误：检查令牌权限和 URN 类型是否匹配
- 无附件上传：检查 `media-glob` 与仓库文件后缀是否匹配
- 文案不符合预期：改用 `caption-source: custom` 与 `custom-caption`

## 配置截图

截图文件统一放在 [docs/screenshots/README.md](docs/screenshots/README.md) 约定的路径与命名中，文档可持续追加。

## 许可证

MIT
