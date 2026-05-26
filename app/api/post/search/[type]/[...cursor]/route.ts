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
import {getBlacklist, getDictionary} from "@/lib/blacklist";
import {getBlocklist} from "@/lib/blocklist";
import {getMuteList} from "@/lib/mutelist";
import {checkBlacklist, checkBlocklist, checkMuteList} from "@/app/api/posts/[type]/[...cursor]/route";

const postPerPageLimit = 5;
// const CJK_REGEX = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f\u3131-\u318e\uac00-\ud7a3]/;
let blacklist: string[] = [];
let blockList: string[] = [];
let muteLists: string[] = [];

// type FeedRequest = {
//     feed: string,
//     limit: number,
//     cursor?: string,
// }

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

export async function posts(cursor: string, type: string): Promise<false | AppBskyFeedSearchPosts.Response> {
    const maxRetries = 3;

    try {
        const agent = await getAgent();

        blacklist = getBlacklist();
        blockList = await getBlocklist();
        muteLists = await getMuteList();

        // let feedUrl = '';
        // let isTimeline = false;
        // if (type && type === 'following') {
        //     isTimeline = true;
        // } else if (type) {
        //     const savedFeeds = await getSavedFeeds();
        //     const feedItem = savedFeeds.filter((feed) => feed.uri.includes(type));
        //     feedUrl = feedItem[0].uri;
        // }
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
        const wordlist = getDictionary()[type];

        console.log(`Fetching feed with cursor: ${cursor}`);
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // const feedReq: FeedRequest = {
                //     feed: !isTimeline ? feedUrl : '',
                //     limit: postPerPageLimit,
                //     cursor: cursor != 'x' ? cursor : '',
                // }

                const feedRes = await Promise.all(
                    wordlist.map((tag) =>
                        agent.app.bsky.feed.searchPosts({
                            q: `#${tag}`,
                            sort: 'latest',
                            limit: postPerPageLimit,
                            cursor: cursor !== 'x' ? cursor : undefined,
                        }).catch((error) => {
                            console.error(`Search failed for tag ${tag}:`, error);
                            return null;
                        }).then(res => res as AppBskyFeedSearchPosts.Response)
                    )
                );

                let posts = feedRes
                    .filter((res): res is AppBskyFeedSearchPosts.Response => res !== null)
                    .flatMap((res) => res.data.posts);

                // console.log(`Feed: ${JSON.stringify(feedRes)}`)
                posts = posts.filter((post) => {
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
                posts = posts.filter((post) => {
                    if (seenUris.has(post.uri)) {
                        console.log(`Removing duplicate post: ${post.uri}`);
                        return false;
                    }
                    seenUris.add(post.uri);
                    return true;
                });
                if (feedRes && feedRes.at(0)) {
                    (feedRes.at(0) as AppBskyFeedSearchPosts.Response).data.posts = posts
                }
                return (feedRes.at(0) as AppBskyFeedSearchPosts.Response);
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

// function checkBlacklist(text: string) {
//     const blacklists = getBlacklist();
//     const matchedBlacklistTerms: string[] = [];
//     for (const tag of blacklists) {
//         const isStrict = tag.startsWith('#');
//         const normalizedTag = isStrict ? tag.substring(1) : tag;
//         const escapedTag = normalizedTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
//
//         let regex;
//         const hasCJK = CJK_REGEX.test(normalizedTag);
//
//         if (isStrict) {
//             // If tag starts with #, it MUST match a hashtag in the text.
//             regex = new RegExp(`(?<![\\p{L}\\p{N}])#${escapedTag}(?![\\p{L}\\p{N}])`, 'ui');
//         } else {
//             if (hasCJK) {
//                 // Fuzzy matching for CJK tags without #
//                 regex = new RegExp(`#?${escapedTag}`, 'ui');
//             } else {
//                 // Strict word boundary matching for Latin
//                 regex = new RegExp(`(?<![\\p{L}\\p{N}])#?${escapedTag}(?![\\p{L}\\p{N}])`, 'ui');
//             }
//         }
//
//         if (regex.test(text)) {
//             matchedBlacklistTerms.push(tag);
//         }
//     }
//     const result = matchedBlacklistTerms.length > 0;
//     // console.log(`Checked against ${blacklists.length} Blacklisted words`);
//     if (result) console.log(`From ${blacklists.length} Blacklisted word found: ${matchedBlacklistTerms.join(', ')}`);
//     return result;
// }
//
// function checkBlocklist(did: string) {
//     const result = blockList.some(word => did.includes(word.toLowerCase()));
//     if (result) console.log(`From ${blockList.length} Blocklisted account found: ${did}`);
//     return result;
// }
//
// function checkMuteList(did: string) {
//     const result = muteLists.some(word => word.includes(did.toLowerCase()));
//     if (result) console.log(`From ${muteLists.length} Muted account found: ${did}`);
//     return result;
// }
//
// function checkDictionary(text: string) {
//     const dictionary = getDictionary();
//     const matchedDictionaryTerms: string[] = [];
//     for (const tag of dictionary) {
//         const isStrict = tag.startsWith('#');
//         const normalizedTag = isStrict ? tag.substring(1) : tag;
//         const escapedTag = normalizedTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
//
//         let regex;
//         const hasCJK = CJK_REGEX.test(normalizedTag);
//
//         if (isStrict) {
//             // If tag starts with #, it MUST match a hashtag in the text.
//             regex = new RegExp(`(?<![\\p{L}\\p{N}])#${escapedTag}(?![\\p{L}\\p{N}])`, 'ui');
//         } else {
//             if (hasCJK) {
//                 // Fuzzy matching for CJK tags without #
//                 regex = new RegExp(`#?${escapedTag}`, 'ui');
//             } else {
//                 // Strict word boundary matching for Latin
//                 regex = new RegExp(`(?<![\\p{L}\\p{N}])#?${escapedTag}(?![\\p{L}\\p{N}])`, 'ui');
//             }
//         }
//
//         if (regex.test(text)) {
//             matchedDictionaryTerms.push(tag);
//         }
//     }
//     const result = matchedDictionaryTerms.length > 0;
//     if (result) console.log(`From ${dictionary.length} Dictionary word found: ${matchedDictionaryTerms.join(', ')}`);
//     return result;
// }