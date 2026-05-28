import Image from "next/image";
import Link from "next/link";
import {Feed, getSavedFeeds} from "@/lib/saved-feeds";
import {JSX} from "react";
import {getProfileInfo} from "@/lib/profile";
import {LoadingSpinner, NotificationBadge} from "@/app/feed/header-client";

export default async function Header({title}: { title: string }) {
    const profile = await getProfileInfo();
    const feeds: Feed[] = [];
    const placeholderImg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    feeds.push({
        uri: "following",
        title: "Following",
        image: profile?.avatar || placeholderImg,
    });
    const savedFeeds = await getSavedFeeds();
    feeds.push(...savedFeeds);

    const personalFeed: Feed = {
        uri: 'personal',
        title: 'Personal',
        image: placeholderImg,
    }
    feeds.push(personalFeed);
    // const wuwaFeed: Feed = {
    //     uri: 'wuwa',
    //     title: 'Wuthering Waves',
    //     image: placeholderImg,
    // }
    // feeds.push(wuwaFeed);
    // const mikuFeed: Feed = {
    //     uri: 'miku',
    //     title: 'Hatsune Miku',
    //     image: placeholderImg,
    // }
    // feeds.push(mikuFeed);
    // const touhouFeed: Feed = {
    //     uri: 'touhou',
    //     title: 'Touhou Project',
    //     image: placeholderImg,
    // }
    // feeds.push(touhouFeed);
    const feedsMenu = feeds.map((feed) => {
        return <FeedMenu
            key={feed.uri}
            feed={feed}
            title={title}
        />;
    })
    const userHandle = "chrome199523.bsky.social";
    return (
        <nav
            className="navbar navbar-dark fixed-top px-3"
            style={{zIndex: 1000}}>
            <div className="container-fluid d-flex flex-wrap align-items-center">
                <a className="navbar-brand me-3" href={`https://bsky.app/profile/${userHandle}`} target="_blank"
                   rel="noopener noreferrer">
                    <div className="position-relative">
                        <Image alt="bsky-icon" src="https://web-cdn.bsky.app/static/favicon-32x32.png"
                               width={32} height={32} priority unoptimized decoding={"async"}/>
                        <NotificationBadge/>
                    </div>
                </a>

                <LoadingSpinner/>

                <button className="navbar-toggler border-0" type="button" data-bs-toggle="collapse"
                        data-bs-target="#feedsMenuCollapse" aria-controls="feedsMenuCollapse" aria-expanded="false"
                        aria-label="Toggle navigation">
                    <span className="navbar-toggler-icon border-0"></span>
                </button>
                <div className="navbar-collapse collapse" id="feedsMenuCollapse">
                    <div className="d-flex overflow-auto align-items-center">
                        {feedsMenu}
                    </div>
                </div>
            </div>
        </nav>
    )
}

export function FeedMenu({feed, title}: { feed: Feed, title: string }): JSX.Element {
    const feedName = feed.uri.split('/').pop() as string;
    // Simple mapping for titles
    const titles: Record<string, string> = {
        'following': 'Following',
        'for-you': 'For You',
        'personal': 'Personal',
        'wuwa': 'Wuthering Waves',
        'miku': 'Hatsune Miku',
        'touhou': 'Touhou Project',
    };
    const feedTitle = titles[feedName] || feedName.replace('-', ' ');
    const isActive = feedTitle.includes(title);

    return (
        <Link href={`/feed/${feedName}`} className="nav-link p-0 d-flex align-items-center me-2">
            <Image
                src={feed.image}
                alt={`${feedName} icon`}
                width={28}
                height={28}
                className={`rounded-circle border ${isActive ? 'border-danger' : 'border-secondary'}`}
                priority
                unoptimized
                decoding={"async"}>
            </Image>
            <span className="ms-2 text-white fw-bold d-none d-md-inline">{feedTitle}</span>
        </Link>
    )
}