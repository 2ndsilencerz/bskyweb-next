import {NextResponse} from "next/server";
import {unblockAll} from "@/app/api/profile/block/route";

export async function GET() {
    unblockAll();
    return NextResponse.json({success: true});
}