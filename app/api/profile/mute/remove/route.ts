import {NextResponse} from "next/server";
import {unmuteAll} from "@/app/api/profile/mute/route";

export async function GET() {
    unmuteAll();
    return NextResponse.json({success: true});
}