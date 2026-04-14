const fs = require("node:fs/promises");
const path = require("node:path");

function stripCodeFences(markdown) {
  return markdown.replace(/```[\s\S]*?```/g, "");
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(value);
}

function normalizeAssetPath(rawValue) {
  const withoutQuery = rawValue.split("?")[0];
  return withoutQuery.split("#")[0];
}

function splitTableLine(line) {
  let value = line.trim();
  if (!value.includes("|")) {
    return [];
  }

  if (value.startsWith("|")) {
    value = value.slice(1);
  }

  if (value.endsWith("|")) {
    value = value.slice(0, -1);
  }

  return value.split("|").map((cell) => cell.trim());
}

function isBadgeImage(altText, imageUrl) {
  const text = `${altText} ${imageUrl}`.toLowerCase();
  const badgeHosts = [
    "img.shields.io",
    "shields.io",
    "badgen.net",
    "badge.fury.io"
  ];

  if (badgeHosts.some((host) => text.includes(host))) {
    return true;
  }

  const badgeKeywords = [
    "badge",
    "build",
    "ci",
    "coverage",
    "npm",
    "pypi",
    "discord",
    "license",
    "version",
    "status"
  ];

  return badgeKeywords.some((keyword) => text.includes(keyword));
}

function sanitizeText(input) {
  return input
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function extractCaptionFromReadme(markdown) {
  const cleanMarkdown = stripCodeFences(markdown);
  const lines = cleanMarkdown.split(/\r?\n/);

  let title = "";
  for (const line of lines) {
    const match = line.match(/^#\s+(.+)/);
    if (match) {
      title = match[1].trim();
      break;
    }
  }

  const blocks = cleanMarkdown
    .split(/\n\s*\n/g)
    .map((block) => sanitizeText(block))
    .filter(Boolean)
    .filter((block) => {
      if (block.startsWith("#")) {
        return false;
      }
      if (block.startsWith(">")) {
        return false;
      }
      if (block.startsWith("|")) {
        return false;
      }
      if (block.startsWith("- ") || block.startsWith("* ")) {
        return false;
      }
      return block.length > 25;
    });

  const firstParagraph = blocks[0] || "";
  const parts = [];

  if (title) {
    parts.push(title);
  }

  if (firstParagraph && firstParagraph !== title) {
    parts.push(firstParagraph);
  }

  return parts.join("\n\n").trim();
}

function extractBadgeLinks(markdown) {
  const links = new Set();
  const linkedImageRegex = /\[!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)\]\(([^)\s]+)\)/g;

  let match = linkedImageRegex.exec(markdown);
  while (match) {
    const alt = match[1] || "";
    const imageUrl = normalizeAssetPath(match[2] || "");
    const targetUrl = match[3] || "";

    if (isBadgeImage(alt, imageUrl) && /^https?:\/\//i.test(targetUrl)) {
      links.add(targetUrl);
    }

    match = linkedImageRegex.exec(markdown);
  }

  return [...links];
}

