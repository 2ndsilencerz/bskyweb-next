'use client';

import {PostView} from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import {
    isView as isEmbedImagesView,
    View as EmbedImagesView,
    ViewImage
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
import Image from "next/image";
import React, {JSX, useRef, useState} from "react";
import {TextResult} from "deepl-node";
import axios from "axios";
import {ViewRecord} from "@atproto/api/dist/client/types/app/bsky/embed/record";

// Use a safe way to escape HTML or trust React's default escaping
function convertHashtagsToLinks(text: string): (string | JSX.Element)[] {
    if (!text) return [];
    const hashtagRegex = /#[\p{L}\p{N}_]+/gu;
    const parts = text.split(hashtagRegex);
    const matches = text.match(hashtagRegex);

    const result: (string | JSX.Element)[] = [];
    parts.forEach((part, i) => {
        result.push(part);
        if (matches && matches[i]) {
            const tag = matches[i].substring(1);
            result.push(
                <a
                    key={i}
                    href={`https://bsky.app/hashtag/${encodeURIComponent(tag)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{color: '#1d9bf0', textDecoration: 'none'}}
                >
                    {matches[i]}
                </a>
            );
        }
    });
    return result;
}

function timeAgo(dateString: string): string {
    const now = new Date();
    const past = new Date(dateString);
    const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
}

export function PostCard({postIndex, post}: { postIndex: number, post: PostView }): JSX.Element {
    // Hooks must be at the very top, before any return statements
    const [isVisible, setIsVisible] = useState(true);
    const [isLiked, setIsLiked] = useState(!!post?.viewer?.like);
    const [isBookmarked, setIsBookmarked] = useState(!!post?.viewer?.bookmarked);
    const [isTranslated, setIsTranslated] = useState(false);
    const translatedRef = useRef(false);
    const [isLikeAnimating, setIsLikeAnimating] = useState(false);
    const likeAnimatedRef = useRef(false);
    const [isBookmarkAnimating, setIsBookmarkAnimating] = useState(false);
    const bookmarkAnimatedRef = useRef(false);
    const [isDeleteAnimating, setIsDeleteAnimating] = useState(false);
    const deleteAnimatedRef = useRef(false);
    const [isBlockAnimating, setIsBlockAnimating] = useState(false);
    const blockAnimatedRef = useRef(false);
    const [isMuteAnimating, setIsMuteAnimating] = useState(false);
    const muteAnimatedRef = useRef(false);
    const [isTranslateAnimating, setIsTranslateAnimating] = useState(false);
    const translateAnimatedRef = useRef(false);
    const [translatedText, setTranslatedText] = useState('');
    const translatedTextRef = useRef('');
    const [translatedFrom, setTranslatedFrom] = useState('');
    const translatedFromRef = useRef('');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [postLikes, setPostLikes] = useState<number>(post.likeCount || 0);
    const animationTemplate = 'flash 0.3s ease-in-out infinite';
    const rainbowTemplate = 'rainbow 3s linear infinite';
    let postId: string = '', postUri: string = '', postText: string = '', //postComment: string = '', 
        quotePostText: string = '', quotePostMedia, embed;
    let authorHandle: string = '', authorAvatar: string = '', authorDisplayName: string = '', initials: string = '',
        isFollowing: boolean = false;
    let timeAgoText: string = '', nsfwPost: boolean = false;
    let handleTranslate: () => Promise<void> = async () => {
        },
        handleMuteAuthor: () => Promise<void> = async () => {
        },
        handleBlockAuthor: () => Promise<void> = async () => {
        },
        handleMutePost: () => Promise<void> = async () => {
        },
        handleLike: () => Promise<void> = async () => {
        },
        handleBookmark: () => Promise<void> = async () => {
        };

    try {
        postId = post.uri.split('/').pop() || '';
        postUri = post.uri;
        postText = (post.record as { text?: string })?.text as string || '';
        // postComment = post.replyCount ? `Comment: ${post.replyCount}` : '';
        authorHandle = post.author.handle;
        authorAvatar = post.author.avatar || '';
        authorDisplayName = post.author.displayName || post.author.handle;
        timeAgoText = timeAgo(((post.record as { createdAt?: string })?.createdAt || post.indexedAt) as string);
        initials = (post.author.displayName || post.author.handle).substring(0, 1);
        nsfwPost = post.labels?.some(label =>
            ['sexual', 'porn', 'nudity'].includes(label.val)
        ) || false;
        isFollowing = Boolean(post.author.viewer?.following) || false;

        // const media = isMediaView(post.embed) ? post.embed.media : undefined;
        embed = post.embed;
        quotePostText = post.embed && isMediaView(post.embed) ?
            (((post.embed as EmbedMediaView).record.record as ViewRecord).value as {
                text?: string
            })?.text as string : '';
        quotePostMedia = post.embed && isMediaView(post.embed) ?
            (post.embed as EmbedMediaView).media : undefined;
        // console.log('quotePostMedia', JSON.stringify(quotePostMedia));

        handleTranslate = async () => {
            setIsTranslateAnimating(true);
            translateAnimatedRef.current = true;
            const res = await axios.post('/api/post/translate', {text: postText}, {
                headers: {
                    'uri': postUri,
                    'Content-Type': 'application/json',
                },
            });
            if (res.status === 200) {
                const translated = await res.data as TextResult;
                setTranslatedFrom('From: ' + translated.detectedSourceLang);
                translatedFromRef.current = translated.detectedSourceLang;
                setTranslatedText(translated.text);
                translatedTextRef.current = translated.text;
                setIsTranslated(true);
                translatedRef.current = true;
            }
            setIsTranslateAnimating(false);
            translateAnimatedRef.current = false;
        }
        handleMuteAuthor = async () => {
            setIsMuteAnimating(true);
            muteAnimatedRef.current = true;
            const res = await axios.post('/api/profile/mute', {uri: post.author.handle}, {
                headers: {
                    'uri': post.author.handle,
                    'Content-Type': 'application/json',
                },
            });
            if (res.status === 200) {
                setIsVisible(false);
                return;
            } else alert('Failed to mute author');
            setIsMuteAnimating(false);
            muteAnimatedRef.current = false;
        }
        handleBlockAuthor = async () => {
            setIsBlockAnimating(true);
            blockAnimatedRef.current = true;
            const res = await axios.post('/api/profile/block', {uri: post.author.did}, {
                headers: {
                    'uri': post.author.did,
                    'Content-Type': 'application/json',
                },
            });
            if (res.status === 200) {
                setIsVisible(false);
                return;
            } else alert('Failed to block author');
            setIsBlockAnimating(false);
            blockAnimatedRef.current = false;
        }
        handleMutePost = async () => {
            setIsDeleteAnimating(true);
            deleteAnimatedRef.current = true;
            const res = await axios.post('/api/post/mute', {uri: postUri}, {
                headers: {
                    'uri': postUri,
                    'Content-Type': 'application/json',
                },
            });
            if (res.status === 200) {
                setIsVisible(false);
                return;
            } else alert('Failed to mute post');
            setIsDeleteAnimating(false);
            deleteAnimatedRef.current = false;
        };
        handleLike = async () => {
            setIsLikeAnimating(true);
            likeAnimatedRef.current = true;
            const res = await axios.post('/api/post/like', {uri: postUri}, {
                headers: {
                    'uri': postUri,
                    'Content-Type': 'application/json',
                },
            });
            const resBody = await res.data;
            if (res.status === 200 && resBody.success) {
                setIsLiked(true);
                setPostLikes(post.likeCount ? post.likeCount + 1 : 0);
            } else alert('Failed to like post');
            setIsLikeAnimating(false);
            likeAnimatedRef.current = false;
        };
        handleBookmark = async () => {
            setIsBookmarkAnimating(true);
            bookmarkAnimatedRef.current = true;
            const res = await axios.post('/api/post/bookmark', {uri: postUri}, {
                headers: {
                    'uri': postUri,
                    'Content-Type': 'application/json',
                },
            });
            const resBody = await res.data;
            if (res.status === 200 && resBody.success) {
                setIsBookmarked(true);
            } else alert('Failed to bookmark post');
            setIsBookmarkAnimating(false);
            bookmarkAnimatedRef.current = false;
        };
    } catch (error) {
        console.error('Error in PostCard useEffect:', error);
    }

    // Auto-translate CJK text
    React.useEffect(() => {
        const containsCJK = (text: string): boolean => {
            const cjkRegex = /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/;
            return cjkRegex.test(text);
        };

        if (postText && containsCJK(postText) && !translatedRef.current && !translateAnimatedRef.current) {
            void handleTranslate();
        }
    }, [postText]);

    if (!post || !isVisible) return <></>;

    return (
        <div id={`post-${postIndex}`} className="mb-2">
            <div
                className={`card ${isLiked ? 'bg-secondary' : 'bg-black'} ${isLiked ? 'bg-opacity-25' : ''} text-white rounded-3 overflow-hidden border-0`}>
                <div className="card-body p-3">
                    <div className="d-grid align-items-start">
                        {/* Content Area */}
                        <div className="overflow-hidden d-flex flex-grow-1 align-items-center">
                            {/* Avatar */}
                            <a href={`https://bsky.app/profile/${authorHandle}`} target="_blank"
                               rel="noopener noreferrer"
                               className="me-3">
                                <div
                                    className="rounded-circle d-flex align-items-center justify-content-center overflow-hidden bg-primary"
                                    style={{width: '48px', height: '48px'}}>
                                    {authorAvatar ? (
                                        <Image src={authorAvatar} width={48} height={48}
                                               className="object-fit-cover w-100 h-100" alt="avatar" priority
                                               unoptimized decoding={"async"}/>
                                    ) : (
                                        <span className="fw-bold fs-5 text-white">{initials}</span>
                                    )}
                                </div>
                            </a>

                            <div className="d-flex justify-content-between align-items-start flex-grow-1">
                                <div style={{
                                    background: isFollowing ? 'linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)' : 'none',
                                    backgroundSize: '200% 100%',
                                    WebkitBackgroundClip: isFollowing ? 'text' : 'initial',
                                    backgroundClip: isFollowing ? 'text' : 'initial',
                                    WebkitTextFillColor: isFollowing ? 'transparent' : 'white',
                                    animation: isFollowing ? rainbowTemplate : 'none'
                                }}>
                                    <a href={`https://bsky.app/profile/${authorHandle}`} target="_blank"
                                       rel="noopener noreferrer"
                                       className="text-decoration-none fw-bold small">
                                        {authorDisplayName}
                                    </a>
                                    <div className="text-secondary small text-break">
                                        @{authorHandle}
                                        <a href={`https://bsky.app/profile/${authorHandle}/post/${postId}`}
                                           target="_blank" rel="noopener noreferrer"
                                           className="text-secondary text-decoration-none ms-1">
                                            · {timeAgoText}
                                        </a>
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="btn-group btn-group-sm ms-auto align-items-end">
                                    <button className="btn btn-outline-secondary border-0 text-white p-1"
                                            onClick={handleTranslate} disabled={isTranslated}
                                            title="Translate"
                                            style={{animation: isTranslateAnimating ? animationTemplate : ''}}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                             stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10"/>
                                            <line x1="2" y1="12" x2="22" y2="12"/>
                                            <path
                                                d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                                        </svg>
                                    </button>
                                    <button className="btn btn-outline-secondary border-0 text-white p-1"
                                            onClick={handleMuteAuthor}
                                            title="Mute Author"
                                            style={{animation: isMuteAnimating ? animationTemplate : ''}}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                             stroke="currentColor" strokeWidth="2">
                                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                                            <line x1="23" y1="9" x2="17" y2="15"/>
                                            <line x1="17" y1="9" x2="23" y2="15"/>
                                        </svg>
                                    </button>
                                    <button className="btn btn-outline-secondary border-0 text-white p-1"
                                            onClick={handleBlockAuthor}
                                            title="Block Author"
                                            style={{animation: isBlockAnimating ? animationTemplate : ''}}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                             stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10"/>
                                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                                        </svg>
                                    </button>
                                    <button className="btn btn-outline-secondary border-0 text-white p-1"
                                            onClick={handleMutePost}
                                            title="Delete"
                                            style={{animation: isDeleteAnimating ? animationTemplate : ''}}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                             stroke="currentColor" strokeWidth="2">
                                            <line x1="18" y1="6" x2="6" y2="18"/>
                                            <line x1="6" y1="6" x2="18" y2="18"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className={"overflow-hidden"}
                             style={{
                                 backgroundImage: isLiked ? 'linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)' : 'none',
                                 backgroundSize: '200% 100%',
                                 WebkitBackgroundClip: isLiked ? 'text' : 'initial',
                                 backgroundClip: isLiked ? 'text' : 'initial',
                                 // WebkitTextFillColor: isLiked ? 'transparent' : 'white',
                                 animation: isLiked ? rainbowTemplate : 'none'
                             }}
                        >
                            {/* Post Body */}
                            <div className="mt-2 small lh-base text-break">
                                {convertHashtagsToLinks(postText)}
                                {translatedText && (
                                    <div className="mt-2 p-2 bg-dark bg-opacity-25 rounded border-secondary">
                                        <em className="x-small text-secondary">{translatedFrom}</em><br/>
                                        {translatedText}
                                    </div>
                                )}
                            </div>

                            {/* Embeds (Images/Video) */}
                            <div className="mt-2 rounded-3 overflow-hidden border-0">
                                {isEmbedImagesView(embed) && <ConstructImage view={embed} nsfw={nsfwPost}/>}
                                {isEmbedVideoView(embed) &&
                                    <VideoTemplate video={(embed as EmbedVideoView).playlist} nsfw={nsfwPost}/>}
                                {isEmbedExternalView(embed) && <ExternalEmbed external={embed}/>}
                            </div>

                            {/* Quote Post */}
                            {quotePostText && quotePostMedia && (
                                <div className="mt-2 small lh-base text-break">
                                    <div>Quote</div>
                                    {convertHashtagsToLinks(quotePostText)}
                                    {isEmbedImagesView(quotePostMedia) &&
                                        <ConstructImage view={quotePostMedia as EmbedImagesView} nsfw={nsfwPost}/>}
                                    {isEmbedVideoView(quotePostMedia) &&
                                        <VideoTemplate video={(quotePostMedia as EmbedVideoView).playlist}
                                                       nsfw={nsfwPost}/>}
                                    {isEmbedExternalView(quotePostMedia) &&
                                        <ExternalEmbed external={quotePostMedia as EmbedExternalView}/>}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="d-flex justify-content-end mt-2 gap-2" style={{minHeight: '20px'}}>
                                {/*<a className={`btn btn-sm rounded-pill px-3 border-secondary text-white border-gray-700 ${postComment ? 'd-block btn-outline-secondary' : 'd-none'}`}*/}
                                {/*   href={`https://bsky.app/profile/${authorHandle}/post/${postId}`} target="_blank"*/}
                                {/*   rel="noopener noreferrer">*/}
                                {/*    {postComment}*/}
                                {/*</a>*/}
                                <button
                                    className={`btn btn-sm rounded-pill px-3 ${isLiked ? '' : ''} border-0 btn-outline-secondary`}
                                    style={{
                                        animation: isLikeAnimating ? animationTemplate : isLiked ? rainbowTemplate : 'none',
                                    }}
                                    onClick={handleLike} disabled={isLiked}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill={isLiked ? '#FF007F' : 'none'}
                                         stroke='#FF007F' strokeWidth="3">
                                        <path
                                            d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                    </svg>
                                    {/*{postLikes}*/}
                                </button>
                                <button
                                    className={`btn btn-sm rounded-pill px-3 ${isBookmarked ? '' : ''} border-0 btn-outline-secondary`}
                                    onClick={handleBookmark} disabled={isBookmarked}
                                    style={{animation: isBookmarkAnimating ? animationTemplate : ''}}>
                                    <svg width="15" height="15" viewBox="0 0 24 24"
                                         fill={isBookmarked ? '#99CCFF' : 'none'} stroke='#99CCFF' strokeWidth="3">
                                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ConstructImage({view, nsfw}: { view: EmbedImagesView, nsfw: boolean }) {
    return (
        <div>
            {view.images.map((image, idx) => (
                <ImageTemplate key={idx} image={image} nsfw={nsfw}/>
            ))}
        </div>
    );
}

function ImageTemplate({image, nsfw}: { image: ViewImage, nsfw: boolean }) {
    const [blurred, setBlurred] = useState(nsfw);
    const width = image.aspectRatio?.width || 100;
    const height = image.aspectRatio?.height || 100;
    return (
        <Image
            src={image.fullsize}
            width={width}
            height={height}
            alt={image.alt || ''}
            className={`rounded-2 w-100 h-auto mb-2 flex-grow-1`}
            style={{maxWidth: '100%', filter: blurred ? 'blur(5px)' : ''}}
            onClick={() => setBlurred(!blurred)}
            priority
            unoptimized
            decoding={"async"}
        />
    );
}

// ... update VideoTemplate and ExternalEmbed similarly (Capitalized names, React patterns) ...
function VideoTemplate({video, nsfw}: { video: string, nsfw: boolean }) {
    const [blurred, setBlurred] = useState(nsfw);
    return (
        <video
            src={video}
            controls={!blurred}
            className={`rounded-2 w-100 h-auto mb-2 flex-grow-1`}
            style={{maxWidth: '100%', filter: blurred ? 'blur(5px)' : ''}}
            onClick={() => setBlurred(false)}
        />
    );
}

function ExternalEmbed({external}: { external: EmbedExternalView }) {
    return (
        <a
            href={external.external.uri}
            target="_blank"
            rel="noopener noreferrer"
            className="d-block rounded-3 text-decoration-none text-white"
        >
            {external.external.thumb && (
                <Image
                    src={external.external.thumb}
                    width="500"
                    height="200"
                    className="rounded-2 w-100 h-auto mb-2"
                    alt={external.external.title || ''}
                    style={{maxWidth: '100%'}}
                    priority
                    unoptimized
                    decoding={"async"}
                />
            )}
            <div className="p-3">
                <div className="fw-semibold text-white mb-2 fs-6">
                    {external.external.title || ''}
                </div>
                <div className="text-secondary mb-2" style={{fontSize: "0.875rem"}}>
                    {external.external.description.length > 100 ?
                        external.external.description.substring(0, 100) + '...' :
                        external.external.description || ''}
                </div>
                <div className="text-secondary small d-flex align-items-center gap-1">
                    <span>🔗</span>
                    <span className="text-truncate">{new URL(external.external.uri).hostname}</span>
                </div>
            </div>
        </a>
    );
}