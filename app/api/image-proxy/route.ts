import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get("url");

    if (!imageUrl) {
      return new NextResponse("Missing url parameter", { status: 400 });
    }

    const parsed = new URL(imageUrl);
    // Allow pollinations.ai, wikimedia, googleusercontent or image hosts
    const allowedHosts = [
      "image.pollinations.ai",
      "pollinations.ai",
      "upload.wikimedia.org",
      "images.unsplash.com",
    ];

    const isAllowed = allowedHosts.some(
      (h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`)
    );

    if (!isAllowed) {
      return new NextResponse("Host not allowed", { status: 403 });
    }

    const res = await fetch(imageUrl);
    if (!res.ok) {
      return new NextResponse(`Failed to fetch image: ${res.statusText}`, { status: res.status });
    }

    const blob = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/jpeg";

    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": 'attachment; filename="bharat-ai-image.jpg"',
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err: any) {
    return new NextResponse(err.message || "Proxy error", { status: 500 });
  }
}

