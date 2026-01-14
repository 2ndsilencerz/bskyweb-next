import { getAgent } from '@/lib/bsky';
import {NextResponse} from "next/server";
import {AppBskyFeedGetFeed} from "@atproto/api";
import {
    isView as isEmbedImagesView,
    View as EmbedImagesView,
    ViewImage
} from "@atproto/api/dist/client/types/app/bsky/embed/images";
import {
    isView as isEmbedVideoView,
    View as EmbedVideoView
} from "@atproto/api/dist/client/types/app/bsky/embed/video";
import {
    isView as isEmbedExternalView,
    View as EmbedExternalView
} from "@atproto/api/dist/client/types/app/bsky/embed/external";
import {
    isView as isMediaView,
    View as EmbedMediaView
} from "@atproto/api/dist/client/types/app/bsky/embed/recordWithMedia";

const postPerPageLimit = 10;

type FeedRequest = {
    feed: string,
    limit: number,
    cursor?: string,
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ cursor: string[] }> }
) {
    const resolvedParams = await params;
    // The cursor from the URL (if using [...cursor]) comes as an array
    const urlCursor = resolvedParams.cursor?.join('/');
    // Your header-based cursor
    const headerCursor = req.headers.get('X-URI');

    const cursor = headerCursor || urlCursor || '';
    
    console.log(`Resolved cursor: ${cursor}`);
    
    const result = await posts(cursor);
    return NextResponse.json(result);
}

export async function posts(cursor: string): Promise<false|AppBskyFeedGetFeed.Response> {
    const maxRetries = 3;

    try {
        const agent = await getAgent();

        console.log(`Fetching feed with cursor: ${cursor}`);
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const feedReq: FeedRequest = {
                    feed: 'at://did:plc:3guzzweuqraryl3rdkimjamk/app.bsky.feed.generator/for-you',
                    limit: postPerPageLimit,
                    cursor: cursor != 'x' ? cursor : '',
                }
                const feedRes = await agent.app.bsky.feed.getFeed(feedReq);
                feedRes.data.feed = feedRes.data.feed.filter((post) => {
                    let embed;
                    let imageExist, videoExist, externalExist;
                    if (isEmbedImagesView(post.post.embed) || (isMediaView(post.post.embed) && isEmbedImagesView((post.post.embed as EmbedMediaView).media))) {
                        embed = (post.post.embed || (post.post.embed as EmbedMediaView).media) as EmbedImagesView;
                        imageExist = !(embed.images == null || embed.images.length == 0);
                    } else if (isEmbedVideoView(post.post.embed) || isMediaView(post.post.embed) && isEmbedVideoView((post.post.embed as EmbedMediaView).media)) {
                        embed = (post.post.embed || (post.post.embed as EmbedMediaView).media) as EmbedVideoView;
                        videoExist = !(embed.playlist == null || embed.playlist.length == 0);
                    } else if (isEmbedExternalView(post.post.embed) || isMediaView(post.post.embed) && isEmbedExternalView((post.post.embed as EmbedMediaView).media)) {
                        embed = (post.post.embed || (post.post.embed as EmbedMediaView).media) as EmbedExternalView;
                        externalExist = !(embed.external.uri == null || embed.external.uri == '');
                    }
                    if (!imageExist && !videoExist && !externalExist) {
                        console.log(`Removing post ${post.post.uri} due to missing embed`);
                        return false;
                    }
                    return true;
                });
                return feedRes;
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