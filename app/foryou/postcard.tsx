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
// Remove these direct imports from route files
// import {like} from "@/app/foryou/api/post/like/route";
// import {bookmark} from "@/app/foryou/api/post/bookmark/route";
// import {mute as muePost} from "./api/post/mute/route";
import {JSX, useState, useEffect, useRef} from "react";

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
    useEffect(() => {
        if (isLikeAnimating) {
            const timer = setTimeout(() => {
                setIsLikeAnimating(false);
                likeAnimatedRef.current = false;
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [isLikeAnimating]);
    useEffect(() => {
        if (isBookmarkAnimating) {
            const timer = setTimeout(() => {
                setIsBookmarkAnimating(false);
                bookmarkAnimatedRef.current = false;
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [isBookmarkAnimating]);
    useEffect(() => {
        if (isDeleteAnimating) {
            const timer = setTimeout(() => {
                setIsDeleteAnimating(false);
                deleteAnimatedRef.current = false;
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [isDeleteAnimating]);
    useEffect(() => {
        if (isBlockAnimating) {
            const timer = setTimeout(() => {
                setIsBlockAnimating(false);
                blockAnimatedRef.current = false;
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [isBlockAnimating]);
    useEffect(() => {
        if (isMuteAnimating) {
            const timer = setTimeout(() => {
                setIsMuteAnimating(false);
                muteAnimatedRef.current = false;
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [isMuteAnimating]);

    if (!post || !isVisible) return <></>;

    const postId = post.uri.split('/').pop() || '';
    const postUri = post.uri;
    const postText = (post.record as { text?: string })?.text as string || '';
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

    const handleMutePost = async () => {
        const res = await fetch('/foryou/api/post/mute', {
            method: 'POST',
            headers: {
                uri: postUri,
            },
            body: JSON.stringify({uri: postUri})
        });
        if (res.ok) setIsVisible(false);
        else alert('Failed to mute post');
    };

    const handleLike = async () => {
        setIsLikeAnimating(true);
        likeAnimatedRef.current = true;
        const res = await fetch('/foryou/api/post/like', {
            method: 'POST',
            headers: {
                uri: postUri,
            },
            body: JSON.stringify({uri: postUri})
        });
        if (res.ok) setIsLiked(true);
        else alert('Failed to like post');
        setIsLikeAnimating(false);
    };

    const handleBookmark = async () => {
        setIsBookmarkAnimating(true);
        bookmarkAnimatedRef.current = true;
        const res = await fetch('/foryou/api/post/bookmark', {
            method: 'POST',
            headers: {
                uri: postUri,
            },
            body: JSON.stringify({uri: postUri})
        });
        if (res.ok) setIsBookmarked(true);
        else alert('Failed to bookmark post');
        setIsBookmarkAnimating(false);
    };

    return (
        <div className="post-card" id={`post-${postIndex}`}>
            <div className="post-header">
                {/* ... avatar code ... */}
                <a href={`https://bsky.app/profile/${authorHandle}`} target="_blank"
                   rel="noopener noreferrer">
                    <div className="post-avatar" style={authorAvatar ? {background: 'none'} : {}}>
                        {authorAvatar ? (
                            <Image src={authorAvatar}
                                   width={48}
                                   height={48}
                                   style={{width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover'}}
                                   alt={`${authorHandle}-avatar`}/>
                        ) : (
                            <span>{initials}</span>
                        )}
                    </div>
                </a>
                <div className="post-info">
                    <div style={{display: 'flex', justifyContent: 'space-between', width: '100%'}}>
                        <div>
                            <a href={`https://bsky.app/profile/${authorHandle}`} target="_blank"
                               rel="noopener noreferrer" style={{color: 'white', textDecoration: 'unset'}}>
                                <span className="post-author">{authorDisplayName}</span>
                            </a>
                            <br/>
                            <span className="post-handle">@{authorHandle}</span>
                            <a href={`https://bsky.app/profile/${authorHandle}/post/${postId}`}
                               target="_blank" rel="noopener noreferrer" style={{textDecoration: 'unset'}}>
                                <span className="post-time">· {timeAgoText}</span>
                            </a>
                        </div>
                        <div className="post-controls">
                            <button id={`translate-post-${postIndex}`} style={{
                                color: 'white',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px'
                            }} title="Translate">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="2" y1="12" x2="22" y2="12"></line>
                                    <path
                                        d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                                </svg>
                            </button>
                            <button id={`mute-author-${postIndex}`} style={{
                                color: 'white',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                animation: isMuteAnimating ? 'flash 0.3s ease-in-out infinite' : 'none',
                            }} title="Mute Author">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                    <line x1="23" y1="9" x2="17" y2="15"></line>
                                    <line x1="17" y1="9" x2="23" y2="15"></line>
                                </svg>
                            </button>
                            <button id={`block-author-${postIndex}`} style={{
                                color: 'white',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                animation: isBlockAnimating ? 'flash 0.3s ease-in-out infinite' : 'none',
                            }} title="Block Author">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                                </svg>
                            </button>
                            <button id={`delete-post-${postIndex}`}
                                    style={{background: 'none', border: 'none', color: 'white', cursor: 'pointer'}}
                                    title="Delete" onClick={handleMutePost}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                     style={{
                                         pointerEvents: 'none', animation: isDeleteAnimating ? 'flash 0.3s ease-in-out infinite' : 'none'}}>
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="post-content">
                <div className="post-text">
                    {convertHashtagsToLinks(postText)}
                </div>
                {isEmbedImagesView(embed) && <ConstructImage view={embed} nsfw={nsfwPost}/>}
                {post.embed?.$type === 'app.bsky.embed.video#view' && (
                    <VideoTemplate video={(post.embed as EmbedVideoView).playlist} nsfw={nsfwPost}/>
                )}
                {isEmbedExternalView(embed) && <ExternalEmbed external={embed}/>}

                <div className="post-actions"
                     style={{display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px'}}>
                    <button className="action-button" style={{
                        color: isLiked ? '#e0245e' : 'white',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        paddingTop: '5px',
                        paddingRight: '10px'
                    }} onClick={handleLike}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={isLiked ? '#e0245e' : 'none'}
                             stroke="currentColor" strokeWidth="2"
                             style={{
                                 animation: isLikeAnimating ? 'flash 0.3s ease-in-out infinite' : 'none',
                             }}>
                        <path
                                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                    </button>
                    <button className="action-button" style={{
                        color: isBookmarked ? '#1d9bf0' : 'white',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        paddingTop: '5px',
                        paddingRight: '10px',
                        animation: isBookmarkAnimating ? 'flash 0.3s ease-in-out infinite' : 'none',
                    }} onClick={handleBookmark}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={isBookmarked ? '#1d9bf0' : 'none'}
                             stroke="currentColor" strokeWidth="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </button>
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
                width: "100%", height: "100%", borderRadius: "8px", marginTop: "10px",
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
                    loading="lazy"
                    style={{width: "100%", height: "200px", objectFit: "cover"}}
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