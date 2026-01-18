import {notification} from "@/lib/notification";
import {NextResponse} from "next/server";

export async function GET() {
    const res = await getNotification();
    return NextResponse.json({notifications: res, success: res});
}

export async function getNotification() {
    return await notification();
}