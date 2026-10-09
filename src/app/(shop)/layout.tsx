import type { ReactNode } from "react";

import { AiAssistant } from "@/components/ai-assistant";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

/** Chrome for the storefront. The /admin area has its own layout. */
export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
      <SiteFooter />
      <AiAssistant />
    </>
  );
}
