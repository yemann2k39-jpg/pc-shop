import Link from "next/link";
import { notFound } from "next/navigation";

import { getProductBySlug } from "@/lib/products";

import { setRetired } from "../../actions";
import { ProductForm } from "../../product-form";

export const metadata = { title: "Edit product" };
export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: PageProps<"/admin/products/[slug]/edit">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const retired = product.stockStatus === "out_of_stock";

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin/products" className="text-sm text-zinc-500 hover:text-zinc-900">
            ← Products
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">
            {product.brand} {product.model}
          </h1>
          <p className="mt-1 font-mono text-xs text-zinc-400">/product/{product.slug}</p>
        </div>
        <form
          action={async () => {
            "use server";
            await setRetired(product.slug, !retired);
          }}
        >
          <button
            type="submit"
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
              retired
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            }`}
          >
            {retired ? "Restore to shop (low stock)" : "Retire from shop"}
          </button>
        </form>
      </header>
      <ProductForm product={product} />
    </div>
  );
}
