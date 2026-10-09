import type { Product } from "@/db/schema";
import { estimateForCpu, estimateForGpu, SOURCES } from "@/lib/performance";

const METHODOLOGY_NOTES = {
  gpu: "Assumes a modern mid-high CPU. Actual results vary by game, settings, and drivers.",
  cpu: "Assumes an RTX 4070 Super-class GPU. CPU impact is largest at 1080p; at 4K the GPU dominates.",
};

const BOTTLENECK_STYLES = {
  "GPU-bound": "bg-blue-50 text-blue-700 border-blue-200",
  "CPU-bound": "bg-amber-50 text-amber-700 border-amber-200",
  Balanced: "bg-emerald-50 text-emerald-700 border-emerald-200",
} as const;

/** Estimated FPS ranges for GPU/CPU products, with methodology + sources. */
export function PerformancePanel({ product }: { product: Product }) {
  const estimates =
    product.category === "gpu"
      ? estimateForGpu(product)
      : product.category === "cpu"
        ? estimateForCpu(product)
        : null;
  if (!estimates) return null;

  const note = product.category === "gpu" ? METHODOLOGY_NOTES.gpu : METHODOLOGY_NOTES.cpu;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white">
      <h2 className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-900">
        Estimated performance
      </h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100 text-left text-xs text-zinc-400 uppercase">
            <th className="px-4 py-2 font-medium">Resolution</th>
            <th className="px-4 py-2 font-medium">Expected FPS</th>
            <th className="px-4 py-2 font-medium">Bottleneck</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {estimates.map((estimate) => (
            <tr key={estimate.resolution}>
              <td className="px-4 py-2.5 font-medium text-zinc-900">
                {estimate.resolution}
              </td>
              <td className="px-4 py-2.5 text-zinc-800">
                ~{estimate.fpsLow}–{estimate.fpsHigh} fps
              </td>
              <td className="px-4 py-2.5">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${BOTTLENECK_STYLES[estimate.bottleneck]}`}
                >
                  {estimate.bottleneck}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-zinc-100 px-4 py-3">
        <p className="text-xs leading-relaxed text-zinc-500">{note}</p>
        <p className="mt-1 text-xs text-zinc-400">Sources: {SOURCES.join("; ")}.</p>
      </div>
    </div>
  );
}
