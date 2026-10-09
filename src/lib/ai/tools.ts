/**
 * Grounded tools for the AI assistant. Every tool queries real shop data —
 * the LLM never answers technical questions from its own memory.
 */

import { asc, inArray } from "drizzle-orm";

import { db } from "@/db";
import { products, type Product } from "@/db/schema";
import { CATEGORIES } from "@/lib/catalog";
import { checkCompatibility, type BuildSelection } from "@/lib/compatibility";
import { estimateForBuild, RESOLUTIONS } from "@/lib/performance";
import { formatPrice } from "@/lib/format";

export type ToolResult = Record<string, unknown>;

export type ToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
};

function publicProduct(p: Product) {
  return {
    slug: p.slug,
    name: `${p.brand} ${p.model}`,
    category: p.category,
    price: formatPrice(p.priceCents),
    priceCents: p.priceCents,
    stock: p.stockStatus,
    url: `/product/${p.slug}`,
  };
}

async function allProducts(): Promise<Product[]> {
  return db.select().from(products).orderBy(asc(products.brand), asc(products.model));
}

async function resolveSelection(
  slugs: Record<string, string>,
): Promise<{ selection: BuildSelection; unresolved: string[] }> {
  const list = Object.values(slugs).filter(Boolean);
  const rows = list.length
    ? await db.select().from(products).where(inArray(products.slug, list))
    : [];
  const selection: BuildSelection = {};
  const unresolved: string[] = [];
  for (const [category, slug] of Object.entries(slugs)) {
    const product = rows.find(
      (row) => row.slug === slug && row.category === category,
    );
    if (product) selection[category] = product;
    else unresolved.push(`${category}: ${slug}`);
  }
  return { selection, unresolved };
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "search_products",
      description:
        "Search the shop catalog for PC parts by keyword. Optionally filter by category and maximum price. Returns up to 6 matches with slug, name, price, stock, and URL.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search keywords, e.g. 'rtx 4070', 'ddr5', 'noctua'" },
          category: {
            type: "string",
            description: `Optional category filter. One of: ${CATEGORIES.map((c) => c.slug).join(", ")}`,
          },
          maxPrice: { type: "number", description: "Optional maximum price in US dollars" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_product_details",
      description:
        "Get the full details of one product by its slug: price, stock, and ALL technical specifications. Use for spec questions.",
      parameters: {
        type: "object",
        properties: {
          slug: { type: "string", description: "Product slug, e.g. 'asus-tuf-rtx-4090-oc'" },
        },
        required: ["slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_compatibility",
      description:
        "Check a set of PC parts for compatibility problems (socket, RAM type, form factor, GPU length, cooler, PSU wattage). Provide a map of category -> product slug. At minimum provide cpu+motherboard or gpu+case for useful results.",
      parameters: {
        type: "object",
        properties: {
          cpu: { type: "string", description: "CPU product slug" },
          gpu: { type: "string", description: "GPU product slug" },
          motherboard: { type: "string", description: "Motherboard product slug" },
          ram: { type: "string", description: "RAM product slug" },
          storage: { type: "string", description: "Storage product slug" },
          psu: { type: "string", description: "PSU product slug" },
          cooler: { type: "string", description: "CPU cooler product slug" },
          case: { type: "string", description: "Case product slug" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "estimate_build_performance",
      description:
        "Estimate FPS ranges (AAA ultra + Esports presets) at 1080p/1440p/4K for a COMPLETE parts selection (all 8 categories). Requires every category slug.",
      parameters: {
        type: "object",
        properties: {
          cpu: { type: "string", description: "CPU product slug" },
          gpu: { type: "string", description: "GPU product slug" },
          motherboard: { type: "string", description: "Motherboard product slug" },
          ram: { type: "string", description: "RAM product slug" },
          storage: { type: "string", description: "Storage product slug" },
          psu: { type: "string", description: "PSU product slug" },
          cooler: { type: "string", description: "CPU cooler product slug" },
          case: { type: "string", description: "Case product slug" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_compatible_parts",
      description:
        "List products of one category that are compatible with a given build, optionally under a max price. Use for 'find me a cooler/GPU/RAM that works with my CPU/build' queries. Returns only parts without compatibility errors.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: `Which part to find. One of: ${CATEGORIES.map((c) => c.slug).join(", ")}`,
          },
          maxPrice: { type: "number", description: "Optional maximum price in US dollars" },
          cpu: { type: "string", description: "CPU slug to check against" },
          motherboard: { type: "string", description: "Motherboard slug to check against" },
          case: { type: "string", description: "Case slug to check against" },
          gpu: { type: "string", description: "GPU slug to check against" },
        },
        required: ["category"],
      },
    },
  },
];

const VALID_CATEGORIES = new Set(CATEGORIES.map((c) => c.slug));

async function executeSearch(args: Record<string, unknown>): Promise<ToolResult> {
  const query = String(args.query ?? "").toLowerCase();
  const category = typeof args.category === "string" ? args.category : undefined;
  const maxPrice = typeof args.maxPrice === "number" ? args.maxPrice : undefined;

  if (category && !VALID_CATEGORIES.has(category)) {
    return { error: `Unknown category "${category}". Valid: ${[...VALID_CATEGORIES].join(", ")}` };
  }

  const list = await allProducts();
  const matches = list
    .filter((p) => (category ? p.category === category : true))
    .filter((p) => (maxPrice !== undefined ? p.priceCents <= maxPrice * 100 : true))
    .filter((p) => `${p.brand} ${p.model}`.toLowerCase().includes(query))
    .slice(0, 6)
    .map(publicProduct);

  return {
    count: matches.length,
    products: matches,
    hint: matches.length === 0 ? "No matches — try broader keywords." : undefined,
  };
}

async function executeDetails(args: Record<string, unknown>): Promise<ToolResult> {
  const slug = String(args.slug ?? "");
  const [product] = await db
    .select()
    .from(products)
    .where(inArray(products.slug, [slug]))
    .limit(1);
  if (!product) return { error: `No product with slug "${slug}".` };
  return {
    ...publicProduct(product),
    specifications: product.specs,
    note: "All specifications above come from the shop catalog.",
  };
}

async function executeCompat(args: Record<string, unknown>): Promise<ToolResult> {
  const slugs: Record<string, string> = {};
  for (const category of ["cpu", "gpu", "motherboard", "ram", "storage", "psu", "cooler", "case"]) {
    const slug = args[category];
    if (typeof slug === "string" && slug) slugs[category] = slug;
  }
  if (Object.keys(slugs).length < 2) {
    return { error: "Provide at least two parts to check." };
  }
  const { selection, unresolved } = await resolveSelection(slugs);
  const findings = checkCompatibility(selection);
  return {
    partsChecked: Object.keys(slugs),
    unresolvedSlugs: unresolved.length > 0 ? unresolved : undefined,
    findings: findings.map((f) => ({ severity: f.severity, message: f.message })),
    summary:
      findings.filter((f) => f.severity === "error").length > 0
        ? "Compatibility errors found — see findings."
        : unresolved.length > 0
          ? "Some provided slugs did not match catalog products and were skipped."
          : "No compatibility problems detected for the provided parts.",
  };
}

async function executePerformance(args: Record<string, unknown>): Promise<ToolResult> {
  const slugs: Record<string, string> = {};
  for (const category of ["cpu", "gpu", "motherboard", "ram", "storage", "psu", "cooler", "case"]) {
    const slug = args[category];
    if (typeof slug === "string" && slug) slugs[category] = slug;
  }
  const { selection } = await resolveSelection(slugs);
  const perf = estimateForBuild(selection);
  if (!perf.complete) {
    return {
      error:
        "Requires ALL 8 category slugs: cpu, gpu, motherboard, ram, storage, psu, cooler, case.",
    };
  }
  return {
    scenarios: perf.scenarios.map((s) => ({
      name: s.name,
      estimates: s.estimates.map((e) => ({
        resolution: e.resolution,
        fpsRange: `${e.fpsLow}-${e.fpsHigh}`,
        bottleneck: e.bottleneck,
      })),
    })),
    notes: perf.notes,
  };
}

async function executeFindCompatible(args: Record<string, unknown>): Promise<ToolResult> {
  const category = String(args.category ?? "");
  if (!VALID_CATEGORIES.has(category)) {
    return { error: `Unknown category "${category}". Valid: ${[...VALID_CATEGORIES].join(", ")}` };
  }
  const maxPrice = typeof args.maxPrice === "number" ? args.maxPrice : undefined;

  // Build context: any provided build part.
  const slugs: Record<string, string> = {};
  for (const key of ["cpu", "gpu", "motherboard", "case", "ram", "storage", "psu", "cooler"]) {
    const slug = args[key];
    if (typeof slug === "string" && slug) slugs[key] = slug;
  }
  const { selection } = await resolveSelection(slugs);

  const candidates = (await allProducts()).filter(
    (p) => p.category === category && p.stockStatus !== "out_of_stock",
  );

  const compatible: Array<ReturnType<typeof publicProduct>> = [];
  for (const candidate of candidates) {
    if (maxPrice !== undefined && candidate.priceCents > maxPrice * 100) continue;
    const trial: BuildSelection = { ...selection, [category]: candidate };
    const findings = checkCompatibility(trial).filter(
      (f) => f.severity === "error" && f.parts.includes(category),
    );
    if (findings.length === 0) compatible.push(publicProduct(candidate));
    if (compatible.length >= 6) break;
  }

  return {
    category,
    count: compatible.length,
    products: compatible,
    hint:
      compatible.length === 0
        ? "No compatible parts found with those constraints — try raising the price limit."
        : undefined,
  };
}

export async function executeTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  switch (name) {
    case "search_products":
      return executeSearch(args);
    case "get_product_details":
      return executeDetails(args);
    case "check_compatibility":
      return executeCompat(args);
    case "estimate_build_performance":
      return executePerformance(args);
    case "find_compatible_parts":
      return executeFindCompatible(args);
    default:
      return { error: `Unknown tool "${name}".` };
  }
}
