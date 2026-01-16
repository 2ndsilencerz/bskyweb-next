import {getAgent} from "@/lib/bsky";
import {NextResponse} from "next/server";

export async function POST(req: Request) {
    const postUri = req.headers.get('uri');

    if (!postUri) {
        return NextResponse.json({error: 'URI header is required'}, {status: 400});
    }
    const blocked = await block(postUri);
    console.log(`Blocked: ${blocked ? 'Success' : 'Already blocked'}`);
    return NextResponse.json({
        success: blocked,
        message: blocked ? 'blocked' : 'Profile already blocked'
    });
}

export async function block(did: string) {
    try {
        const agent = await getAgent();
        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await agent.app.bsky.graph.block.create({repo: agent.session?.did || ''}, {
                        subject: did,
                        createdAt: new Date().toISOString()
                    }
                )
                return !!response;
            } catch (error) {
                console.error(`Attempt ${attempt} failed:`, error);
                if (attempt === maxRetries) throw error;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    } catch (error) {
        console.error('Error blocking profile:', error);
        return false;
    }
    return false;
}