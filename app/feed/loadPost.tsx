'use client'

import './index.css';
import {PostCard} from "@/app/feed/postcard";
import {JSX, useEffect, useRef, useState} from "react";
import {FeedViewPost, PostView} from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import Loading from "@/app/feed/loading";

export default function LoadPost({type}: { type: string }) {
    const feedPath = type;
    const [feedPage, setFeedPage] = useState<JSX.Element>(loadingDiv());
    const cursorRef = useRef<string>(''); // Add this
    const [uuid, setUuid] = useState<string>('');
    const uuidRef = useRef<string>('');

    const loadNextPage = async (currentCursor: string): Promise<JSX.Element> => {
        // If you want to use the catch-all route via URL:
        const url = currentCursor
            ? `/api/posts/${feedPath}/${encodeURIComponent(currentCursor)}`
            : `/api/posts/${feedPath}/`;

        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-URI': currentCursor, // Keeping this for backward compatibility with your current setup
            }
        });

        if (!res.ok) return (<></>);
        const postReq = await res.json();

        if (!postReq || !postReq.data) {
            console.log('No data received from API, returning null...');
            return (<></>);
        }

        cursorRef.current = postReq.data.cursor as string; // Keep ref in sync
        if (postReq.data.feed.length === 0) return await loadNextPage(cursorRef.current);

        // console.log('Processing new page data...')
        // console.log(postReq.data.cursor);
        const uuid = typeof self.crypto?.randomUUID === 'function'
            ? self.crypto.randomUUID()
            // eslint-disable-next-line react-hooks/purity
            : Math.random().toString(36).substring(2, 11);
        // console.log(uuid);
        setUuid(uuid);
        uuidRef.current = uuid;
        // console.log(postReq.data.feed);
        window.dispatchEvent(new CustomEvent('load-next-page-finished'));
        window.scrollTo({top: 0, behavior: 'smooth'});
        fetch('/api/profile/notification').then(res => res.json()).then(notification => {
            if (notification) document.getElementById('notification-badge')?.classList.remove('hidden');
            else document.getElementById('notification-badge')?.classList.add('hidden');
        });
        return constructFeedPage(postReq.data.feed);
    }

    const constructFeedPage = (postData: FeedViewPost[]): JSX.Element => {
        // if (!postData) {
        //     console.log('No post data available, returning loading state...');
        //     console.log(postData);
        //     return <div className="loading" id="loading">Loading posts...</div>;
        // }
        // console.log('Constructing feed page...');
        return (
            <div className="feed-container" id={uuid}>
                {postData.map((item, index) => {
                    if (!item?.post) return null;

                    // Convert the complex ATProto object into a plain serializable JSON object
                    const serializablePost = JSON.parse(JSON.stringify(item.post));
                    return callPostCard(item.post.uri, index, serializablePost);
                })}
            </div>
        );
    }

    useEffect(() => {
        loadNextPage('').then(res => {
            setFeedPage(res);
        });

        const handleEvent = async () => {
            setFeedPage(loadingDiv());
            // Use the ref here instead of the state variable
            const nextFeed = await loadNextPage(cursorRef.current);
            setFeedPage(nextFeed);
        };

        window.addEventListener('load-next-page', handleEvent);
        return () => window.removeEventListener('load-next-page', handleEvent);
    }, []); // Empty dependency array is fine now because of the ref

    return (
        <>
            {feedPage}
        </>
    );
}

function callPostCard(key: string, postIndex: number, post: PostView) {
    return (
        <PostCard
            key={key}
            postIndex={postIndex}
            post={post}
        />
    )
}

function loadingDiv(): JSX.Element {
    return (
        <Loading/>
    )
}