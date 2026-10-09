"use client";

import { useState, useTransition } from "react";

import { deleteBuild } from "./actions";

export function DeleteBuildButton({ publicId }: { publicId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs font-semibold text-red-600 hover:text-red-800"
      >
        Delete
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2 text-xs">
      <span className="text-zinc-500">Sure?</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => deleteBuild(publicId))}
        className="rounded-md bg-red-600 px-2 py-1 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
      >
        {pending ? "Deleting…" : "Yes, delete"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="font-medium text-zinc-500 hover:text-zinc-800"
      >
        Cancel
      </button>
    </span>
  );
}
