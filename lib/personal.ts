import {getDB} from "@/lib/db";
import {PostView} from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import {getAgent} from "@/lib/bsky";
import {checkBlacklist, checkBlocklist, checkMuteList} from "@/app/api/posts/[type]/[...cursor]/route";
import {
    isView as isEmbedImagesView,
    View as EmbedImagesView
} from "@atproto/api/dist/client/types/app/bsky/embed/images";
import {
    isView as isMediaView,
    View as EmbedMediaView
} from "@atproto/api/dist/client/types/app/bsky/embed/recordWithMedia";
import {isView as isEmbedVideoView, View as EmbedVideoView} from "@atproto/api/dist/client/types/app/bsky/embed/video";
import {
    isView as isEmbedExternalView,
    View as EmbedExternalView
} from "@atproto/api/dist/client/types/app/bsky/embed/external";
import {getBlacklist} from "@/lib/blacklist";
import {getBlocklist} from "@/lib/blocklist";
import {getMuteList} from "@/lib/mutelist";


export async function getPersonalFeed(limit: number, cursor: number) {
    const db = getDB();
    const posts = await db
        .selectFrom('posts')
        .selectAll()
        .orderBy('indexedAt', 'desc')
        .limit(limit)
        .offset(cursor)
        .execute()
        .catch((err) => {
            console.error(`Error fetching personal feed: ${err.error}`)
        })
        .then(res => res)

    if (!posts || posts.length === 0) {
        return [];
    }

    const blacklist = getBlacklist();
    const blockList = await getBlocklist();
    const muteLists = await getMuteList();

    const agent = await getAgent();
    const postViews: PostView[] = [];
    for (const post of posts) {
        const postView = await agent.app.bsky.feed.getPosts({
            uris: [post.uri]
        }).catch((err) => {
            console.error(`Error fetching post view for ${post.uri}: ${err.error}`)
        }).then(res => res && res.success ? res.data : null);

        if (!postView) continue;

        postView.posts = postView.posts.filter((post) => {
            let embed;
            let imageExist, videoExist, externalExist;
            try {
                if (checkBlocklist(post.author.did, blockList)) {
                    void db.deleteFrom('posts')
                        .where('uri', '=', post.uri)
                        .execute();
                    return false;
                } else if (checkMuteList(post.author.did, muteLists)) {
                    void db.deleteFrom('posts')
                        .where('uri', '=', post.uri)
                        .execute();
                    return false;
                } else if (post.viewer?.threadMuted) {
                    console.log(`Post ${post.uri} is muted`);
                    return false;
                } else if (post.record && post.record.text &&
                    // !checkDictionary(post.post.record.text as string) &&
                    checkBlacklist(post.record.text as string, blacklist)) {
                    return false;
                }

                if (isEmbedImagesView(post.embed) || (isMediaView(post.embed) && isEmbedImagesView((post.embed as EmbedMediaView).media))) {
                    embed = (post.embed || (post.embed as EmbedMediaView).media) as EmbedImagesView;
                    imageExist = !(embed.images == null || embed.images.length == 0);
                } else if (isEmbedVideoView(post.embed) || (isMediaView(post.embed) && isEmbedVideoView((post.embed as EmbedMediaView).media))) {
                    embed = (post.embed || (post.embed as EmbedMediaView).media) as EmbedVideoView;
                    videoExist = !(embed.playlist == null || embed.playlist.length == 0);
                } else if (isEmbedExternalView(post.embed) || (isMediaView(post.embed) && isEmbedExternalView((post.embed as EmbedMediaView).media))) {
                    embed = (post.embed || (post.embed as EmbedMediaView).media) as EmbedExternalView;
                    externalExist = !(embed.external?.uri == undefined || embed.external.uri == '');
                }
            } catch (error) {
                console.error(error);
            }

            if (!imageExist && !videoExist && !externalExist) {
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
        });
        const seenUris = new Set<string>();
        postView.posts = postView.posts.filter((post) => {
            if (seenUris.has(post.uri)) {
                console.log(`Removing duplicate post: ${post.uri}`);
                return false;
            }
            seenUris.add(post.uri);
            return true;
        });

        postViews.push(postView.posts[0]);
    }

    return postViews;
}