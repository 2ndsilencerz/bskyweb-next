import {PostView} from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import {getDB} from "@/lib/db";
import {getDictionary} from "@/lib/blacklist";
import axios, {AxiosResponse} from "axios";
import {LastState} from "@/lib/db/schema";
import {randomUUID} from "node:crypto";

export async function startSearching() {
    console.log('Starting post search');
    const db = getDB();
    if (!db) {
        throw new Error('Database not initialized');
    }
    const type: string[] = []
    const dictionary = getDictionary();
    type.push(...dictionary["wuwa"], ...dictionary["miku"], ...dictionary["touhou"], ...dictionary["misc"]);
    for (const tag of type) {
        const lastState = await db
            .selectFrom('last_state')
            .select(['cursor'])
            .where('q', '=', tag)
            .executeTakeFirst() as LastState;
        void searchIndefinitely(tag, '', '').catch(console.error);
    }
}

export async function searchIndefinitely(q: string, cursor: string, since: string) {
    console.log(`Starting indefinite search for tag: ${q}`);
    // let newSince;
    // let newCursor = '';
    while (true) {
        // console.log(`Search for tag: ${q} with cursor: ${cursor} and since: ${since}`);
        // if (!newSince || newSince === '') {
        //     console.log(`Tracing new post for tag: ${q} with cursor: ${cursor} and since: ${since}`);
        //     const newResult = await searchPost(q, newCursor, '', true);
        //     newCursor = newResult.cursor ? newResult.cursor : '';
        //     newSince = new Date(newResult.since) < new Date(since) ? newResult.since : '';
        //     await new Promise(resolve => setTimeout(resolve, 5000));
        // }
        const result = await searchPost(q, cursor, since);
        cursor = result.cursor ? result.cursor : '';
        // console.log(`Search for tag: ${q} completed with new cursor: ${cursor} and since: ${since}`);
        if (Number(cursor) >= 10000) cursor = '';
        await new Promise(resolve => setTimeout(resolve, 30000));
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
        console.log(`[${new Date().toISOString()} ${uid}] Fetching feed with cursor: ${cursor} until: ${since} q: ${q}`);
        const hostname = `http://${process.env.FEEDGEN_HOSTNAME}`;
        const res = await axios.get(`${hostname}/api/post/search/${encodeURIComponent(q)}/${encodeURIComponent(cursor)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-URI': cursor, // Keeping this for backward compatibility with your current setup
                'X-SINCE': since
            }
        }).catch((e) => {
            console.error(`[${new Date().toISOString()} ${uid}] Error fetching posts: ${e.error}`);
        }).then(res => res as AxiosResponse);
        if (!res || res.status !== 200) {
            console.error(`[${new Date().toISOString()} ${uid}] Failed to fetch posts: request returned undefined or null`);
            return {cursor: cursor, since: since};
        }
        const postReq = await res.data;
        if (!postReq.data) return {cursor: cursor, since: since};
        const postViews = postReq.data.posts as PostView[];
        const db = getDB();
        if (!db) {
            console.error(`[${new Date().toISOString()} ${uid}] Database not initialized`);
            return {cursor: cursor, since: since};
        }
        if (postViews.length === 0) {
            // console.log(`[${new Date().toISOString()} ${uid}] No new posts found for tag: ${q} with cursor: ${cursor} and since: ${since}. Last response cursor: ${postReq.data.cursor}.`);
            let newCursor = '';
            if (postReq.data.cursor && Number(postReq.data.cursor) > Number(cursor)) {
                newCursor = postReq.data.cursor;
            } else {
                if (cursor) {
                    newCursor = cursor;
                } else {
                    newCursor = '0';
                }
                newCursor = (Number(newCursor) + 50).toString();
            }
            // console.log(`[${uid}] New cursor: ${newCursor}`);
            return {
                cursor: newCursor,
                since: since
            };
        }
        for (const post of postViews) {
            void db.insertInto('posts').values({
                createdAt: new Date().toISOString(),
                indexedAt: post.indexedAt,
                uri: post.uri,
                cid: post.cid,
                tag: q,
            }).onConflict(oc => oc.column('uri').doNothing())
                .execute()
                .catch((e) => console.error(`[${new Date().toISOString()} ${uid}] Error insert db posts: ${e.error}`))
        }

        // console.log(`Total updated post: ${(await db.selectFrom('posts').select('uri').distinct().execute()).length}`);
        const lastPost = postReq.data.posts[postReq.data.posts.length - 1];
        const indexedAt = lastPost.indexedAt;
        if (!old) {
            void db.insertInto('last_state').values({
                q: q,
                cursor: indexedAt,
            }).onConflict(oc => oc.column('q').doUpdateSet({cursor: indexedAt}))
                .execute().catch((e) => console.error(`[${new Date().toISOString()} ${uid}] Error insert db last_state: ${e.error}`));
        }
        // console.log(`[${new Date().toISOString()} ${uid}] New posts found for tag: ${q} with cursor: ${cursor} and since: ${since}. Last response cursor: ${postReq.data.cursor}.`);
        return {
            cursor: postReq.data.cursor ? Number(postReq.data.cursor) > Number(cursor) ? postReq.data.cursor : (Number(postReq.data.cursor) + 50).toString() : cursor ? (Number(cursor) + 50).toString() : '50',
            since: postReq.data.posts[postReq.data.posts.length - 1].indexedAt
        };
    } catch (e) {
        console.log(`[${new Date().toISOString()} ${uid}] Error searchPost with q: ${q} cursor: ${cursor}`, e);
    }
    return {cursor: cursor, since: since};
}