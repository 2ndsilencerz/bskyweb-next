import {PostView} from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import {getDB} from "@/lib/db";
import {getDictionary} from "@/lib/blacklist";
import axios, {AxiosResponse} from "axios";
import {LastState} from "@/lib/db/schema";
import {randomUUID} from "node:crypto";

const CONCURRENCY_LIMIT = 3;
const DELAY_BETWEEN_BATCHES_MS = 15000;

export async function startSearching() {
    console.log('Starting optimized multi-word post search');
    const db = getDB();
    if (!db) {
        throw new Error('Database not initialized');
    }

    const dictionary = getDictionary();
    const tags: string[] = Array.from(new Set([
        ...(dictionary["wuwa"] || []),
        ...(dictionary["miku"] || []),
        ...(dictionary["touhou"] || []),
        ...(dictionary["misc"] || [])
    ]));

    console.log(`Initialized post search for ${tags.length} unique tags with concurrency=${CONCURRENCY_LIMIT}`);

    // Split tags into batches for controlled concurrency
    for (let i = 0; i < tags.length; i += CONCURRENCY_LIMIT) {
        const batch = tags.slice(i, i + CONCURRENCY_LIMIT);
        for (const tag of batch) {
            void searchIndefinitely(tag).catch(err =>
                console.error(`Error in searchIndefinitely for tag ${tag}:`, err)
            );
        }
    }
}

export async function searchIndefinitely(q: string) {
    const db = getDB();
    let cursor = '';
    let since = '';

    if (db) {
        const lastState = await db
            .selectFrom('last_state')
            .select(['cursor'])
            .where('q', '=', q)
            .executeTakeFirst() as LastState | undefined;
        if (lastState?.cursor) {
            since = lastState.cursor;
        }
    }

    while (true) {
        const result = await searchPost(q, cursor, since);
        cursor = result.cursor || '';
        if (result.since) {
            since = result.since;
        }

        // if (Number(cursor) >= 10000) {
        //     cursor = '';
        // }

        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
    }
}

export async function searchPost(
    q: string,
    cursor: string,
    since: string,
    old?: boolean
) {
    const uid = randomUUID();
    try {
        const hostname = `http://${process.env.FEEDGEN_HOSTNAME}`;
        const res = await axios.get(`${hostname}/api/post/search/${encodeURIComponent(q)}/${encodeURIComponent(cursor)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-URI': cursor,
                'X-SINCE': since
            }
        }).catch((e) => {
            console.error(`[${new Date().toISOString()} ${uid}] Error fetching posts for '${q}': ${e.message || e}`);
            return null;
        }) as AxiosResponse | null;

        if (!res || res.status !== 200 || !res.data?.data) {
            return {cursor: cursor, since: since};
        }

        const postReq = res.data;
        const postViews = (postReq.data.posts || []) as PostView[];
        const db = getDB();

        if (!db) {
            console.error(`[${new Date().toISOString()} ${uid}] Database not initialized`);
            return {cursor: cursor, since: since};
        }

        if (postViews.length === 0) {
            return {
                cursor: ''
            };
        }

        const insertValues = postViews.map(post => ({
            createdAt: new Date().toISOString(),
            indexedAt: post.indexedAt,
            uri: post.uri,
            cid: post.cid,
            tag: q,
        }));

        await db.insertInto('posts')
            .values(insertValues)
            .onConflict(oc => oc.column('uri').doNothing())
            .execute()
            .catch((e) => console.error(`[${new Date().toISOString()} ${uid}] Batch insert db error for '${q}':`, e.message || e));

        const lastPost = postViews[postViews.length - 1];
        const indexedAt = lastPost.indexedAt;

        if (!old) {
            await db.insertInto('last_state').values({
                q: q,
                cursor: indexedAt,
            }).onConflict(oc => oc.column('q').doUpdateSet({cursor: indexedAt}))
                .execute()
                .catch((e) => console.error(`[${new Date().toISOString()} ${uid}] Error updating last_state for '${q}':`, e.message || e));
        }

        const nextCursor = postReq.data.cursor;
        // ? (Number(postReq.data.cursor) > Number(cursor) ? postReq.data.cursor : (Number(postReq.data.cursor) + 50).toString())
        // : (cursor ? (Number(cursor) + 50).toString() : '50');

        return {
            cursor: nextCursor,
            since: indexedAt
        };
    } catch (e: any) {
        console.error(`[${new Date().toISOString()} ${uid}] Error searchPost with q: ${q} cursor: ${cursor}`, e.message || e);
    }
    return {cursor: cursor, since: since};
}