/**
 * lighthouse-report.mjs
 *
 * Reads Lighthouse CI JSON results and generates a structured
 * machine-readable Markdown report optimized for AI consumption.
 *
 * Output: lighthouse-report.md (root of repo)
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const LHCI_DIR = ".lighthouseci";

function findJsonReports(dir) {
  try {
    return readdirSync(dir)
      .filter((f) => f.startsWith("lhr-") && f.endsWith(".json"))
      .map((f) => join(dir, f));
  } catch {
    return [];
  }
}

function scoreEmoji(score) {
  if (score >= 0.9) return "HIGH";
  if (score >= 0.5) return "MEDIUM";
  return "LOW";
}

function toPercent(score) {
  return Math.round(score * 100);
}

function buildReport(reports) {
  const runs = reports.map((path) => JSON.parse(readFileSync(path, "utf8")));

  // Average scores across runs
  const categories = [
    "performance",
    "accessibility",
    "best-practices",
    "seo",
  ];

  const avg = {};
  for (const cat of categories) {
    const scores = runs
      .map((r) => r.categories?.[cat]?.score)
      .filter((s) => s != null);
    avg[cat] = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  }

  // Extract key metrics from last run
  const last = runs[runs.length - 1];
  const audits = last.audits || {};

  const metrics = [
    { key: "first-contentful-paint", label: "First Contentful Paint (FCP)" },
    { key: "largest-contentful-paint", label: "Largest Contentful Paint (LCP)" },
    { key: "total-blocking-time", label: "Total Blocking Time (TBT)" },
    { key: "cumulative-layout-shift", label: "Cumulative Layout Shift (CLS)" },
    { key: "speed-index", label: "Speed Index" },
    { key: "interactive", label: "Time to Interactive (TTI)" },
  ];

  // Build MD
  const lines = [];

  lines.push("# Lighthouse Audit Report");
  lines.push("");
  lines.push("<!-- MACHINE_READABLE: true -->");
  lines.push("<!-- FORMAT: structured-metrics -->");
  lines.push(`<!-- TIMESTAMP: ${new Date().toISOString()} -->`);
  lines.push(`<!-- RUNS: ${runs.length} -->`);
  lines.push(`<!-- URL: ${last.finalDisplayedUrl || last.requestedUrl || "static"} -->`);
  lines.push("");

  // --- SCORES TABLE ---
  lines.push("## Scores");
  lines.push("");
  lines.push("| Category | Score | Rating |");
  lines.push("|----------|-------|--------|");
  for (const cat of categories) {
    const s = avg[cat];
    if (s == null) continue;
    lines.push(`| ${cat} | ${toPercent(s)} | ${scoreEmoji(s)} |`);
  }
  lines.push("");

  // --- METRICS TABLE ---
  lines.push("## Core Web Vitals & Metrics");
  lines.push("");
  lines.push("| Metric | Value | Score |");
  lines.push("|--------|-------|-------|");
  for (const m of metrics) {
    const audit = audits[m.key];
    if (!audit) continue;
    const val = audit.displayValue || audit.numericValue || "N/A";
    const s = audit.score != null ? `${toPercent(audit.score)} (${scoreEmoji(audit.score)})` : "N/A";
    lines.push(`| ${m.label} | ${val} | ${s} |`);
  }
  lines.push("");

  // --- FAILED AUDITS ---
  const failed = Object.values(audits).filter(
    (a) => a.score != null && a.score < 0.9 && a.details?.type !== "debugdata"
  );

  if (failed.length > 0) {
    lines.push("## Improvement Opportunities");
    lines.push("");
    lines.push("| Audit | Score | Impact | Description |");
    lines.push("|-------|-------|--------|-------------|");

    const sorted = failed
      .sort((a, b) => (a.score ?? 1) - (b.score ?? 1))
      .slice(0, 20);

    for (const audit of sorted) {
      const desc = (audit.description || "").replace(/\[.*?\]\(.*?\)/g, "").replace(/\|/g, "-").trim();
      const shortDesc = desc.length > 120 ? desc.slice(0, 117) + "..." : desc;
      lines.push(
        `| ${audit.title || audit.id} | ${toPercent(audit.score)} | ${scoreEmoji(audit.score)} | ${shortDesc} |`
      );
    }
    lines.push("");
  }

  // --- STRUCTURED DATA BLOCK (for AI parsing) ---
  lines.push("## Raw Data (JSON)");
  lines.push("");
  lines.push("```json");
  lines.push(
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        runs: runs.length,
        url: last.finalDisplayedUrl || last.requestedUrl || "static",
        scores: Object.fromEntries(
          categories.map((c) => [c, avg[c] != null ? toPercent(avg[c]) : null])
        ),
        metrics: Object.fromEntries(
          metrics
            .filter((m) => audits[m.key])
            .map((m) => [
              m.key,
              {
                value: audits[m.key].numericValue ?? null,
                unit: audits[m.key].numericUnit ?? null,
                score: audits[m.key].score != null ? toPercent(audits[m.key].score) : null,
              },
            ])
        ),
      },
      null,
      2
    )
  );
  lines.push("```");
  lines.push("");

  return lines.join("\n");
}

// --- Main ---
const jsonFiles = findJsonReports(LHCI_DIR);
if (jsonFiles.length === 0) {
  console.error("No Lighthouse JSON reports found in", LHCI_DIR);
  process.exit(1);
}

const md = buildReport(jsonFiles);
writeFileSync("lighthouse-report.md", md);
console.log(`Report generated: lighthouse-report.md (${jsonFiles.length} run(s))`);
