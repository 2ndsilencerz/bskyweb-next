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
import {getSavedFeeds} from "@/lib/saved-feeds";
import {getPersonalFeed} from "@/lib/personal";

const postPerPageLimit = 10;
const CJK_REGEX = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f\u3131-\u318e\uac00-\ud7a3]/;
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
    // console.log(`Base route fetching with URI: ${uri}, type: ${type}`);
    if (type.toLowerCase().trim() === 'personal') {
        return NextResponse.json(await personalFeed(cursor));
    }
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
        } else if (type) {
            const savedFeeds = await getSavedFeeds();
            const feedItem = savedFeeds.filter((feed) => feed.uri.includes(type));
            feedUrl = feedItem[0].uri;
        }
        //     if (type && type === 'foryou') {
        //     feedUrl = `at://did:plc:3guzzweuqraryl3rdkimjamk/app.bsky.feed.generator/for-you`;
        // } else if (type && type === 'wuwa') {
        //     feedUrl = `at://did:plc:dyxukde6k2muyhg2waekj2rx/app.bsky.feed.generator/wuwa-cf`
        // } else if (type && type === 'miku') {
        //     feedUrl = `at://did:plc:dyxukde6k2muyhg2waekj2rx/app.bsky.feed.generator/hatsunemiku-cf`
        // } else if (type && type === 'touhou') {
        //     feedUrl = `at://did:plc:dyxukde6k2muyhg2waekj2rx/app.bsky.feed.generator/touhou-cf`
        // } else if (type && type === 'prsk') {
        //     feedUrl = `at://did:plc:dyxukde6k2muyhg2waekj2rx/app.bsky.feed.generator/prsk-custom`
        // }

        // console.log(`Fetching feed with cursor: ${cursor}`);
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
                        console.error(`Attempt ${attempt} failed:`, error.error);
                    }).then(res => res) as AppBskyFeedGetFeed.Response;
                } else {
                    feedRes = await agent.app.bsky.feed.getFeed(feedReq).catch(error => {
                        console.error(`Attempt ${attempt} failed:`, error.error);
                    }).then(res => res) as AppBskyFeedGetFeed.Response;
                }

                if (!feedRes) return false;

                // console.log(`Feed: ${JSON.stringify(feedRes)}`)
                feedRes.data.feed = feedRes.data.feed.filter((post) => {
                    let embed;
                    let imageExist, videoExist, externalExist;
                    try {
                        if (post.post.author && checkBlocklist(post.post.author?.did)) {
                            return false;
                        } else if (post.post.author && checkMuteList(post.post.author?.did)) {
                            return false;
                        } else if (post.post.viewer?.threadMuted) {
                            if (post.post.uri) console.log(`Post ${post.post.uri} is muted`);
                            return false;
                        } else if (post.post.record && post.post.record.text &&
                            // !checkDictionary(post.post.record.text as string) &&
                            checkBlacklist(post.post.record.text as string)) {
                            return false;
                        }

                        if (isEmbedImagesView(post.post.embed) || (isMediaView(post.post.embed) && isEmbedImagesView((post.post.embed as EmbedMediaView).media))) {
                            embed = (isMediaView(post.post.embed) ? (post.post.embed as EmbedMediaView).media : post.post.embed) as EmbedImagesView;
                            imageExist = !(embed.images == null || embed.images.length == 0);
                        } else if (isEmbedVideoView(post.post.embed) || (isMediaView(post.post.embed) && isEmbedVideoView((post.post.embed as EmbedMediaView).media))) {
                            embed = (isMediaView(post.post.embed) ? (post.post.embed as EmbedMediaView).media : post.post.embed) as EmbedVideoView;
                            videoExist = !(embed.playlist == null || embed.playlist.length == 0);
                        } else if (isEmbedExternalView(post.post.embed) || (isMediaView(post.post.embed) && isEmbedExternalView((post.post.embed as EmbedMediaView).media))) {
                            embed = (isMediaView(post.post.embed) ? (post.post.embed as EmbedMediaView).media : post.post.embed) as EmbedExternalView;
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
                feedRes.data.feed = feedRes.data.feed.filter((post) => {
                    if (post.post.uri && seenUris.has(post.post.uri)) {
                        if (post.post.uri) console.log(`Removing duplicate post: ${post.post.uri}`);
                        return false;
                    }
                    seenUris.add(post.post.uri);
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

export function checkBlacklist(text: string, suppliedBlacklist?: string[]) {
    let blacklists;
    if (suppliedBlacklist != null) {
        blacklists = suppliedBlacklist;
    } else {
        blacklists = getBlacklist();
    }
    const matchedBlacklistTerms: string[] = [];
    for (const tag of blacklists) {
        const isStrict = tag.startsWith('#');
        const normalizedTag = isStrict ? tag.substring(1) : tag;
        const escapedTag = normalizedTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        let regex;
        const hasCJK = CJK_REGEX.test(normalizedTag);

        if (isStrict) {
            // If tag starts with #, it MUST match a hashtag in the text.
            regex = new RegExp(`(?<![\\p{L}\\p{N}])#${escapedTag}(?![\\p{L}\\p{N}])`, 'ui');
        } else {
            if (hasCJK) {
                // Fuzzy matching for CJK tags without #
                regex = new RegExp(`#?${escapedTag}`, 'ui');
            } else {
                // Strict word boundary matching for Latin
                regex = new RegExp(`(?<![\\p{L}\\p{N}])#?${escapedTag}(?![\\p{L}\\p{N}])`, 'ui');
            }
        }

        if (regex.test(text)) {
            matchedBlacklistTerms.push(tag);
        }
    }
    const result = matchedBlacklistTerms.length > 0;
    // if (result) console.log(`Blacklisted word found: ${matchedBlacklistTerms.join(', ')}`);
    return result;
}

export function checkBlocklist(did: string, suppliedBlocklist?: string[]) {
    if (blockList.length === 0 && suppliedBlocklist != null) {
        blockList = suppliedBlocklist;
    }
    const result = blockList.some(word => did.includes(word.toLowerCase()));
    // if (result) console.log(`Blocklisted account found: ${did}`);
    return result;
}

export function checkMuteList(did: string, suppliedMuteList?: string[]) {
    if (muteLists.length === 0 && suppliedMuteList != null) {
        muteLists = suppliedMuteList;
    }
    const result = muteLists.some(word => word.includes(did.toLowerCase()));
    // if (result) console.log(`Muted account found: ${did}`);
    return result;
}

function checkDictionary(text: string) {
    const dictionary = getDictionary();
    const matchedDictionaryTerms: string[] = [];
    for (const key in dictionary) {
        for (const tag of dictionary[key]) {
            const isStrict = tag.startsWith('#');
            const normalizedTag = isStrict ? tag.substring(1) : tag;
            const escapedTag = normalizedTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            let regex;
            const hasCJK = CJK_REGEX.test(normalizedTag);

            if (isStrict) {
                // If tag starts with #, it MUST match a hashtag in the text.
                regex = new RegExp(`(?<![\\p{L}\\p{N}])#${escapedTag}(?![\\p{L}\\p{N}])`, 'ui');
            } else {
                if (hasCJK) {
                    // Fuzzy matching for CJK tags without #
                    regex = new RegExp(`#?${escapedTag}`, 'ui');
                } else {
                    // Strict word boundary matching for Latin
                    regex = new RegExp(`(?<![\\p{L}\\p{N}])#?${escapedTag}(?![\\p{L}\\p{N}])`, 'ui');
                }
            }

            if (regex.test(text)) {
                matchedDictionaryTerms.push(tag);
            }
        }
    }
    const result = matchedDictionaryTerms.length > 0;
    if (result) console.log(`From ${dictionary.length} Dictionary word found: ${matchedDictionaryTerms.join(', ')}`);
    return result;
}

async function personalFeed(currentCursor?: string) {
    const limitPerPage = 10;
    if (currentCursor === 'x') currentCursor = '0';
    const cursorAsNumber = currentCursor ? parseInt(currentCursor, 10) : 0;
    const postViews = await getPersonalFeed(limitPerPage, cursorAsNumber);
    return {'posts': postViews, 'cursor': cursorAsNumber + limitPerPage}
}