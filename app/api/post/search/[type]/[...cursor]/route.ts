import {getAgent} from '@/lib/bsky';
import {NextResponse} from "next/server";
import {AppBskyFeedSearchPosts} from "@atproto/api";
import {
    isView as isEmbedImagesView,
    View as EmbedImagesView,
} from "@atproto/api/dist/client/types/app/bsky/embed/images";
import {isView as isEmbedVideoView, View as EmbedVideoView} from "@atproto/api/dist/client/types/app/bsky/embed/video";
import {
    isView as isEmbedExternalView,
    View as EmbedExternalView
} from "@atproto/api/dist/client/types/app/bsky/embed/external";
import {
    isView as isMediaView,
    View as EmbedMediaView
} from "@atproto/api/dist/client/types/app/bsky/embed/recordWithMedia";
import {getBlacklist} from "@/lib/blacklist";
import {getBlocklist} from "@/lib/blocklist";
import {getMuteList} from "@/lib/mutelist";
import {checkBlacklist, checkBlocklist, checkMuteList} from "@/app/api/posts/[type]/[...cursor]/route";

let blacklist: string[] = [];
let blockList: string[] = [];
let muteLists: string[] = [];

export async function GET(
    req: Request,
    {params}: { params: Promise<{ type: string, cursor: string[] }> }
) {
    const paramsAwait = await params;
    const type = paramsAwait.type || 'foryou';
    const cursor = paramsAwait.cursor[0] || undefined;

    const uri = req.headers.get('X-URI') || cursor || '';
    const since = req.headers.get('X-SINCE') || '';

    // console.log(`Base route fetching with URI: ${uri}, type: ${type}`);
    return NextResponse.json(await posts(uri, type, since));
}

export async function posts(cursor: string, type: string, since: string): Promise<false | AppBskyFeedSearchPosts.Response> {
    const maxRetries = 3;

    try {
        const agent = await getAgent();

        blacklist = getBlacklist();
        blockList = await getBlocklist();
        muteLists = await getMuteList();

        // console.log(`Fetching feed with q: ${type} cursor: ${cursor}`);
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const feedRes = await agent.app.bsky.feed.searchPosts({
                    q: '#' + type,
                    cursor: cursor !== 'x' ? cursor : undefined,
                    limit: 50,
                    tag: [type],
                    until: since
                }).catch((error) => {
                    console.error(`Search failed:`, error.error);
                    return false;
                }).then(res => res as AppBskyFeedSearchPosts.Response);

                if (!feedRes) return false;

                // console.log(`Feed: ${JSON.stringify(feedRes)}`)
                feedRes.data.posts = feedRes.data.posts.filter((post) => {
                    let embed;
                    let imageExist, videoExist, externalExist;
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
                        }

                        if (isEmbedImagesView(post.embed) || (isMediaView(post.embed) && isEmbedImagesView((post.embed as EmbedMediaView).media))) {
                            embed = (isMediaView(post.embed) ? (post.embed as EmbedMediaView).media : post.embed) as EmbedImagesView;
                            imageExist = !(embed.images == null || embed.images.length == 0);
                        } else if (isEmbedVideoView(post.embed) || (isMediaView(post.embed) && isEmbedVideoView((post.embed as EmbedMediaView).media))) {
                            embed = (isMediaView(post.embed) ? (post.embed as EmbedMediaView).media : post.embed) as EmbedVideoView;
                            videoExist = !(embed.playlist == null || embed.playlist.length == 0);
                        } else if (isEmbedExternalView(post.embed) || (isMediaView(post.embed) && isEmbedExternalView((post.embed as EmbedMediaView).media))) {
                            embed = (isMediaView(post.embed) ? (post.embed as EmbedMediaView).media : post.embed) as EmbedExternalView;
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
                feedRes.data.posts = feedRes.data.posts.filter((post) => {
                    if (seenUris.has(post.uri)) {
                        console.log(`Removing duplicate post: ${post.uri}`);
                        return false;
                    }
                    seenUris.add(post.uri);
                    return true;
                });
                return feedRes;
            } catch (error) {
                console.error(`Attempt ${attempt} failed:`, error);
                if (attempt === maxRetries) throw error;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    } catch (error) {
        return false;
    }
    return false;
}