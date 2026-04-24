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

export async function unmuteAll() {
    try {
        const agent = await getAgent();
        let cursor: string | undefined;
        let totalUnmuted = 0;

        do {
            const mutedList = await agent.app.bsky.graph.getMutes({
                limit: 100,
                cursor,
            });

            for (const mutedActor of mutedList.data.mutes) {
                const maxRetries = 3;
                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    try {
                        await agent.app.bsky.graph.unmuteActor({actor: mutedActor.did});
                        totalUnmuted++;
                        console.log(`Unmuted: ${mutedActor.handle}`);
                        break;
                    } catch (error) {
                        console.error(`Attempt ${attempt} failed for ${mutedActor.handle}:`, error);
                        if (attempt === maxRetries) {
                            console.error(`Failed to unmute ${mutedActor.handle} after ${maxRetries} attempts`);
                        } else {
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }
                    }
                }
            }

            cursor = mutedList.data.cursor;
        } while (cursor);

        console.log(`Total unmuted: ${totalUnmuted}`);
        return {success: true, count: totalUnmuted};
    } catch (error) {
        console.error('Error unmuting all profiles:', error);
        return {success: false, count: 0};
    }
}