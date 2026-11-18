import { getAiProviderKeys } from "@/lib/aiKeyVault";
import { authorizeApi } from "@/lib/apiAuth";
import { parseJob } from "@/lib/extract";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const auth = await authorizeApi(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  let body: {
    url?: string;
    title?: string;
    text?: string;
    image?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  let image: { mime: string; data: string } | undefined;
  if (body.image) {
    const match = /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/.exec(body.image);
    if (match) image = { mime: match[1], data: match[2] };
  }

  if (!body.text && !image && !body.url && !body.title) {
    return NextResponse.json(
      { error: "Nothing to parse. Send text, image, url or title." },
      { status: 400 }
    );
  }

  try {
    const savedKeys = await getAiProviderKeys(auth.userId);
    const result = await parseJob({
      url: body.url,
      title: body.title,
      text: body.text,
      image,
    }, savedKeys);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Parser crashed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
