import {getAgent} from '@/lib/bsky';
import {NextResponse} from "next/server";

export async function POST(req: Request) {
    const postUri = req.headers.get('uri');

    if (!postUri) {
        return NextResponse.json({ error: 'URI header is required' }, { status: 400 });
    }

    const liked = await like(postUri);
    console.log(`Liked: ${liked ? 'Success' : 'Already liked'}`);
    return NextResponse.json({
        success: liked,
        message: liked ? liked : 'Post already liked'
    });
}

export async function like(uri: string) {
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
                return await agent.app.bsky.feed.like.create(
                    {repo: agent.session?.did || ''},
                    {
                        subject: {
                            uri: post.uri,
                            cid: post.cid
                        },
                        createdAt: new Date().toISOString()
                    }
                );
            } catch (error) {
                console.error(`Attempt ${attempt} failed:`, error);
                if (attempt === maxRetries) throw error;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    } catch (error) {
        console.error(`Error liking post: ${error}`)
        return false;
    }
    return false;
}