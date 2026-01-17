'use client';

import {PostView} from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import {
    isView as isEmbedImagesView,
    View as EmbedImagesView,
    ViewImage
} from "@atproto/api/dist/client/types/app/bsky/embed/images";
import {View as EmbedVideoView} from "@atproto/api/dist/client/types/app/bsky/embed/video";
import {
    isView as isEmbedExternalView,
    View as EmbedExternalView
} from "@atproto/api/dist/client/types/app/bsky/embed/external";
import {isView as isMediaView} from "@atproto/api/dist/client/types/app/bsky/embed/recordWithMedia";
import Image from "next/image";
import {JSX, useRef, useState} from "react";
import {TextResult} from "deepl-node";

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
    const [postLikes, setPostLikes] = useState<number>(post.likeCount || 0);
    const animationTemplate = 'flash 0.3s ease-in-out infinite';
    // useEffect(() => {
    //     if (isLikeAnimating) {
    //         const timer = setTimeout(() => {
    //             setIsLikeAnimating(false);
    //             likeAnimatedRef.current = false;
    //         }, 0);
    //         return () => clearTimeout(timer);
    //     }
    // }, [isLikeAnimating]);
    // useEffect(() => {
    //     if (isBookmarkAnimating) {
    //         const timer = setTimeout(() => {
    //             setIsBookmarkAnimating(false);
    //             bookmarkAnimatedRef.current = false;
    //         }, 0);
    //         return () => clearTimeout(timer);
    //     }
    // }, [isBookmarkAnimating]);
    // useEffect(() => {
    //     if (isDeleteAnimating) {
    //         const timer = setTimeout(() => {
    //             setIsDeleteAnimating(false);
    //             deleteAnimatedRef.current = false;
    //         }, 0);
    //         return () => clearTimeout(timer);
    //     }
    // }, [isDeleteAnimating]);
    // useEffect(() => {
    //     if (isBlockAnimating) {
    //         const timer = setTimeout(() => {
    //             setIsBlockAnimating(false);
    //             blockAnimatedRef.current = false;
    //         }, 0);
    //         return () => clearTimeout(timer);
    //     }
    // }, [isBlockAnimating]);
    // useEffect(() => {
    //     if (isMuteAnimating) {
    //         const timer = setTimeout(() => {
    //             setIsMuteAnimating(false);
    //             muteAnimatedRef.current = false;
    //         }, 0);
    //         return () => clearTimeout(timer);
    //     }
    // }, [isMuteAnimating]);

    if (!post || !isVisible) return <></>;

    const postId = post.uri.split('/').pop() || '';
    const postUri = post.uri;
    const postText = (post.record as { text?: string })?.text as string || '';
    const postComment = post.replyCount ? `Comment: ${post.replyCount}` : '';
    const authorHandle = post.author.handle;
    const authorAvatar = post.author.avatar;
    const authorDisplayName = post.author.displayName || post.author.handle;
    const timeAgoText = timeAgo(((post.record as { createdAt?: string })?.createdAt || post.indexedAt) as string);
    const initials = (post.author.displayName || post.author.handle).substring(0, 1);
    const nsfwPost = post.labels?.some(label =>
        ['sexual', 'porn', 'nudity'].includes(label.val)
    ) || false;

    const media = isMediaView(post.embed) ? post.embed.media : undefined;
    const embed = post.embed || media;

    const handleTranslate = async () => {
        setIsTranslateAnimating(true);
        translateAnimatedRef.current = true;
        const res = await fetch('/api/post/translate', {
            method: 'POST',
            headers: {
                uri: postUri,
            },
            body: JSON.stringify({text: postText})
        });
        if (res.ok) {
            const translated = await res.json() as TextResult;
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

    const handleMuteAuthor = async () => {
        setIsMuteAnimating(true);
        muteAnimatedRef.current = true;
        const res = await fetch('/api/profile/mute', {
            method: 'POST',
            headers: {
                uri: post.author.handle,
            },
            body: JSON.stringify({uri: post.author.handle})
        });
        if (res.ok) {
            setIsVisible(false);
            return;
        } else alert('Failed to mute author');
        setIsMuteAnimating(false);
        muteAnimatedRef.current = false;
    }

    const handleBlockAuthor = async () => {
        setIsBlockAnimating(true);
        blockAnimatedRef.current = true;
        const res = await fetch('/api/profile/block', {
            method: 'POST',
            headers: {
                uri: post.author.did,
            },
            body: JSON.stringify({uri: post.author.did})
        });
        if (res.ok) {
            setIsVisible(false);
            return;
        } else alert('Failed to block author');
        setIsBlockAnimating(false);
        blockAnimatedRef.current = false;
    }

    const handleMutePost = async () => {
        setIsDeleteAnimating(true);
        deleteAnimatedRef.current = true;
        const res = await fetch('/api/post/mute', {
            method: 'POST',
            headers: {
                uri: postUri,
            },
            body: JSON.stringify({uri: postUri})
        });
        if (res.ok) {
            setIsVisible(false);
            return;
        } else alert('Failed to mute post');
        setIsDeleteAnimating(false);
        deleteAnimatedRef.current = false;
    };

    const handleLike = async () => {
        setIsLikeAnimating(true);
        likeAnimatedRef.current = true;
        const res = await fetch('/api/post/like', {
            method: 'POST',
            headers: {
                uri: postUri,
            },
            body: JSON.stringify({uri: postUri})
        });
        if (res.ok) {
            setIsLiked(true);
            setPostLikes(post.likeCount ? post.likeCount + 1 : 0);
        } else alert('Failed to like post');
        setIsLikeAnimating(false);
        likeAnimatedRef.current = false;
    };

    const handleBookmark = async () => {
        setIsBookmarkAnimating(true);
        bookmarkAnimatedRef.current = true;
        const res = await fetch('/api/post/bookmark', {
            method: 'POST',
            headers: {
                uri: postUri,
            },
            body: JSON.stringify({uri: postUri})
        });
        if (res.ok) setIsBookmarked(true);
        else alert('Failed to bookmark post');
        setIsBookmarkAnimating(false);
        bookmarkAnimatedRef.current = false;
    };

    return (
        <div id={`post-${postIndex}`} className="mb-2">
            <div className="card bg-black border-secondary text-white rounded-3 overflow-hidden" style={{ minWidth: '100%', maxWidth: '600px' }}>
                <div className="card-body p-3">
                    <div className="d-flex align-items-start">
                        {/* Avatar */}
                        <a href={`https://bsky.app/profile/${authorHandle}`} target="_blank" rel="noopener noreferrer" className="me-3 shrink-0">
                            <div className="rounded-circle d-flex align-items-center justify-content-center overflow-hidden bg-primary" 
                                 style={{ width: '48px', height: '48px' }}>
                                {authorAvatar ? (
                                    <Image src={authorAvatar} width={48} height={48} className="object-fit-cover w-100 h-100" alt="avatar"/>
                                ) : (
                                    <span className="fw-bold fs-5 text-white">{initials}</span>
                                )}
                            </div>
                        </a>

                        {/* Content Area */}
                        <div className="grow">
                            <div className="d-flex justify-content-between align-items-start">
                                <div>
                                    <a href={`https://bsky.app/profile/${authorHandle}`} target="_blank" rel="noopener noreferrer" className="text-white text-decoration-none fw-bold small">
                                        {authorDisplayName}
                                    </a>
                                    <div className="text-secondary small">
                                        @{authorHandle}
                                        <a href={`https://bsky.app/profile/${authorHandle}/post/${postId}`} target="_blank" rel="noopener noreferrer" className="text-secondary text-decoration-none ms-1">
                                            · {timeAgoText}
                                        </a>
                                    </div>
                                </div>
                                
                                {/* Controls */}
                                <div className="btn-group btn-group-sm rounded-pill">
                                    <button className="btn btn-outline-secondary border-0 text-white p-1" onClick={handleTranslate} disabled={isTranslated}
                                            title="Translate" style={{animation: isTranslateAnimating ? animationTemplate : ''}}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                                    </button>
                                    <button className="btn btn-outline-secondary border-0 text-white p-1" onClick={handleMuteAuthor}
                                            title="Mute Author" style={{animation: isMuteAnimating ? animationTemplate : ''}}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                                    </button>
                                    <button className="btn btn-outline-secondary border-0 text-white p-1" onClick={handleBlockAuthor}
                                            title="Block Author" style={{animation: isBlockAnimating ? animationTemplate : ''}}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                                    </button>
                                    <button className="btn btn-outline-secondary border-0 text-white p-1" onClick={handleMutePost}
                                            title="Delete" style={{animation: isDeleteAnimating ? animationTemplate : ''}}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                    </button>
                                </div>
                            </div>

                            {/* Post Body */}
                            <div className="mt-2 small lh-base text-break">
                                {convertHashtagsToLinks(postText)}
                                {translatedText && (
                                    <div className="mt-2 p-2 bg-black rounded border-secondary">
                                        <em className="x-small text-secondary">{translatedFrom}</em><br/>
                                        {translatedText}
                                    </div>
                                )}
                            </div>

                            {/* Embeds (Images/Video) */}
                            <div className="mt-2 rounded-3 overflow-hidden border border-secondary">
                                {isEmbedImagesView(embed) && <ConstructImage view={embed} nsfw={nsfwPost}/>}
                                {post.embed?.$type === 'app.bsky.embed.video#view' && (
                                    <VideoTemplate video={(post.embed as EmbedVideoView).playlist} nsfw={nsfwPost}/>
                                )}
                                {isEmbedExternalView(embed) && <ExternalEmbed external={embed}/>}
                            </div>

                            {/* Actions */}
                            <div className="d-flex justify-content-end mt-3 gap-2 min-h-8">
                                <a className={`btn btn-sm rounded-pill px-3 border-secondary text-white border-gray-700 ${postComment ? 'd-block btn-outline-secondary' : 'd-none'}`}
                                   href={`https://bsky.app/profile/${authorHandle}/post/${postId}`} target="_blank" rel="noopener noreferrer">
                                    {postComment}
                                </a>
                                <button className={`btn btn-sm rounded-pill px-3 border-secondary ${isLiked ? 'btn-danger border-danger' : 'btn-outline-secondary text-white'}`}
                                        style={{
                                            animation: isLikeAnimating ? animationTemplate : ''
                                        }}
                                        onClick={handleLike} disabled={isLiked}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill={isLiked ? 'red' : 'none'} stroke="currentColor" strokeWidth="3">
                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                    </svg>
                                    {/*{postLikes}*/}
                                </button>
                                <button className={`btn btn-sm rounded-pill px-3 border-secondary ${isBookmarked ? 'btn-info border-info text-black' : 'btn-outline-secondary text-white'}`} 
                                        onClick={handleBookmark} disabled={isBookmarked} style={{animation: isBookmarkAnimating ? animationTemplate : ''}}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill={isBookmarked ? 'blue' : 'none'} stroke="currentColor" strokeWidth="3">
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
        <div className="post-images">
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
            loading="eager"
            alt={image.alt || ''}
            style={{
                width: "100%", height: "100%", borderRadius: "8px",
                filter: blurred ? "blur(20px)" : "none",
                cursor: blurred ? "pointer" : "default"
            }}
            onClick={() => setBlurred(false)}
        />
    );
}

// ... update VideoTemplate and ExternalEmbed similarly (Capitalized names, React patterns) ...
function VideoTemplate({video, nsfw}: { video: string, nsfw: boolean }) {
    const [blurred, setBlurred] = useState(nsfw);
    return (
        <video
            src={video}
            controls
            style={{
                width: "100%", height: "auto", borderRadius: "8px", marginTop: "10px",
                filter: blurred ? "blur(20px)" : "none",
                cursor: blurred ? "pointer" : "default"
            }}
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
            className="external-link-preview"
            style={{
                display: "block",
                marginTop: "12px",
                border: "1px solid #e1e8ed",
                borderRadius: "12px",
                overflow: "hidden",
                textDecoration: "none",
                color: "inherit"
            }}
        >
            {external.external.thumb && (
                <Image
                    src={external.external.thumb}
                    loading="eager"
                    width="500"
                    height="200"
                    style={{objectFit: "scale-down"}}
                    alt={external.external.title || ''}
                />
            )}
            <div style={{padding: "12px"}}>
                <div style={{fontSize: "15px", fontWeight: "600", color: "white", marginBottom: "4px"}}>
                    {external.external.title || ''}
                </div>
                <div style={{fontSize: "14px", color: "#536471", marginBottom: "4px"}}>
                    {external.external.description.length > 100 ?
                        external.external.description.substring(0, 100) + '...' :
                        external.external.description || ''}
                </div>
                <div style={{fontSize: "13px", color: "#536471"}}>
                    🔗 {new URL(external.external.uri).hostname}
                </div>
            </div>
        </a>
    );
}