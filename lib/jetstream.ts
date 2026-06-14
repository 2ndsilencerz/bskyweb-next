import WebSocket from 'ws';
import {getBlacklist, getDictionary} from './blacklist';
import {getDB} from './db';
import {checkBlacklist, checkBlocklist, checkMuteList} from "@/app/api/posts/[type]/[...cursor]/route";
import {isView as isEmbedImagesView} from "@atproto/api/dist/client/types/app/bsky/embed/images";
import {
    isView as isEmbedMediaView,
    View as EmbedMediaView
} from "@atproto/api/dist/client/types/app/bsky/embed/recordWithMedia";
import {isView as isEmbedVideoView} from "@atproto/api/dist/client/types/app/bsky/embed/video";
import {isView as isEmbedExternalView} from "@atproto/api/dist/client/types/app/bsky/embed/external";
import {getBlocklist} from "@/lib/blocklist";
import {getMuteList} from "@/lib/mutelist";
import {ViewRecord} from "@atproto/api/dist/client/types/app/bsky/embed/record";

// Jetstream public endpoints
const JETSTREAM_ENDPOINTS = [
    "wss://jetstream1.us-east.bsky.network/subscribe",
    "wss://jetstream2.us-east.bsky.network/subscribe"
];

interface JetstreamEvent {
    did: string;
    time_us: number;
    type: 'com.atproto.sync.subscribeRepos#commit';
    commit?: {
        rev: string;
        operation: 'create' | 'update' | 'delete';
        collection: string;
        rkey: string;
        record: any;
        cid: string;
    };
}

export function startJetstreamCollector() {
    console.log('Starting Jetstream Collector...');

    const endpoint = JETSTREAM_ENDPOINTS[0];
    // Subscribe to bsky.social posts
    const url = `${endpoint}?wantedCollections=app.bsky.feed.post`;

    const ws = new WebSocket(url);

    ws.on('open', () => {
        console.log(`Connected to Jetstream at ${endpoint}`);
    });

    ws.on('message', async (data: WebSocket.Data) => {
        try {
            const event = JSON.parse(data.toString()) as JetstreamEvent;

            if (event.commit?.operation === 'create' && event.commit.collection === 'app.bsky.feed.post') {
                const record = event.commit.record;
                const text = record.text || '';
                const tags = record.tags || [];
                const authorDid = event.did;
                const uri = `at://${authorDid}/${event.commit.collection}/${event.commit.rkey}`;

                if (await shouldCollect(record)) {
                    console.log(`[Jetstream] Found matching post: ${text}`);
                    await saveToDb({
                        uri,
                        cid: event.commit.cid,
                        indexedAt: new Date().toISOString(),
                        createdAt: record.createdAt,
                        tag: 'jetstream',
                    });
                }
            }
        } catch (err) {
            console.error('[Jetstream] Error processing Jetstream message:', err);
        }
    });

    ws.on('error', (err) => {
        console.error('[Jetstream] WebSocket error:', err);
    });

    ws.on('close', () => {
        console.log('[Jetstream] connection closed. Reconnecting in 5s...');
        setTimeout(startJetstreamCollector, 5000);
    });
}

async function shouldCollect(post: any): Promise<boolean> {
    const dictionary = getDictionary();
    const text = post.record?.text;
    if (!text) return false;

    const type: string[] = []
    type.push(...dictionary["wuwa"], ...dictionary["miku"], ...dictionary["touhou"], ...dictionary["misc"]);
    if (!type.includes(text) && !text.includes(type)) {
        return false;
    }

    console.log(`[Jetstream] Post contains keyword, checking further...`)

    // const allTags = Object.values(dictionary).flat();
    const blockList = await getBlocklist();
    const muteLists = await getMuteList();
    const blacklist = getBlacklist();

    // Check if any dictionary tag is in the post tags or text
    let imageExist, videoExist, externalExist, quoteExist;
    try {
        if (checkBlocklist(post.author.did, blockList)) {
            return false;
        } else if (checkMuteList(post.author.did, muteLists)) {
            return false;
        } else if (post.viewer?.threadMuted) {
            console.log(`Post ${post.uri} is muted`);
            return false;
        } else if (post.record && post.record.text &&
            // !checkDictionary(post.post.record.text as string) &&
            checkBlacklist(post.record.text as string, blacklist)) {
            return false;
        } else if (isEmbedMediaView(post.post.embed)) {
            const embedRecordWithMedia = post.post.embed as EmbedMediaView;
            // console.log(`Quote found in post ${post.post.uri}. Checking blacklist...`);
            try {
                quoteExist = checkBlacklist((embedRecordWithMedia.record.record as ViewRecord).value.text as string);
            } catch (error) {
                // console.error(`Error checking blacklist for post ${post.post.uri}: ${error.error}`);
                return false;
            }
            return quoteExist;
        }

        if (isEmbedImagesView(post.embed)) {
            imageExist = true;
        } else if (isEmbedVideoView(post.embed)) {
            videoExist = true;
        } else if (isEmbedExternalView(post.embed)) {
            externalExist = true;
        }
    } catch (error) {
        console.error(error);
    }

    if (!imageExist && !videoExist && !externalExist && !quoteExist) {
        // let msg = ``
        // if (!imageExist && !videoExist && !externalExist) {
        //     msg = `Removing post ${post.post.uri} due to missing embed`
        // } else {
        //     msg = `Removing post ${post.post.uri} due to blacklisted word`
        // }
        // console.log(msg);
        return false;
    }
    return true;
}

async function saveToDb(post: { uri: string; cid: string; indexedAt: string; createdAt: string, tag: string }) {
    const db = getDB();
    try {
        await db.insertInto('posts')
            .values(post)
            .onConflict(oc => oc.column('uri').doNothing())
            .execute().then(() => console.log(`[Jetstream] Post saved to DB: ${post.uri}`));
    } catch (err) {
        console.error('[Jetstream] Failed to save post to DB:', err);
    }
}
