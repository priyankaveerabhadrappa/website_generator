import { NextResponse } from "next/server";
import { getSiteConfig, deleteSiteConfig } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const config = await getSiteConfig(slug);
    if (!config) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(config);
  } catch (error) {
    console.error("Get error:", error);
    return NextResponse.json(
      { error: "Failed to get site" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    await deleteSiteConfig(slug);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete site" },
      { status: 500 }
    );
  }
}
