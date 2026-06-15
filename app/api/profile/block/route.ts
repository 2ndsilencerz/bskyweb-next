import {getAgent} from "@/lib/bsky";
import {NextResponse} from "next/server";
import {addBlock} from "@/lib/blocklist";

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
                if (response.cid || response.uri) {
                    addBlock(did);
                }
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

export async function unblockAll() {
    try {
        const agent = await getAgent();
        const blocks: string[] = [];
        let cursor: string | undefined;

        // Fetch all blocks with pagination
        do {
            const response = await agent.app.bsky.graph.getBlocks({
                limit: 100,
                cursor
            });

            blocks.push(...response.data.blocks.map(block => block.did));
            cursor = response.data.cursor;
        } while (cursor);

        console.log(`Found ${blocks.length} blocked profiles`);

        // Unblock each profile
        let unblocked = 0;
        for (const did of blocks) {
            try {
                const success = await unblock(did);
                if (success) unblocked++;
                console.log(`Unblocked: ${did}`);
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`Failed to unblock ${did}:`, error);
            }
        }

        console.log(`Unblocked ${unblocked} of ${blocks.length} profiles`);
        return unblocked;
    } catch (error) {
        console.error('Error unblocking all profiles:', error);
        return 0;
    }
}

async function unblock(did: string): Promise<boolean> {
    try {
        const agent = await getAgent();

        // First, get the block record URI
        const blocks = await agent.app.bsky.graph.getBlocks({limit: 100});
        const blockRecord = blocks.data.blocks.find(b => b.did === did);

        if (!blockRecord) {
            console.log(`No block record found for ${did}`);
            return false;
        }

        // Extract the rkey from the block URI
        const uriParts = blockRecord.viewer?.blocking?.split('/');
        if (!uriParts || uriParts.length < 2) {
            console.error(`Invalid block URI format for ${did}`);
            return false;
        }
        const rkey = uriParts[uriParts.length - 1];

        // Delete the block record
        await agent.app.bsky.graph.block.delete({
            repo: agent.session?.did || '',
            rkey
        });

        return true;
    } catch (error) {
        console.error(`Error unblocking ${did}:`, error);
        return false;
    }
}