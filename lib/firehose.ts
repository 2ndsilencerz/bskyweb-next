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
import {IdResolver} from '@atproto/identity';
import {Firehose} from '@atproto/sync';

// Bluesky Firehose WebSocket endpoint
const FIREHOSE_ENDPOINT = process.env.FEEDGEN_SUBSCRIPTION_ENDPOINT || "wss://bsky.network";

export function startFirehose() {
    console.log('Starting Bluesky Firehose...');

    const idResolver = new IdResolver();

    const firehose = new Firehose({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        idResolver: idResolver as any,
        service: FIREHOSE_ENDPOINT,
        filterCollections: ['app.bsky.feed.post'],
        handleEvent: async (evt) => {
            try {
                if (evt.event === 'create' && evt.collection === 'app.bsky.feed.post') {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const record = evt.record as any;
                    const authorDid = evt.did;
                    const uri = evt.uri.toString();

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const postItem: any = {
                        uri,
                        cid: evt.cid.toString(),
                        author: {did: authorDid},
                        record,
                        embed: record.embed,
                    };
                    postItem.post = postItem;

                    if (await shouldCollect(postItem)) {
                        console.log(`[Firehose] Found matching post: ${record.text}`);
                        await saveToDb({
                            uri,
                            cid: evt.cid.toString(),
                            indexedAt: new Date().toISOString(),
                            createdAt: record.createdAt || new Date().toISOString(),
                            tag: 'firehose',
                        });
                    }
                }
            } catch (err) {
                console.error('[Firehose] Error processing event:', err);
            }
        },
        onError: (err) => {
            console.error('[Firehose] Error in Firehose stream:', err);
        }
    });

    firehose.start().catch((err) => {
        console.error('[Firehose] Failed to start Firehose:', err);
        console.log('[Firehose] Reconnecting in 5s...');
        setTimeout(startFirehose, 5000);
    });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function shouldCollect(post: any): Promise<boolean> {
    const dictionary = getDictionary();
    const text = post.record?.text;
    if (!text) return false;

    const type: string[] = []
    type.push(...dictionary["wuwa"], ...dictionary["miku"], ...dictionary["touhou"], ...dictionary["misc"]);
    if (!type.includes(text) && !text.includes(type)) {
        return false;
    }

    console.log(`[Firehose] Post contains keyword, checking further...`)

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
            } catch {
                quoteExist = false;
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
            .execute().then(() => console.log(`[Firehose] Post saved to DB: ${post.uri}`));
    } catch (err) {
        console.error('[Firehose] Failed to save post to DB:', err);
    }
}
