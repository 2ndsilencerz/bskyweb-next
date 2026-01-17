import {NextResponse} from "next/server";

export async function GET() {
    return NextResponse.json(await getBackground());
}

export async function getBackground() {
    const res = await fetch(`https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=en-US`);
    if (!res.ok) throw new Error(`Failed to fetch background: ${res.statusText}`);
    return await res.json();
}