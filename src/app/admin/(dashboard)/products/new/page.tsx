import Link from "next/link";

import { ProductForm } from "../product-form";

export const metadata = { title: "New product" };

export default function NewProductPage() {
  return (
    <div>
      <header className="mb-6">
        <Link href="/admin/products" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Products
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">New product</h1>
      </header>
      <ProductForm />
    </div>
  );
}
