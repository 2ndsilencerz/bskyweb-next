import {NextResponse} from "next/server";
import axios from "axios";

export async function GET() {
    return NextResponse.json(await getBackground());
}

export async function getBackground() {
    const res = await axios.get(`https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=en-US`);
    if (res.status !== 200) throw new Error(`Failed to fetch background: ${res.statusText}`);
    return res.data;
}