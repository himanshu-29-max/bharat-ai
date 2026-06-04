import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    return NextResponse.json({ error: "Redis env vars missing!", urlFound: !!url, tokenFound: !!token });
  }

  try {
    // Test SET
    const setRes = await fetch(`${url}/set/test-key/hello-world`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const setData = await setRes.json();

    // Test GET
    const getRes = await fetch(`${url}/get/test-key`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const getData = await getRes.json();

    return NextResponse.json({
      success: true,
      urlPreview: url.slice(0, 35) + "...",
      tokenLength: token.length,
      setResult: setData,
      getResult: getData,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
