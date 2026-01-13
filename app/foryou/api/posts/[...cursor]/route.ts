import { getAgent } from '@/lib/bsky';
import {NextResponse} from "next/server";
import {AppBskyFeedGetFeed} from "@atproto/api";

const postPerPageLimit = 2;

type FeedRequest = {
    feed: string,
    limit: number,
    cursor?: string,
}

export async function GET(req: Request) {
    const cursor = req.headers.get('uri') as string;
    return NextResponse.json(await posts(cursor));
}

export async function posts(cursor: string): Promise<false|AppBskyFeedGetFeed.Response> {
    const maxRetries = 3;

    try {
        const agent = await getAgent();

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const feedReq: FeedRequest = {
                    feed: 'at://did:plc:3guzzweuqraryl3rdkimjamk/app.bsky.feed.generator/for-you',
                    limit: postPerPageLimit,
                    cursor: cursor != 'x' ? cursor : '',
                }
                return await agent.app.bsky.feed.getFeed(feedReq);
            } catch (error) {
                console.error(`Attempt ${attempt} failed:`, error);
                if (attempt === maxRetries) throw error;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    } catch (error) {
        return false;
    }
    return false;
}