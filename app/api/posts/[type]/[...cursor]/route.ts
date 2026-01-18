import {getAgent} from '@/lib/bsky';
import {NextResponse} from "next/server";
import {AppBskyFeedGetFeed} from "@atproto/api";
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
import {getBlacklist, getDictionary} from "@/lib/blacklist";
import {getBlocklist} from "@/lib/blocklist";
import {getMuteList} from "@/lib/mutelist";

const postPerPageLimit = 10;
let blockList: string[] = [];
let muteLists: string[] = [];

type FeedRequest = {
    feed: string,
    limit: number,
    cursor?: string,
}

export async function GET(
    req: Request,
    {params}: { params: Promise<{ type: string, cursor: string[] }> }
) {
    const paramsAwait = await params;
    const type = paramsAwait.type || 'foryou';
    const cursor = paramsAwait.cursor[0] || undefined;

    const uri = req.headers.get('X-URI') || cursor || '';
    console.log(`Base route fetching with URI: ${uri}, type: ${type}`);
    return NextResponse.json(await posts(uri, type));
}

export async function posts(cursor: string, type?: string): Promise<false | AppBskyFeedGetFeed.Response> {
    const maxRetries = 3;

    try {
        const agent = await getAgent();

        blockList = await getBlocklist();
        muteLists = await getMuteList();

        let feedUrl = '';
        let isTimeline = false;
        if (type && type === 'following') {
            isTimeline = true;
        } else if (type && type === 'foryou') {
            feedUrl = `at://did:plc:3guzzweuqraryl3rdkimjamk/app.bsky.feed.generator/for-you`;
        } else if (type && type === 'wuwa') {
            feedUrl = `at://did:plc:dyxukde6k2muyhg2waekj2rx/app.bsky.feed.generator/wuwa-cf`
        } else if (type && type === 'miku') {
            feedUrl = `at://did:plc:dyxukde6k2muyhg2waekj2rx/app.bsky.feed.generator/hatsunemiku-cf`
        } else if (type && type === 'touhou') {
            feedUrl = `at://did:plc:dyxukde6k2muyhg2waekj2rx/app.bsky.feed.generator/touhou-cf`
        } else if (type && type === 'prsk') {
            feedUrl = `at://did:plc:dyxukde6k2muyhg2waekj2rx/app.bsky.feed.generator/prsk-custom`
        }

        console.log(`Fetching feed with cursor: ${cursor}`);
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const feedReq: FeedRequest = {
                    feed: !isTimeline ? feedUrl : '',
                    limit: postPerPageLimit,
                    cursor: cursor != 'x' ? cursor : '',
                }

                let feedRes;
                if (isTimeline) {
                    feedRes = await agent.app.bsky.feed.getTimeline({
                        limit: 20,
                        cursor: cursor != 'x' ? cursor : ''
                    }).catch(error => {
                        console.error(`Attempt ${attempt} failed:`, error);
                    }).then(res => res) as AppBskyFeedGetFeed.Response;
                } else {
                    feedRes = await agent.app.bsky.feed.getFeed(feedReq).catch(error => {
                        console.error(`Attempt ${attempt} failed:`, error);
                    }).then(res => res) as AppBskyFeedGetFeed.Response;
                }

                if (!feedRes) return false;

                // console.log(`Feed: ${JSON.stringify(feedRes)}`)
                feedRes.data.feed = feedRes.data.feed.filter((post) => {
                    let embed;
                    let imageExist, videoExist, externalExist;
                    try {
                        if (checkBlocklist(post.post.author.did)) {
                            return false;
                        } else if (checkMuteList(post.post.author.did)) {
                            return false;
                        } else if (post.post.viewer?.threadMuted) {
                            console.log(`Post ${post.post.uri} is muted`);
                            return false;
                        } else if (post.post.record && post.post.record.text &&
                            checkBlacklist(post.post.record.text as string) &&
                            !checkDictionary(post.post.record.text as string)) {
                            return false;
                        }

                        if (isEmbedImagesView(post.post.embed) || (isMediaView(post.post.embed) && isEmbedImagesView((post.post.embed as EmbedMediaView).media))) {
                            embed = (post.post.embed || (post.post.embed as EmbedMediaView).media) as EmbedImagesView;
                            imageExist = !(embed.images == null || embed.images.length == 0);
                        } else if (isEmbedVideoView(post.post.embed) || (isMediaView(post.post.embed) && isEmbedVideoView((post.post.embed as EmbedMediaView).media))) {
                            embed = (post.post.embed || (post.post.embed as EmbedMediaView).media) as EmbedVideoView;
                            videoExist = !(embed.playlist == null || embed.playlist.length == 0);
                        } else if (isEmbedExternalView(post.post.embed) || (isMediaView(post.post.embed) && isEmbedExternalView((post.post.embed as EmbedMediaView).media))) {
                            embed = (post.post.embed || (post.post.embed as EmbedMediaView).media) as EmbedExternalView;
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

function checkBlacklist(text: string) {
    const blacklists = getBlacklist();
    const matchedBlacklistTerms: string[] = [];
    for (const tag of blacklists) {
        if (text.toLowerCase().includes(tag.toLowerCase())) {
            matchedBlacklistTerms.push(tag);
        }
    }
    const result = matchedBlacklistTerms.length > 0;
    // console.log(`Checked against ${blacklists.length} Blacklisted words`);
    if (result) console.log(`From ${blacklists.length} Blacklisted word found: ${matchedBlacklistTerms.join(', ')}`);
    return result;
}

function checkBlocklist(did: string) {
    const result = blockList.some(word => did.includes(word.toLowerCase()));
    if (result) console.log(`From ${blockList.length} Blocklisted account found: ${did}`);
    return result;
}

function checkMuteList(did: string) {
    const result = muteLists.some(word => word.includes(did.toLowerCase()));
    if (result) console.log(`From ${muteLists.length} Muted account found: ${did}`);
    return result;
}

function checkDictionary(text: string) {
    const dictionary = getDictionary();
    const matchedDictionaryTerms: string[] = [];
    for (const tag of dictionary) {
        if (text.toLowerCase().includes(tag.toLowerCase())) {
            matchedDictionaryTerms.push(tag);
        }
    }
    const result = matchedDictionaryTerms.length > 0;
    if (result) console.log(`From ${dictionary.length} Dictionary word found: ${matchedDictionaryTerms.join(', ')}`);
    return result;
}