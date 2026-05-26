import {NextResponse} from "next/server";
import {posts} from "./[...cursor]/route";

export async function GET(
    req: Request,
    {params}: { params: Promise<{ type: string }> }
) {
    const {type: rawType} = await params;
    const type = rawType || 'foryou';
    const uri = req.headers.get('X-URI') || '';
    console.log(`Base route fetching with URI: ${uri}, type: ${type}`);
    return NextResponse.json(await posts(uri, type));
}