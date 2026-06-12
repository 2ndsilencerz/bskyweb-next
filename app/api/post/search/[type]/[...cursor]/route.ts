import {getAgent} from '@/lib/bsky';
import {NextResponse} from "next/server";
import {AppBskyFeedSearchPosts} from "@atproto/api";
import {isView as isEmbedImagesView,} from "@atproto/api/dist/client/types/app/bsky/embed/images";
import {isView as isEmbedVideoView} from "@atproto/api/dist/client/types/app/bsky/embed/video";
import {isView as isEmbedExternalView} from "@atproto/api/dist/client/types/app/bsky/embed/external";
import {
    isView as isEmbedMediaView,
    View as EmbedMediaView
} from "@atproto/api/dist/client/types/app/bsky/embed/recordWithMedia";
import {getBlacklist} from "@/lib/blacklist";
import {getBlocklist} from "@/lib/blocklist";
import {getMuteList} from "@/lib/mutelist";
import {checkBlacklist, checkBlocklist, checkMuteList} from "@/app/api/posts/[type]/[...cursor]/route";
import {ViewRecord} from "@atproto/api/dist/client/types/app/bsky/embed/record";

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
                        } else if (isEmbedMediaView(post.embed) && ((post.embed as EmbedMediaView).record.record as ViewRecord).value.text) {
                            const embedMedia = post.embed as EmbedMediaView;
                            // console.log(`Quote found in post ${post.uri}. Checking blacklist...`);
                            try {
                                quoteExist = checkBlacklist((embedMedia.record.record as ViewRecord).value.text as string);
                            } catch (error) {
                                // console.error(`Error checking blacklist for post ${post.uri}: ${error.error}`);
                                return false;
                            }
                            return quoteExist;
                        }

                        if (isEmbedImagesView(post.embed)) {
                            // console.log(`Image found in post ${post.uri}`);
                            imageExist = true;
                        } else if (isEmbedVideoView(post.embed)) {
                            // console.log(`Video found in post ${post.uri}`);
                            videoExist = true;
                        } else if (isEmbedExternalView(post.embed)) {
                            // console.log(`External link found in post ${post.uri}`);
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
                });
                const seenUris = new Set<string>();
                feedRes.data.posts = feedRes.data.posts.filter((post) => {
                    let embedUri = "";
                    if (post.embed && (post.embed as EmbedMediaView) && (post.embed as EmbedMediaView).record &&
                        (post.embed as EmbedMediaView).record.record &&
                        ((post.embed as EmbedMediaView).record.record as ViewRecord).uri) {
                        embedUri = ((post.embed as EmbedMediaView).record.record as ViewRecord).uri;
                    }
                    if (seenUris.has(post.uri) || embedUri && seenUris.has(embedUri)) {
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