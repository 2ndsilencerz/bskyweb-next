import {NextResponse} from "next/server";
import {posts} from "@/app/foryou/api/posts/[...cursor]/route";

export async function GET(req: Request) {
    const uri = req.headers.get('X-URI') || '';
    console.log(`Base route fetching with URI: ${uri}`);
    return NextResponse.json(await posts(uri));
}