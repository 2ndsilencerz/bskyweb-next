import {addBlacklist, removeBlacklist} from "@/lib/blacklist";
import {NextResponse} from "next/server";

export async function PUT(req: Request) {
    const word = decodeURIComponent(req.headers.get('word') as string);
    await mute(word);
    return NextResponse.json({success: true}, {status: 200});
}

export async function DELETE(req: Request) {
    const word = decodeURIComponent(req.headers.get('word') as string);
    await unmute(word);
    return NextResponse.json({success: true}, {status: 200});
}

export async function mute(word: string) {
    return addBlacklist(word);
}

export async function unmute(word: string) {
    return removeBlacklist(word);
}