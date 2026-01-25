import Image from "next/image";
import Link from "next/link";
import {Feed, getSavedFeeds} from "@/lib/saved-feeds";
import {JSX} from "react";
import {getProfileInfo} from "@/lib/profile";

export default async function Header({title}: { title: string }) {
    const profile = await getProfileInfo();
    const feeds: Feed[] = [];
    feeds.push({
        uri: "following",
        title: "Following",
        image: profile?.avatar || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    });
    const savedFeeds = await getSavedFeeds();
    feeds.push(...savedFeeds);
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
            className="navbar navbar-dark bg-dark bg-opacity-75 fixed-top px-3"
            style={{zIndex: 1000}}>
            <div className="container-fluid d-flex flex-wrap align-items-center">
                <a className="navbar-brand me-3" href={`https://bsky.app/profile/${userHandle}`} target="_blank"
                   rel="noopener noreferrer">
                    <div className="position-relative">
                        <Image alt="bsky-icon" src="https://web-cdn.bsky.app/static/favicon-32x32.png"
                               width={32} height={32}/>
                        <span
                            id="notification-badge"
                            className={`position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle hidden`}>
                                <span className={"visually-hidden"}>New notifications</span>
                            </span>
                    </div>
                </a>

                <button className="navbar-toggler" type="button" data-bs-toggle="collapse"
                        data-bs-target="#feedsMenuCollapse" aria-controls="feedsMenuCollapse" aria-expanded="false"
                        aria-label="Toggle navigation">
                    <span className="navbar-toggler-icon"></span>
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
        'wuwa-cf': 'Wuthering Waves',
        'hatsunemiku-cf': 'Hatsune Miku',
        'touhou-cf': 'Touhou Project',
        'prsk-custom': 'Colorful Stage'
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
                className={`rounded-circle border ${isActive ? 'border-danger' : 'border-secondary'}`}>
            </Image>
            <span className="ms-2 text-white fw-bold d-none d-md-inline">{feedTitle}</span>
        </Link>
    )
}