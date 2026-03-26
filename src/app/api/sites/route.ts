import { NextResponse } from "next/server";
import { listSiteConfigs } from "@/lib/storage";

export async function GET() {
  try {
    const sites = await listSiteConfigs();
    return NextResponse.json(sites);
  } catch (error) {
    console.error("List error:", error);
    return NextResponse.json(
      { error: "Failed to list sites" },
      { status: 500 }
    );
  }
}
