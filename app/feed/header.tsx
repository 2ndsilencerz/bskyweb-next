import Image from "next/image";
import Link from "next/link";
import {Feed, getSavedFeeds} from "@/lib/background";
import {JSX} from "react";

export default async function Header({title}: { title: string }) {
    const feeds = await getSavedFeeds();
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
            className="navbar navbar-expand-lg navbar-dark bg-dark bg-opacity-75 fixed-top px-3"
            style={{zIndex: 1000}}>
            <div className="container-fluid d-flex align-items-center">
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

                <div className="d-flex overflow-auto align-items-center">
                    {feedsMenu}
                </div>
            </div>
        </nav>
    )
}

export function FeedMenu({feed, title}: { feed: Feed, title: string }): JSX.Element {
    const feedName = feed.uri.split('/').pop() as string;
    // Simple mapping for titles
    const titles: Record<string, string> = {
        'for-you': 'For You',
        'wuwa-cf': 'Wuthering Waves',
        'hatsunemiku-cf': 'Hatsune Miku',
        'touhou-cf': 'Touhou Project',
        'prsk-custom': 'Colorful Stage'
    };
    const feedTitle = titles[feedName] || feedName.replace('-', ' ');
    const isActive = feedTitle.includes(title);

    return (
        <Link href={`/feed/${feedName}`} className="nav-link p-0 d-flex align-items-center">
            <Image
                src={feed.image}
                alt={`${feedName} icon`}
                width={28}
                height={28}
                className={`rounded-circle border ${isActive ? 'border-danger' : 'border-secondary'}`}>
            </Image>
            <span className="ms-2 me-2 text-white fw-bold d-none d-md-inline">{feedTitle}</span>
        </Link>
    )
}