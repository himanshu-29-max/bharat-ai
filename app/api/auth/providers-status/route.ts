import { NextResponse } from "next/server";

export async function GET() {
  const configured = {
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    github: !!(process.env.GITHUB_ID && process.env.GITHUB_SECRET),
    microsoft: !!(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET),
    apple: !!(process.env.APPLE_ID && process.env.APPLE_SECRET),
  };

  return NextResponse.json({ configured });
}

