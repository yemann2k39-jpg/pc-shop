import { NextResponse } from "next/server";

import { createBuild, validateBuildItems } from "@/lib/builds";

const MAX_FIELD = 200;

function nonEmptyString(value: unknown, max = MAX_FIELD): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    ownerName?: unknown;
    note?: unknown;
    items?: unknown;
  } | null;

  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  if (!nonEmptyString(body.name)) {
    return NextResponse.json({ error: "Give your build a name (max 200 chars)." }, { status: 400 });
  }
  if (body.ownerName !== undefined && body.ownerName !== null && !nonEmptyString(body.ownerName)) {
    return NextResponse.json({ error: "Invalid owner name." }, { status: 400 });
  }
  if (body.note !== undefined && body.note !== null && !nonEmptyString(body.note, 500)) {
    return NextResponse.json({ error: "Note must be 1-500 characters." }, { status: 400 });
  }
  if (typeof body.items !== "object" || body.items === null || Array.isArray(body.items)) {
    return NextResponse.json({ error: "Invalid build items." }, { status: 400 });
  }

  const items: Record<string, string> = {};
  for (const [category, slug] of Object.entries(body.items)) {
    if (typeof slug !== "string" || !slug || slug.length > 100) {
      return NextResponse.json({ error: "Invalid build items." }, { status: 400 });
    }
    items[category] = slug;
  }

  const validation = await validateBuildItems(items);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const build = await createBuild({
    name: body.name.trim(),
    ownerName: nonEmptyString(body.ownerName) ? String(body.ownerName).trim() : undefined,
    note: nonEmptyString(body.note, 500) ? String(body.note).trim() : undefined,
    items,
  });

  return NextResponse.json({
    publicId: build.publicId,
    url: `/build/${build.publicId}`,
  });
}