function extractReadmeMedia(markdown, readmePath) {
  const media = [];
  const seen = new Set();
  const readmeDir = path.dirname(path.resolve(readmePath));

  const imageRegex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let imageMatch = imageRegex.exec(markdown);
  while (imageMatch) {
    const altText = imageMatch[1] || "";
    const rawSource = normalizeAssetPath(imageMatch[2] || "");

    if (rawSource && !isBadgeImage(altText, rawSource)) {
      let source;
      if (isHttpUrl(rawSource)) {
        source = rawSource;
      } else if (rawSource.startsWith("/")) {
        source = path.join(process.cwd(), rawSource.slice(1));
      } else {
        source = path.resolve(readmeDir, rawSource);
      }

      if (!seen.has(source)) {
        seen.add(source);
        media.push({
          source,
          origin: "readme"
        });
      }
    }

    imageMatch = imageRegex.exec(markdown);
  }

  const htmlImageRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let htmlImageMatch = htmlImageRegex.exec(markdown);
  while (htmlImageMatch) {
    const rawSource = normalizeAssetPath(htmlImageMatch[1] || "");
    if (!rawSource) {
      htmlImageMatch = htmlImageRegex.exec(markdown);
      continue;
    }

    let source;
    if (isHttpUrl(rawSource)) {
      source = rawSource;
    } else if (rawSource.startsWith("/")) {
      source = path.join(process.cwd(), rawSource.slice(1));
    } else {
      source = path.resolve(readmeDir, rawSource);
    }

    if (!seen.has(source)) {
      seen.add(source);
      media.push({
        source,
        origin: "readme"
      });
    }

    htmlImageMatch = htmlImageRegex.exec(markdown);
  }

  const htmlVideoRegex = /<video[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let htmlVideoMatch = htmlVideoRegex.exec(markdown);
  while (htmlVideoMatch) {
    const rawSource = normalizeAssetPath(htmlVideoMatch[1] || "");
    if (!rawSource) {
      htmlVideoMatch = htmlVideoRegex.exec(markdown);
      continue;
    }

    let source;
    if (isHttpUrl(rawSource)) {
      source = rawSource;
    } else if (rawSource.startsWith("/")) {
      source = path.join(process.cwd(), rawSource.slice(1));
    } else {
      source = path.resolve(readmeDir, rawSource);
    }

    if (!seen.has(source)) {
      seen.add(source);
      media.push({
        source,
        origin: "readme"
      });
    }

    htmlVideoMatch = htmlVideoRegex.exec(markdown);
  }

  return media;
}

function extractMarkdownTables(markdown) {
  const cleanMarkdown = stripCodeFences(markdown);
  const lines = cleanMarkdown.split(/\r?\n/);
  const tables = [];

  for (let i = 0; i < lines.length - 1; i += 1) {
    const headerLine = lines[i];
    const separatorLine = lines[i + 1];

    if (!headerLine.includes("|") || !separatorLine.includes("|")) {
      continue;
    }

    if (!/^\s*[:\-\|\s]+\s*$/.test(separatorLine) || !separatorLine.includes("-")) {
      continue;
    }

    const header = splitTableLine(headerLine);
    if (header.length < 2) {
      continue;
    }

    const rows = [];
    let j = i + 2;
    while (j < lines.length) {
      const rowLine = lines[j];
      if (!rowLine.trim() || !rowLine.includes("|")) {
        break;
      }
      rows.push(splitTableLine(rowLine));
      j += 1;
    }

    if (rows.length === 0) {
      continue;
    }

    const columnCount = Math.max(header.length, ...rows.map((row) => row.length));
    const normalizedHeader = [...header];
    while (normalizedHeader.length < columnCount) {
      normalizedHeader.push("");
    }

    const normalizedRows = rows.map((row) => {
      const normalizedRow = [...row];
      while (normalizedRow.length < columnCount) {
        normalizedRow.push("");
      }
      return normalizedRow;
    });

    tables.push({
      index: tables.length + 1,
      header: normalizedHeader,
      rows: normalizedRows
    });

    i = j;
  }

  return tables;
}

async function readReadmeIfExists(readmePath) {
  try {
    const content = await fs.readFile(readmePath, "utf8");
    return content;
  } catch {
    return "";
  }
}

class ReadmeAnalyzer {
  constructor({ readmePath }) {
    this.readmePath = path.resolve(readmePath || "README.md");
  }

  async readIfExists() {
    return readReadmeIfExists(this.readmePath);
  }

  extractCaption(markdown) {
    return extractCaptionFromReadme(markdown || "");
  }

  extractBadgeLinks(markdown) {
    return extractBadgeLinks(markdown || "");
  }

  extractMedia(markdown) {
    return extractReadmeMedia(markdown || "", this.readmePath);
  }

  extractMarkdownTables(markdown) {
    return extractMarkdownTables(markdown || "");
  }
}

module.exports = {
  ReadmeAnalyzer,
  extractBadgeLinks,
  extractCaptionFromReadme,
  extractMarkdownTables,
  extractReadmeMedia,
  readReadmeIfExists
};
