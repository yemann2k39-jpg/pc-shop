"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Product } from "@/db/schema";
import type { BuildViewerHandle } from "@/components/build-viewer";
import { CATEGORIES } from "@/lib/catalog";
import { checkCompatibility, estimateSystemDraw } from "@/lib/compatibility";
import { formatPrice } from "@/lib/format";
import {
  BUILD_METHODOLOGY,
  estimateForBuild,
  type BenchmarkLookup,
} from "@/lib/performance";

const BuildViewer = dynamic(() => import("@/components/build-viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-zinc-400">
      Loading 3D view…
    </div>
  ),
});

const SEVERITY_STYLES = {
  error: {
    dot: "bg-red-500",
    chip: "border-red-200 bg-red-50 text-red-700",
    label: "Error",
  },
  warning: {
    dot: "bg-amber-500",
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    label: "Warning",
  },
  info: {
    dot: "bg-blue-400",
    chip: "border-zinc-200 bg-zinc-50 text-zinc-600",
    label: "Info",
  },
} as const;

/** Compact per-slot picker row for the right-hand panel. */
function PartSlot({
  categoryName,
  options,
  selected,
  focused,
  onSelect,
  onClear,
  stickControl,
}: {
  categoryName: string;
  options: Product[];
  selected?: Product;
  focused?: boolean;
  onSelect: (product: Product) => void;
  onClear: () => void;
  stickControl?: { count: number; onChange: (count: number) => void };
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const queryLower = query.trim().toLowerCase();
  const filtered = queryLower
    ? options.filter((p) =>
        `${p.brand} ${p.model}`.toLowerCase().includes(queryLower),
      )
    : options;

  const choose = (product: Product) => {
    onSelect(product);
    setOpen(false);
    setQuery("");
  };

  return (
    <div
      className={`rounded-xl border bg-white p-3 transition-all ${
        focused ? "border-blue-600 ring-2 ring-blue-600/30" : "border-zinc-200"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
          {categoryName}
        </h3>
        {selected ? (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-zinc-400 hover:text-red-600"
          >
            Clear
          </button>
        ) : null}
      </div>

      {selected ? (
        <div className="mt-2 flex items-center gap-2.5">
          <div className="relative h-9 w-12 shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
            <Image
              src={selected.imageUrl}
              alt=""
              fill
              sizes="48px"
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-900">
              {selected.brand} {selected.model}
            </p>
            <p className="text-xs text-zinc-500">
              {formatPrice(selected.priceCents)}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs text-zinc-400">Nothing selected</p>
      )}

      {stickControl && selected ? (
        <div className="mt-2 flex items-center justify-between rounded-md border border-zinc-200 px-2 py-1.5">
          <span className="text-xs text-zinc-500">Sticks in build</span>
          <span className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Remove a RAM stick"
              disabled={stickControl.count <= 1}
              onClick={() => stickControl.onChange(stickControl.count - 1)}
              className="h-6 w-6 rounded-md border border-zinc-300 text-sm leading-none text-zinc-600 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              −
            </button>
            <span className="w-4 text-center text-sm font-semibold text-zinc-900">
              {stickControl.count}
            </span>
            <button
              type="button"
              aria-label="Add a RAM stick"
              disabled={stickControl.count >= 4}
              onClick={() => stickControl.onChange(stickControl.count + 1)}
              className="h-6 w-6 rounded-md border border-zinc-300 text-sm leading-none text-zinc-600 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              +
            </button>
          </span>
        </div>
      ) : null}

      {open ? (
        <div className="mt-2">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setOpen(false);
                setQuery("");
              }
            }}
            placeholder={`Search ${categoryName.toLowerCase()}…`}
            aria-label={`Search ${categoryName.toLowerCase()}`}
            autoFocus
            className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-900 focus:outline-none"
          />
          <ul className="mt-1 max-h-44 overflow-y-auto rounded-md border border-zinc-200">
            {filtered.length === 0 ? (
              <li className="px-2 py-2 text-xs text-zinc-400">No matches</li>
            ) : (
              filtered.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => choose(option)}
                    className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-sm hover:bg-zinc-100"
                  >
                    <span className="truncate">
                      <span className="text-zinc-400">{option.brand}</span>{" "}
                      {option.model}
                    </span>
                    <span className="shrink-0 text-xs text-zinc-500">
                      {formatPrice(option.priceCents)}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          className="mt-2 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-xs font-medium text-zinc-600 hover:border-zinc-400"
        >
          {selected ? "Change" : "Choose a part"}
        </button>
      )}
    </div>
  );
}

/** Save-and-share card: posts the build and surfaces the share link. */
function SaveBuildForm({ items }: { items: Record<string, Product> }) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);

  if (Object.keys(items).length === 0) return null;

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const response = await fetch("/api/builds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          note: note || undefined,
          items: Object.fromEntries(
            Object.entries(items).map(([category, product]) => [category, product.slug]),
          ),
        }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        setError(data.error ?? "Could not save the build.");
        setSaving(false);
        return;
      }
      setSavedUrl(data.url);
      setSaving(false);
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  };

  if (savedUrl) {
    return (
      <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-medium text-emerald-800">Build saved!</p>
        <Link href={savedUrl} className="mt-1 inline-block text-sm text-blue-700 underline">
          Open your shared build page
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-zinc-900">Save &amp; share</h2>
      {Object.keys(items).length < CATEGORIES.length ? (
        <p className="mt-2 text-xs text-zinc-400">
          Select all 8 parts to save and share this build.
        </p>
      ) : null}
      <div className="mt-2 space-y-2">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Build name (required)"
          maxLength={200}
          aria-label="Build name"
          className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-900 focus:outline-none"
        />
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Notes (optional) — what is this build for?"
          maxLength={500}
          rows={2}
          aria-label="Build notes"
          className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-900 focus:outline-none"
        />
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={save}
        disabled={saving || !name.trim() || Object.keys(items).length < CATEGORIES.length}
        className="mt-2 w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save build"}
      </button>
    </div>
  );
}

export function BuildClient({
  products,
  initialSelection,
  benchmarks,
}: {
  products: Product[];
  initialSelection?: Record<string, Product>;
  benchmarks: BenchmarkLookup;
}) {
  const [selection, setSelection] = useState<Record<string, Product>>(
    initialSelection ?? {},
  );
  const [ramSticks, setRamSticks] = useState(2);
  const [ssd, setSsd] = useState<Product | undefined>(undefined);
  const [hdd, setHdd] = useState<Product | undefined>(undefined);
  // Compatibility/perf/save work off the 8 canonical categories: the first
  // chosen drive stands in as the storage part.
  const buildSelection = useMemo(() => {
    const storage = ssd ?? hdd;
    return storage ? { ...selection, storage } : selection;
  }, [selection, ssd, hdd]);
  const buildPerf = useMemo(
    () => estimateForBuild(buildSelection, benchmarks),
    [buildSelection, benchmarks],
  );
  const [focused, setFocused] = useState<string | null>(null);
  const viewerRef = useRef<BuildViewerHandle>(null);

  const byCategory = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const product of products) {
      const list = map.get(product.category) ?? [];
      list.push(product);
      map.set(product.category, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.priceCents - b.priceCents);
    }
    return map;
  }, [products]);

  const findings = useMemo(() => checkCompatibility(buildSelection), [buildSelection]);
  const totalCents = useMemo(    () =>
      Object.values(selection).reduce((sum, p) => sum + p.priceCents, 0) +
      (ssd?.priceCents ?? 0) +
      (hdd?.priceCents ?? 0),
    [selection, ssd, hdd],
  );
  const draw = estimateSystemDraw(buildSelection);
  const psu = selection.psu;
  const psuWattage = psu?.specs.wattageW;
  const errorCount = findings.filter((f) => f.severity === "error").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;
  const errorCategories = useMemo(
    () =>
      new Set(
        findings.filter((f) => f.severity === "error").flatMap((f) => f.parts),
      ),
    [findings],
  );
  const accents = useMemo(
    () => Object.fromEntries(CATEGORIES.map((c) => [c.slug, c.accent])),
    [],
  );

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* 3D viewport */}
      <div className="min-w-0 flex-1">
        <div className="relative h-[26rem] overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950 lg:sticky lg:top-20 lg:h-[calc(100vh-8.5rem)]">
          <BuildViewer
            ref={viewerRef}
            selection={selection}
            accents={accents}
            errorCategories={errorCategories}
            onPartClick={setFocused}
            ramSticks={ramSticks}
            ssdDrive={ssd}
            hddDrive={hdd}
          />
          <div className="absolute right-3 top-3 flex gap-2">
            <button
              type="button"
              onClick={() => viewerRef.current?.resetCamera()}
              className="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-zinc-800 shadow-sm backdrop-blur hover:bg-white"
            >
              Reset camera
            </button>
            <button
              type="button"
              onClick={() => viewerRef.current?.toggleAutoRotate()}
              className="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-zinc-800 shadow-sm backdrop-blur hover:bg-white"
            >
              Auto-rotate
            </button>
          </div>
          <div className="absolute bottom-3 left-3 rounded-md bg-black/50 px-2 py-1 text-xs text-zinc-300">
            drag to orbit · scroll to zoom · click a part to focus its slot
          </div>
        </div>
      </div>

      {/* right panel: status, pickers, compatibility */}
      <aside className="w-full shrink-0 space-y-3 lg:w-[21rem]">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-900">Build status</h2>
            <div className="flex gap-2 text-xs font-medium">
              <span
                className={`rounded-full px-2.5 py-1 ${
                  errorCount > 0
                    ? "bg-red-100 text-red-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {errorCount} {errorCount === 1 ? "error" : "errors"}
              </span>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">
                {warningCount} {warningCount === 1 ? "warning" : "warnings"}
              </span>
            </div>
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Total price</dt>
              <dd className="font-semibold text-zinc-900">
                {formatPrice(totalCents)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Estimated draw</dt>
              <dd className="font-medium text-zinc-900">
                {draw !== undefined ? `~${draw}W` : "—"}
              </dd>
            </div>
            {psu && typeof psuWattage === "number" ? (
              <div className="flex justify-between">
                <dt className="text-zinc-500">PSU output</dt>
                <dd className="font-medium text-zinc-900">{psuWattage}W</dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-3 border-t border-zinc-200 pt-3">
            <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Estimated performance
              {buildPerf.scenarios.length > 0 && !buildPerf.complete ? (
                <span className="ml-1 font-normal normal-case text-zinc-400">
                  (provisional)
                </span>
              ) : null}
            </h3>
            {buildPerf.scenarios.length === 0 ? (
              <p className="mt-2 text-xs text-zinc-400">
                Pick a GPU and CPU to see FPS estimates — add all 8 parts to
                sharpen the range to ±8%.
              </p>
            ) : (
              <>
                {buildPerf.scenarios.map((scenario) => (
                  <div key={scenario.name} className="mt-2 first:mt-1">
                    <p className="text-xs font-semibold text-zinc-700">
                      {scenario.name}
                    </p>
                    <div className="mt-1 grid grid-cols-3 gap-1 text-center">
                      {scenario.estimates.map((estimate) => (
                        <div
                          key={estimate.resolution}
                          className="rounded-md bg-zinc-50 px-1 py-1.5"
                        >
                          <p className="text-[10px] text-zinc-500">
                            {estimate.resolution}
                          </p>
                          <p className="text-sm font-semibold text-zinc-900">
                            {estimate.fpsLow}–{estimate.fpsHigh}
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            {estimate.bottleneck === "Balanced"
                              ? "balanced"
                              : estimate.bottleneck === "GPU-bound"
                                ? "GPU-led"
                                : `CPU −${estimate.cpuLimitPct}%`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {buildPerf.scenarios.some((s) =>
                  s.estimates.some((e) => e.cpuLimitPct >= 20),
                ) ? (
                  <p
                    role="status"
                    className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800"
                  >
                    ⚠ Your CPU is holding this GPU back at lower resolutions —
                    consider a stronger CPU to use the GPU fully.
                  </p>
                ) : null}
                <p className="mt-2 text-[10px] leading-relaxed text-zinc-400">
                  {BUILD_METHODOLOGY} {buildPerf.notes.join(" ")}
                </p>
              </>
            )}
          </div>
        </div>

        {/* compatibility findings — right below build status */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Compatibility</h2>
          <ul className="mt-3 space-y-2">
            {findings.length === 0 ? (
              <li className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                All good — no compatibility problems detected.
              </li>
            ) : (
              findings.map((finding) => {
                const style = SEVERITY_STYLES[finding.severity];
                return (
                  <li
                    key={finding.rule}
                    className="flex items-start gap-2.5 rounded-lg border border-zinc-200 px-3 py-2"
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${style.dot}`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-sm leading-snug text-zinc-800">
                        {finding.message}
                      </p>
                      <span
                        className={`mt-1 inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${style.chip}`}
                      >
                        {style.label}
                      </span>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
          <p className="mt-3 text-xs text-zinc-400">
            Estimates are based on catalog specs and simple rules — always
            double-check critical builds.
          </p>
        </div>

        {CATEGORIES.filter((c) => c.slug !== "storage").map((category) => (
          <PartSlot
            key={category.slug}
            categoryName={category.name}
            options={byCategory.get(category.slug) ?? []}
            selected={selection[category.slug]}
            focused={focused === category.slug}
            stickControl={
              category.slug === "ram"
                ? { count: ramSticks, onChange: setRamSticks }
                : undefined
            }
            onSelect={(product) =>
              setSelection((prev) => ({ ...prev, [category.slug]: product }))
            }
            onClear={() =>
              setSelection((prev) => {
                const next = { ...prev };
                delete next[category.slug];
                return next;
              })
            }
          />
        ))}

        {/* storage split into dedicated SSD and HDD pickers */}
        <PartSlot
          categoryName="SSD"
          options={(byCategory.get("storage") ?? []).filter((p) =>
            String(p.specs.driveType ?? "").includes("SSD"),
          )}
          selected={ssd}
          focused={focused === "storage"}
          onSelect={setSsd}
          onClear={() => setSsd(undefined)}
        />
        <PartSlot
          categoryName="HDD"
          options={(byCategory.get("storage") ?? []).filter(
            (p) => !String(p.specs.driveType ?? "").includes("SSD"),
          )}
          selected={hdd}
          focused={focused === "storage"}
          onSelect={setHdd}
          onClear={() => setHdd(undefined)}
        />

        <SaveBuildForm items={buildSelection} />
      </aside>
    </div>
  );
}
