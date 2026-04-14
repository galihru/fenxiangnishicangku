const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function estimateWidth(text, fontSize) {
  return Math.ceil((text || "").length * fontSize * 0.62);
}

function buildTableSvg(table) {
  const fontSize = 16;
  const rowHeight = 42;
  const cellPaddingX = 14;
  const borderColor = "#D1D5DB";
  const textColor = "#111827";
  const headerFill = "#F3F4F6";
  const bodyFill = "#FFFFFF";

  const allRows = [table.header, ...table.rows];
  const columnCount = table.header.length;

  const columnWidths = [];
  for (let colIndex = 0; colIndex < columnCount; colIndex += 1) {
    const widestCell = allRows.reduce((currentMax, row) => {
      const value = row[colIndex] || "";
      return Math.max(currentMax, estimateWidth(value, fontSize));
    }, 0);

    columnWidths.push(Math.max(140, widestCell + cellPaddingX * 2));
  }

  const width = columnWidths.reduce((acc, value) => acc + value, 0) + 1;
  const height = rowHeight * allRows.length + 1;

  let x = 0;
  const headerCells = [];
  for (let colIndex = 0; colIndex < columnCount; colIndex += 1) {
    headerCells.push(
      `<rect x="${x}" y="0" width="${columnWidths[colIndex]}" height="${rowHeight}" fill="${headerFill}" stroke="${borderColor}"/>`
    );

    headerCells.push(
      `<text x="${x + cellPaddingX}" y="${Math.round(rowHeight / 2 + fontSize / 3)}" font-family="Segoe UI, Arial, sans-serif" font-size="${fontSize}" fill="${textColor}" font-weight="600">${escapeXml(table.header[colIndex] || "")}</text>`
    );

    x += columnWidths[colIndex];
  }

  const bodyCells = [];
  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex += 1) {
    const rowY = (rowIndex + 1) * rowHeight;
    let colX = 0;

    for (let colIndex = 0; colIndex < columnCount; colIndex += 1) {
      bodyCells.push(
        `<rect x="${colX}" y="${rowY}" width="${columnWidths[colIndex]}" height="${rowHeight}" fill="${bodyFill}" stroke="${borderColor}"/>`
      );

      bodyCells.push(
        `<text x="${colX + cellPaddingX}" y="${rowY + Math.round(rowHeight / 2 + fontSize / 3)}" font-family="Segoe UI, Arial, sans-serif" font-size="${fontSize}" fill="${textColor}">${escapeXml(table.rows[rowIndex][colIndex] || "")}</text>`
      );

      colX += columnWidths[colIndex];
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#FFFFFF"/>
  ${headerCells.join("\n  ")}
  ${bodyCells.join("\n  ")}
</svg>`;
}

async function renderTableToPng(table, outputPath) {
  const svg = buildTableSvg(table);
  const inputBuffer = Buffer.from(svg, "utf8");
  await sharp(inputBuffer).png({ quality: 92 }).toFile(outputPath);
  return outputPath;
}

async function renderTablesToImages(tables, outputDir, prefix = "readme") {
  await fs.mkdir(outputDir, { recursive: true });

  const outputFiles = [];
  for (const table of tables) {
    const outputPath = path.join(outputDir, `${prefix}-table-${table.index}.png`);
    await renderTableToPng(table, outputPath);
    outputFiles.push(outputPath);
  }

  return outputFiles;
}

class MarkdownTableRenderer {
  async renderTablesToImages(tables, outputDir, prefix = "readme") {
    return renderTablesToImages(tables, outputDir, prefix);
  }
}

module.exports = {
  MarkdownTableRenderer,
  renderTablesToImages
};
