const core = require("@actions/core");
const github = require("@actions/github");
const fs = require("node:fs/promises");
const path = require("node:path");
const fg = require("fast-glob");
const mime = require("mime-types");

const { ReadmeAnalyzer } = require("./lib/readme");
const { MarkdownTableRenderer } = require("./lib/tableRenderer");
const { LinkedInPublisher } = require("./lib/linkedin");

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return defaultValue;
}

function truncateCaption(caption, maxLength = 3000) {
  if (caption.length <= maxLength) {
    return caption;
  }

  const suffix = "\n\n...";
  return `${caption.slice(0, Math.max(0, maxLength - suffix.length))}${suffix}`;
}

function makeDefaultCaption(repoFullName) {
  return `New project update: ${repoFullName}.`;
}

function normalizeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function classifyMedia(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = mime.lookup(filePath) || "application/octet-stream";

  const imageExt = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"]);
  const videoExt = new Set([".mp4", ".mov", ".avi", ".webm", ".mkv"]);

  if (mimeType.startsWith("image/") || imageExt.has(ext)) {
    if (ext === ".svg") {
      return null;
    }

    return {
      kind: "image",
      mimeType: mimeType === "application/octet-stream" ? "image/png" : mimeType
    };
  }

  if (mimeType.startsWith("video/") || videoExt.has(ext)) {
    return {
      kind: "video",
      mimeType: mimeType === "application/octet-stream" ? "video/mp4" : mimeType
    };
  }

  return null;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function downloadRemoteMedia(url, tempDir, index) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Cannot download remote media ${url}, status ${response.status}`);
  }

  const contentTypeHeader = response.headers.get("content-type") || "application/octet-stream";
  const contentType = contentTypeHeader.split(";")[0].trim();

  let extension = mime.extension(contentType);
  if (!extension) {
    try {
      const urlPath = new URL(url).pathname;
      extension = path.extname(urlPath).replace(".", "");
    } catch {
      extension = "bin";
    }
  }

  const fileName = `readme-remote-${index}.${normalizeFileName(extension || "bin")}`;
  const targetPath = path.join(tempDir, fileName);
  const buffer = Buffer.from(await response.arrayBuffer());

  await fs.writeFile(targetPath, buffer);

  return targetPath;
}

function buildCaption({
  captionSource,
  customCaption,
  readmeCaption,
  includeRepoLink,
  repoUrl,
  profileUrl,
  includeBadges,
  badgeLinks,
  maxLength
}) {
  let caption = "";

  if (captionSource === "custom" && customCaption.trim()) {
    caption = customCaption.trim();
  } else {
    caption = readmeCaption.trim();
  }

  if (!caption) {
    caption = makeDefaultCaption(github.context.repo.repo || "repository");
  }

  if (includeRepoLink && repoUrl) {
    caption = `${caption}\n\nProject: ${repoUrl}`;
  }

  if (profileUrl && /^https?:\/\//i.test(profileUrl.trim())) {
    caption = `${caption}\n\nProfile: ${profileUrl.trim()}`;
  }

  if (includeBadges && badgeLinks.length > 0) {
    const lines = badgeLinks.map((url) => `- ${url}`).join("\n");
    caption = `${caption}\n\nBadge links:\n${lines}`;
  }

  return truncateCaption(caption, maxLength);
}

async function collectRepositoryMedia(mediaGlob) {
  const files = await fg(mediaGlob, {
    onlyFiles: true,
    unique: true,
    dot: false,
    ignore: [
      "**/.git/**",
      "**/.github/**",
      "**/node_modules/**",
      "**/.tmp-social-share/**"
    ]
  });

  return files.map((file) => path.resolve(process.cwd(), file));
}

async function collectReadmeMediaCandidates({ readmeMedia, tempDir }) {
  const output = [];

  let remoteIndex = 1;
  for (const item of readmeMedia) {
    if (/^https?:\/\//i.test(item.source)) {
      try {
        const downloaded = await downloadRemoteMedia(item.source, tempDir, remoteIndex);
        remoteIndex += 1;
        output.push(downloaded);
      } catch (error) {
        core.warning(`Skip remote media ${item.source}: ${error.message}`);
      }
      continue;
    }

    if (await fileExists(item.source)) {
      output.push(path.resolve(item.source));
    } else {
      core.warning(`README media not found: ${item.source}`);
    }
  }

  return output;
}

async function createManualPackage({
  manualOutputDir,
  platform,
  caption,
  selectedMedia,
  repoUrl
}) {
  const packageDir = path.resolve(manualOutputDir || ".social-share-output");
  const mediaDir = path.join(packageDir, "media");

  await fs.rm(packageDir, { recursive: true, force: true });
  await fs.mkdir(mediaDir, { recursive: true });

  const captionFile = path.join(packageDir, "caption.txt");
  await fs.writeFile(captionFile, `${caption}\n`, "utf8");

  const mediaFiles = [];
  for (let i = 0; i < selectedMedia.length; i += 1) {
    const mediaItem = selectedMedia[i];
    const originalName = path.basename(mediaItem.fileName || mediaItem.filePath || `media-${i + 1}`);
    const originalExt = path.extname(originalName);
    let extension = originalExt;

    if (!extension) {
      const guessedExt = mime.extension(mediaItem.mimeType || "");
      extension = guessedExt ? `.${guessedExt}` : "";
    }

    const baseName = originalExt ? path.basename(originalName, originalExt) : originalName;
    const safeBaseName = normalizeFileName(baseName) || `media-${i + 1}`;
    const targetName = `${String(i + 1).padStart(2, "0")}-${safeBaseName}${extension}`;
    const targetPath = path.join(mediaDir, targetName);

    await fs.copyFile(mediaItem.filePath, targetPath);

    mediaFiles.push({
      sourcePath: mediaItem.filePath,
      targetPath,
      relativePath: path.relative(packageDir, targetPath).replace(/\\/g, "/"),
      kind: mediaItem.kind,
      mimeType: mediaItem.mimeType
    });
  }

  const helperReadme = [
    "# Manual Social Share Package",
    "",
    "This folder is generated by fenxiangnishicangku in manual mode.",
    "",
    "## How to post",
    "",
    "1. Open caption.txt and copy its content.",
    "2. Create a new social media post manually.",
    "3. Paste the caption and upload files from media/.",
    "4. Keep file order if your platform shows a media sequence.",
    "",
    `Platform hint: ${platform}`,
    repoUrl ? `Repository: ${repoUrl}` : ""
  ].filter(Boolean).join("\n");

  const readmeFile = path.join(packageDir, "README.md");
  await fs.writeFile(readmeFile, `${helperReadme}\n`, "utf8");

  const manifest = {
    generatedAt: new Date().toISOString(),
    mode: "manual",
    platform,
    repository: repoUrl || "",
    captionFile,
    mediaCount: mediaFiles.length,
    mediaFiles
  };

  const manifestFile = path.join(packageDir, "manifest.json");
  await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2), "utf8");

  return {
    packageDir,
    captionFile,
    manifestFile,
    mediaFiles: mediaFiles.map((item) => item.targetPath)
  };
}

async function run() {
  const tempDir = path.join(process.cwd(), ".tmp-social-share");
  await fs.mkdir(tempDir, { recursive: true });

  try {
    const publishMode = (core.getInput("publish-mode") || "manual").trim().toLowerCase();
    if (!["manual", "auto"].includes(publishMode)) {
      throw new Error("Invalid publish-mode. Supported values are 'manual' and 'auto'.");
    }

    const platform = (core.getInput("platform") || "linkedin").trim().toLowerCase();
    if (platform !== "linkedin") {
      throw new Error(`Platform '${platform}' is not supported yet. Current platform: linkedin.`);
    }

    const captionSource = (core.getInput("caption-source") || "readme").trim().toLowerCase();
    const customCaption = core.getInput("custom-caption") || "";
    const linkedinProfileUrl = core.getInput("linkedin-profile-url") || "";
    const readmePath = core.getInput("readme-path") || "README.md";
    const manualOutputDir = core.getInput("manual-output-dir") || ".social-share-output";

    const includeRepoLink = parseBoolean(core.getInput("include-repo-link"), true);
    const includeBadges = parseBoolean(core.getInput("include-badges"), true);
    const autoMedia = parseBoolean(core.getInput("auto-media"), true);
    const includeReadmeImages = parseBoolean(core.getInput("include-readme-images"), true);
    const includeRepoMedia = parseBoolean(core.getInput("include-repo-media"), true);
    const tableToImage = parseBoolean(core.getInput("table-to-image"), true);
    const dryRun = parseBoolean(core.getInput("dry-run"), false);

    const maxImagesInput = Number.parseInt(core.getInput("max-images") || "9", 10);
    const maxImages = Number.isNaN(maxImagesInput) ? 9 : Math.max(1, Math.min(9, maxImagesInput));

    const mediaGlob = core.getInput("media-glob") || "**/*.{png,jpg,jpeg,gif,webp,mp4,mov,avi,webm,mkv}";
    const readmeAnalyzer = new ReadmeAnalyzer({ readmePath: path.resolve(readmePath) });
    const tableRenderer = new MarkdownTableRenderer();

    const readmeContent = await readmeAnalyzer.readIfExists();
    const readmeCaption = readmeContent ? readmeAnalyzer.extractCaption(readmeContent) : "";
    const badgeLinks = includeBadges && readmeContent ? readmeAnalyzer.extractBadgeLinks(readmeContent) : [];

    const fallbackRepoUrl = github.context.repo.owner && github.context.repo.repo
      ? `https://github.com/${github.context.repo.owner}/${github.context.repo.repo}`
      : "";
    const repoUrl = github.context.payload?.repository?.html_url || fallbackRepoUrl;

    const caption = buildCaption({
      captionSource,
      customCaption,
      readmeCaption,
      includeRepoLink,
      repoUrl,
      profileUrl: linkedinProfileUrl,
      includeBadges,
      badgeLinks,
      maxLength: 3000
    });

    const mediaCandidates = [];

    if (autoMedia) {
      if (includeReadmeImages && readmeContent) {
        const readmeMedia = readmeAnalyzer.extractMedia(readmeContent);
        const readmeMediaFiles = await collectReadmeMediaCandidates({ readmeMedia, tempDir });
        mediaCandidates.push(...readmeMediaFiles);
      }

      if (includeRepoMedia) {
        const repoMediaFiles = await collectRepositoryMedia(mediaGlob);
        mediaCandidates.push(...repoMediaFiles);
      }

      if (tableToImage && readmeContent) {
        const tables = readmeAnalyzer.extractMarkdownTables(readmeContent);
        if (tables.length > 0) {
          const tableImages = await tableRenderer.renderTablesToImages(tables, tempDir, "readme");
          mediaCandidates.push(...tableImages);
          core.info(`Rendered ${tableImages.length} README table(s) to image.`);
        }
      }
    }

    const uniqueMedia = [...new Set(mediaCandidates.map((value) => path.resolve(value)))];

    const images = [];
    const videos = [];

    for (const mediaPath of uniqueMedia) {
      const parsed = classifyMedia(mediaPath);
      if (!parsed) {
        continue;
      }

      const fileName = path.basename(mediaPath);
      const item = {
        filePath: mediaPath,
        fileName,
        kind: parsed.kind,
        mimeType: parsed.mimeType
      };

      if (item.kind === "image") {
        images.push(item);
      } else if (item.kind === "video") {
        videos.push(item);
      }
    }

    let selectedMedia = [];
    if (images.length > 0) {
      selectedMedia = images.slice(0, maxImages);
      if (videos.length > 0) {
        core.warning("Image attachments detected, so video files are skipped for this post.");
      }
    } else if (videos.length > 0) {
      selectedMedia = [videos[0]];
      if (videos.length > 1) {
        core.warning("LinkedIn post supports one video per post, additional videos are skipped.");
      }
    }

    core.info(`Caption length: ${caption.length}`);
    core.info(`Selected media files: ${selectedMedia.length}`);

    if (publishMode === "manual") {
      if (dryRun) {
        core.info("dry-run is ignored in manual mode because no API call is made.");
      }

      const manualPackage = await createManualPackage({
        manualOutputDir,
        platform,
        caption,
        selectedMedia,
        repoUrl
      });

      core.info(`Manual share package created: ${manualPackage.packageDir}`);
      core.setOutput("post-urn", "");
      core.setOutput("post-id", "");
      core.setOutput("platform", platform);
      core.setOutput("media-count", String(selectedMedia.length));
      core.setOutput("mode", "manual");
      core.setOutput("package-dir", manualPackage.packageDir);
      core.setOutput("caption-file", manualPackage.captionFile);
      core.setOutput("manifest-file", manualPackage.manifestFile);
      core.setOutput("media-files", JSON.stringify(manualPackage.mediaFiles));
      return;
    }

    if (dryRun) {
      core.info("Dry run mode enabled. No LinkedIn API calls will be sent.");
      core.info(`Caption preview:\n${caption}`);
      if (selectedMedia.length > 0) {
        for (const mediaItem of selectedMedia) {
          core.info(`Media: ${mediaItem.filePath} (${mediaItem.kind})`);
        }
      }

      core.setOutput("post-urn", "");
      core.setOutput("post-id", "");
      core.setOutput("platform", platform);
      core.setOutput("media-count", String(selectedMedia.length));
      core.setOutput("mode", "auto");
      core.setOutput("package-dir", "");
      core.setOutput("caption-file", "");
      core.setOutput("manifest-file", "");
      core.setOutput("media-files", "[]");
      return;
    }

    const linkedinAccessToken = core.getInput("linkedin-access-token");
    const linkedinAuthorUrn = core.getInput("linkedin-author-urn");

    if (!linkedinAccessToken || !linkedinAccessToken.trim() || !linkedinAuthorUrn || !linkedinAuthorUrn.trim()) {
      throw new Error(
        "LinkedIn credentials are required when publish-mode=auto. Use publish-mode=manual for no-API individual workflow."
      );
    }

    const publisher = new LinkedInPublisher({
      accessToken: linkedinAccessToken,
      authorUrn: linkedinAuthorUrn
    });

    for (const mediaItem of selectedMedia) {
      core.info(`Uploading media: ${mediaItem.fileName}`);
    }

    const postResult = await publisher.publish({
      caption,
      mediaAssets: selectedMedia
    });

    core.info(`Post created on ${platform}: ${postResult.postId || "(id not returned)"}`);
    core.setOutput("post-urn", postResult.postId || "");
    core.setOutput("post-id", postResult.postId || "");
    core.setOutput("platform", platform);
    core.setOutput("media-count", String(postResult.uploadedAssets.length));
    core.setOutput("mode", "auto");
    core.setOutput("package-dir", "");
    core.setOutput("caption-file", "");
    core.setOutput("manifest-file", "");
    core.setOutput("media-files", "[]");
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

run().catch((error) => {
  core.setFailed(error.message);
});
