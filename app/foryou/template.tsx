import {PostView} from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import {Record as PostRecord} from "@atproto/api/dist/client/types/app/bsky/feed/post";
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
import {
    isView as isMediaView
} from "@atproto/api/dist/client/types/app/bsky/embed/recordWithMedia"
import Image from "next/image";
import {like} from "@/app/foryou/api/post/like/route";
import {bookmark} from "@/app/foryou/api/post/bookmark/route";
import {mute} from "./api/post/mute/route";
import {JSX} from "react";

function escapeHtml(text: string): string {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function convertHashtagsToLinks(text: string): string {
    if (!text) return '';
    const hashtagRegex = /#[\p{L}\p{N}_]+/gu;
    return text.replace(hashtagRegex, (hashtag) => {
        const tag = hashtag.substring(1);
        return `<a href="https://bsky.app/hashtag/${encodeURIComponent(tag)}" target="_blank" rel="noopener noreferrer" style="color: #1d9bf0; text-decoration: none;">${hashtag}</a>`;
    });
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

export function postCardTemplate(postIndex: number, post: PostView): JSX.Element {
    const postId = post.uri.split('/').pop() || '';
    const postUri = post.uri;
    const postText = post.record?.text as string || '';
    const authorHandle = post.author.handle;
    const authorAvatar = post.author.avatar;
    const authorDisplayName = post.author.displayName || post.author.handle;
    const timeAgoText = timeAgo((post.record?.createdAt || post.indexedAt) as string);
    const liked = !!post.viewer?.like;
    const bookmarked = post.viewer?.bookmarked || false;
    const initials = (post.author.displayName || post.author.handle).substring(0, 1);
    const nsfwPost = post.labels?.some(label =>
        ['sexual', 'porn', 'nudity'].includes(label.val)
    ) || false;

    // 1. Narrow Images
    // const recordEmbed = (post.record as PostRecord)?.embed;
    const media = isMediaView(post.embed) ? post.embed.media : undefined;
    const embed = post.embed || media;

    let imageElements: JSX.Element | null = null;
    if (isEmbedImagesView(embed)) {
        imageElements = constructImage(embed, nsfwPost);
    }

    // 2. Narrow Video (Playlist)
    let videoElement: JSX.Element | null = null;
    if (post.embed && post.embed.$type === 'app.bsky.embed.video#view') {
        const videoEmbed = post.embed as EmbedVideoView; // Cast safely after $type check if types are stubborn
        if (videoEmbed.playlist) {
            videoElement = videoTemplate(videoEmbed.playlist, nsfwPost);
        }
    }

    // 3. Narrow External
    let externalEmbedElement: JSX.Element | null = null;
    if (isEmbedExternalView(embed)) {
        externalEmbedElement = externalEmbed(embed);
    }

    return (
        <>
            <div className="post-card" id={`post-${postIndex}`}>
                <div className="post-header">
                    <a href={`https://bsky.app/profile/${authorHandle}`} target="_blank"
                       rel="noopener noreferrer">
                        <div className="post-avatar" style={authorAvatar ? {background: 'none'} : {}}>
                            {authorAvatar ? (
                                <Image src={authorAvatar}
                                       style={{width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover'}}
                                       alt={`${authorHandle}-avatar`}/>
                            ) : (
                                <span>{initials}</span>
                            )}
                        </div>
                    </a>
                    <div className="post-info">
                        <div>
                            <div style={{display: 'inline-grid'}}>
                                <a href={`https://bsky.app/profile/${authorHandle}`} target="_blank"
                                   rel="noopener noreferrer" style={{color: 'white', textDecoration: 'unset'}}>
                                    <span className="post-author"
                                          data-handle={authorHandle}>{escapeHtml(authorDisplayName)}</span>
                                </a>
                                <div style={{position: 'absolute', right: '10px'}}>
                                    <button id={`translate-post-${postIndex}`}
                                            style={{
                                                color: 'white',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '4px'
                                            }}
                                            title="Translate">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                             stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                                             strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <line x1="2" y1="12" x2="22" y2="12"></line>
                                            <path
                                                d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                                        </svg>
                                    </button>
                                    <button id={`mute-author-${postIndex}`}
                                            style={{
                                                color: 'white',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '4px'
                                            }}
                                            title="Mute Author">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                             stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                                             strokeLinejoin="round">
                                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                            <line x1="23" y1="9" x2="17" y2="15"></line>
                                            <line x1="17" y1="9" x2="23" y2="15"></line>
                                        </svg>
                                    </button>
                                    <button id={`block-author-${postIndex}`}
                                            style={{
                                                color: 'white',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '4px'
                                            }}
                                            title="Block Author">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                             stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                                             strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                                        </svg>
                                    </button>
                                    <button id={`delete-post-${postIndex}`}
                                            data-post-index={postIndex}
                                            style={{
                                                color: 'white',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '4px'
                                            }}
                                            title="Delete"
                                            onClick={async (e) => {
                                                addFlashingEffect(e);
                                                const muteResult = await mute(postUri);
                                                postAction(e, 'mute', muteResult, `post-${postIndex}`);
                                            }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                             stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                                             strokeLinejoin="round" style={{pointerEvents: 'none'}}>
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <br/>
                            <span className="post-handle">@{authorHandle}</span>
                            <a href={`https://bsky.app/profile/${authorHandle}/post/${postId}`}
                               target="_blank" rel="noopener noreferrer" style={{textDecoration: 'unset'}}>
                                <span className="post-time">· {timeAgoText}</span>
                            </a>
                        </div>
                    </div>
                </div>
                <div className="post-content">
                    <div hidden id="post-id-to-delete">{postUri}</div>
                    <div hidden id="post-data">{escapeHtml(JSON.stringify(post))}</div>
                    <div id={`post-content-${postIndex}`}
                         dangerouslySetInnerHTML={{__html: convertHashtagsToLinks(escapeHtml(postText))}}></div>
                    <div>{imageElements}</div>
                    {/*{post.embed?.images && post.embed.images.map((image, idx) => (*/}
                    {/*    <div key={idx}>*/}
                    {/*        {imageTemplate(image, nsfwPost)}*/}
                    {/*    </div>*/}
                    {/*))}*/}
                    {/*{post.embed?.media?.images && post.embed.media.images.map((image, idx) => (*/}
                    {/*    <div key={idx}>*/}
                    {/*        {imageTemplate(image, nsfwPost)}*/}
                    {/*    </div>*/}
                    {/*))}*/}
                    {/*{structured.postImage && structured.postImage.length > 0 &&*/}
                    {/*    structured.postImage.map((img: any, idx: number) => (*/}
                    {/*        <div key={idx}>*/}
                    {/*            {!structured.nsfwPost ? (*/}
                    {/*                <img src={img.fullsize} loading="lazy"*/}
                    {/*                     style={{width: '100%', height: 'auto', borderRadius: '8px', marginTop: '10px'}}*/}
                    {/*                     alt={img.alt || ''}/>*/}
                    {/*            ) : (*/}
                    {/*                <img src={img.fullsize} loading="lazy" style={{*/}
                    {/*                    width: '100%',*/}
                    {/*                    height: 'auto',*/}
                    {/*                    borderRadius: '8px',*/}
                    {/*                    marginTop: '10px',*/}
                    {/*                    filter: 'blur(5px)'*/}
                    {/*                }} alt={img.alt || ''} onClick={(e) => (e.currentTarget.style.filter = '')}/>*/}
                    {/*            )}*/}
                    {/*        </div>*/}
                    {/*    ))*/}
                    {/*}*/}
                    <div>{videoElement}</div>
                    {/*{post.embed?.playlist ? (*/}
                    {/*    videoTemplate(post.embed.playlist, nsfwPost)*/}
                    {/*) : post.embed?.media?.playlist ? (*/}
                    {/*    videoTemplate(post.embed.media.playlist, nsfwPost)*/}
                    {/*) : null}*/}
                    {/*{structured.embedVideoUri && (*/}
                    {/*    !structured.nsfwPost ? (*/}
                    {/*        <video src={structured.embedVideoUri} controls style={{*/}
                    {/*            width: '100%',*/}
                    {/*            height: 'auto',*/}
                    {/*            borderRadius: '8px',*/}
                    {/*            marginTop: '10px'*/}
                    {/*        }}></video>*/}
                    {/*    ) : (*/}
                    {/*        <video src={structured.embedVideoUri} controls style={{*/}
                    {/*            width: '100%',*/}
                    {/*            height: 'auto',*/}
                    {/*            borderRadius: '8px',*/}
                    {/*            marginTop: '10px',*/}
                    {/*            filter: 'blur(5px)'*/}
                    {/*        }} onClick={(e) => (e.currentTarget.style.filter = '')}></video>*/}
                    {/*    )*/}
                    {/*)}*/}
                    <div>{externalEmbedElement}</div>
                    {/*{post.embed?.external ? (*/}
                    {/*    externalEmbed(post.embed.external)*/}
                    {/*) : post.embed?.media?.external ? (*/}
                    {/*    externalEmbed(post.embed.media.external)*/}
                    {/*) : null}*/}
                    {/*{structured.embedExternalUri && (*/}
                    {/*    <a href={structured.embedExternalUri} target="_blank" rel="noopener noreferrer"*/}
                    {/*       className="external-link-preview" style={{*/}
                    {/*        display: 'block',*/}
                    {/*        marginTop: '12px',*/}
                    {/*        border: '1px solid #e1e8ed',*/}
                    {/*        borderRadius: '12px',*/}
                    {/*        overflow: 'hidden',*/}
                    {/*        textDecoration: 'none',*/}
                    {/*        color: 'inherit'*/}
                    {/*    }}>*/}
                    {/*        {structured.embedExternalThumb && (*/}
                    {/*            <img src={structured.embedExternalThumb} loading="lazy"*/}
                    {/*                 style={{width: '100%', height: '200px', objectFit: 'cover'}}*/}
                    {/*                 alt={structured.embedExternalTitle || ''}/>*/}
                    {/*        )}*/}
                    {/*        <div style={{padding: '12px'}}>*/}
                    {/*            <div style={{*/}
                    {/*                fontSize: '15px',*/}
                    {/*                fontWeight: 600,*/}
                    {/*                color: 'white',*/}
                    {/*                marginBottom: '4px'*/}
                    {/*            }}>{structured.embedExternalTitle || ''}</div>*/}
                    {/*            <div style={{*/}
                    {/*                fontSize: '14px',*/}
                    {/*                color: '#536471',*/}
                    {/*                marginBottom: '4px'*/}
                    {/*            }}>{structured.embedExternalDescription && structured.embedExternalDescription.length > 100 ? structured.embedExternalDescription.substring(0, 100) + '...' : structured.embedExternalDescription || ''}</div>*/}
                    {/*            <div style={{*/}
                    {/*                fontSize: '13px',*/}
                    {/*                color: '#536471'*/}
                    {/*            }}>🔗 {new URL(structured.embedExternalUri).hostname}</div>*/}
                    {/*        </div>*/}
                    {/*    </a>*/}
                    {/*)}*/}
                    <div className="post-actions"
                         style={{display: 'flex', justifyContent: 'flex-end', padding: '5px 5px'}}>
                        <button className="action-button"
                                style={{
                                    color: liked ? '#e0245e' : 'white',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '0 5px'
                                }} onClick={() => like(postUri)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? '#e0245e' : 'none'}
                                 stroke="currentColor" strokeWidth="2">
                                <path
                                    d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                            </svg>
                            <span>Like</span>
                        </button>
                        <button className="action-button"
                                style={{
                                    color: bookmarked ? '#1d9bf0' : 'white',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }} onClick={() => bookmark(postUri)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill={bookmarked ? '#1d9bf0' : 'none'}
                                 stroke="currentColor" strokeWidth="2">
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                            </svg>
                            <span>Bookmark</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}

function addFlashingEffect(e: React.MouseEvent<HTMLButtonElement>) {
    const button = e.currentTarget;
    const svg = button?.querySelector('svg');
    // Add flashing animation
    if (svg) svg.style.animation = 'flash 0.3s ease-in-out infinite';
}

function postAction(e: React.MouseEvent<HTMLButtonElement>, type: string, result: boolean, postDivId: string) {
    const button = e.currentTarget;
    const svg = e.currentTarget.querySelector('svg');
    if (svg) svg.style.animation = '';

    if (result) {
        if (type === 'mute') {
            const postDiv = document.getElementById(postDivId);
            postDiv?.parentElement?.removeChild(postDiv);
        } else if (type === 'like') {
            button.style.color = '#e0245e';
            if (svg) svg.style.fill = '#e0245e';
        } else if (type === 'bookmark') {
            button.style.color = '#1d9bf0';
            if (svg) svg.style.fill = '#1d9bf0';
        }

    }
}

function constructImage(view: EmbedImagesView, nsfwPost?: boolean): JSX.Element {
    return (
        <>
            {view.images.map((image, idx) => (
                <div key={idx}>
                    {imageTemplate(image, nsfwPost)}
                </div>
            ))}
        </>
    );
}

function imageTemplate(image: ViewImage, nsfwPost?: boolean | false): JSX.Element {
    if (!nsfwPost) {
        return (
            <Image src={image.fullsize} loading="lazy"
                   style={{width: "100%", height: "auto", borderRadius: "8px", marginTop: "10px"}}
                   alt={image.alt || ''}/>
        )
    }
    return (
        <Image src={image.fullsize} loading="lazy"
               style={{width: "100%", height: "auto", borderRadius: "8px", marginTop: "10px", filter: "blur(5px)"}}
               alt={image.alt || ''}
               onClick={(e) => (e.currentTarget.style.filter = "")}/>
    )
}

function videoTemplate(video: string, nsfwPost?: boolean | false): JSX.Element {
    if (!nsfwPost) {
        return (
            <video src={video} controls
                   style={{width: "100%", height: "auto", borderRadius: "8px", marginTop: "10px"}}>
            </video>
        )
    }
    return (
        <video src={video} controls
               style={{width: "100%", height: "auto", borderRadius: "8px", marginTop: "10px", filter: "blur(5px)"}}
               onClick={(e) => (e.currentTarget.style.filter = "")}>
        </video>
    )
}

function externalEmbed(external: EmbedExternalView): JSX.Element {
    return (
        <a href={external.external.uri} target="_blank" rel="noopener noreferrer"
           className="external-link-preview"
           style={{
               display: "block",
               marginTop: "12px",
               border: "1px solid #e1e8ed",
               borderRadius: "12px",
               overflow: "hidden",
               textDecoration: "none",
               color: "inherit"
           }}>
            {external.external.thumb && (
                <Image src={external.external.thumb} loading="lazy"
                       style={{width: "100%", height: "200px", objectFit: "cover"}}
                       alt={external.external.title || ''}/>
            )}
            <div style={{padding: "12px"}}>
                <div
                    style={{
                        fontSize: "15px",
                        fontWeight: "600",
                        color: "white",
                        marginBottom: "4px"
                    }}>{external.external.title || ''}</div>
                <div
                    style={{fontSize: "14px", color: "#536471", marginBottom: "4px"}}>
                    {external.external.description.length > 100 ?
                        external.external.description.substring(0, 100) + '...' :
                        external.external.description || ''}</div>
                <div style={{fontSize: "13px", color: "#536471"}}>🔗 {new URL(external.external.uri).hostname}</div>
            </div>
        </a>
    )
}