import {NextResponse} from "next/server";
import {getAgent} from "@/lib/bsky";

export async function POST(req: Request) {
    const postUri = req.headers.get('uri');

    if (!postUri) {
        return NextResponse.json({error: 'URI header is required'}, {status: 400});
    }
    const muted = await mute(postUri);
    console.log(`Muted: ${muted ? 'Success' : 'Already muted'}`);
    return NextResponse.json({
        success: muted,
        message: muted ? 'muted' : 'Profile already muted'
    });
}

export async function mute(handle: string) {
    try {
        const agent = await getAgent();
        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await agent.app.bsky.graph.muteActor({actor: handle});
                return response.success;
            } catch (error) {
                console.error(`Attempt ${attempt} failed:`, error);
                if (attempt === maxRetries) throw error;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    } catch (error) {
        console.error('Error muting profile:', error);
        return false;
    }
    return false;
}