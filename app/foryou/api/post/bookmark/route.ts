import { getAgent } from '@/lib/bsky';
import {NextResponse} from "next/server";

export async function POST(req: Request) {
    const postUri = req.headers.get('uri');

    if (!postUri) {
        return NextResponse.json({ error: 'URI header is required' }, { status: 400 });
    }

    const bookmarked = await bookmark(postUri);
    return NextResponse.json({
        success: bookmarked,
        message: bookmarked ? 'Post bookmarked successfully' : 'Post already bookmarked'
    });
}

export async function bookmark(uri: string) {
    try {
        const agent = await getAgent();
        const maxRetries = 3;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const postDetails = await agent.app.bsky.feed.getPosts({ uris: [uri] });

                if (!postDetails.data.posts.length) {
                    return false;
                }

                const post = postDetails.data.posts[0];
                const bookmarkResponse = await agent.app.bsky.bookmark.createBookmark(
                    {
                        uri: post.uri,
                        cid: post.cid
                    }
                )

                return bookmarkResponse.success
            } catch (error) {
                console.error(`Attempt ${attempt} failed:`, error);
                if (attempt === maxRetries) throw error;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    } catch (error) {
        return false
    }
    return false;
}