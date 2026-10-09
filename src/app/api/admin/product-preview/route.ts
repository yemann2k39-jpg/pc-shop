import { isAdminAuthenticated } from "@/lib/auth";
import { getCategory } from "@/lib/catalog";
import { productSvg } from "@/lib/product-image";

export const dynamic = "force-dynamic";

/** Live preview of the generated product placeholder (admin product form). */
export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const category = url.searchParams.get("category") ?? "cpu";
  const brand = url.searchParams.get("brand") ?? "Brand";
  const model = url.searchParams.get("model") ?? "Model";
  const accent = url.searchParams.get("accent") ?? getCategory(category)?.accent;

  const svg = productSvg(category, brand.slice(0, 40), model.slice(0, 40), accent || undefined);
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store",
    },
  });
}
