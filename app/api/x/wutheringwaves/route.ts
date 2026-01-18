import {getWutheringWavesPost} from "@/lib/twitter-x";

export async function GET() {
    const tweets = await getWutheringWavesPost();
    return new Response(JSON.stringify(tweets, null, 2));
}