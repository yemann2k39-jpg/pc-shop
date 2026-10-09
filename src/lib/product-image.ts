import "server-only";

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { categoryIllustration, ILLUSTRATION_ATTRS } from "@/lib/illustrations";
import { FALLBACK_CATEGORY, getCategory } from "@/lib/catalog";

/**
 * Server-side generator for product placeholder images: the same line-art
 * SVGs the seeder produces, available to the admin product editor. The
 * accent color can be overridden per product for visual variety.
 */

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function productSvg(
  categorySlug: string,
  brand: string,
  model: string,
  accentOverride?: string,
): string {
  const category = getCategory(categorySlug) ?? FALLBACK_CATEGORY;
  const accent = accentOverride || category.accent;
  const illustration = categoryIllustration(categorySlug, accent) ?? "";
  // Truncate long model names so they fit the fixed 640x480 canvas
  // (strip dangling separators left by the slice).
  const modelLine =
    model.length > 30 ? `${model.slice(0, 29).replace(/[\s-]+$/, "")}…` : model;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480" role="img" aria-label="${escapeXml(`${category.name}: ${brand} ${model}`)}">
  <rect width="640" height="480" fill="#ffffff"/>
  <rect x="0.5" y="0.5" width="639" height="479" fill="none" stroke="#e4e4e7"/>
  <g transform="translate(200,70)" ${ILLUSTRATION_ATTRS}>${illustration}</g>
  <text x="320" y="330" text-anchor="middle" font-family="system-ui, sans-serif" font-size="15" font-weight="600" letter-spacing="3" fill="${accent}">${escapeXml(category.name.toUpperCase())}</text>
  <text x="320" y="368" text-anchor="middle" font-family="system-ui, sans-serif" font-size="32" font-weight="600" fill="#18181b">${escapeXml(brand)}</text>
  <text x="320" y="406" text-anchor="middle" font-family="system-ui, sans-serif" font-size="24" fill="#52525b">${escapeXml(modelLine)}</text>
</svg>
`;
}

/** Writes the placeholder image for a product and returns its public URL. */
export function saveProductImage(options: {
  slug: string;
  categorySlug: string;
  brand: string;
  model: string;
  accent?: string;
}): string {
  const imageDir = path.resolve("public", "images", "products");
  mkdirSync(imageDir, { recursive: true });
  writeFileSync(
    path.join(imageDir, `${options.slug}.svg`),
    productSvg(options.categorySlug, options.brand, options.model, options.accent),
  );
  return `/images/products/${options.slug}.svg`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
