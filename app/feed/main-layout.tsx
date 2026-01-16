import Image from "next/image";
import Link from "next/link";
import {PaginationButton} from "@/app/feed/pagination";

export default function MainLayout(title: string, children: React.ReactNode) {
    const userHandle = "chrome199523.bsky.social";
    return (
        <>
            <div className="header">
                <a href={`https://bsky.app/profile/${userHandle}`} target="_blank" rel="noopener noreferrer">
                    <Image alt="bsky-icon" src="https://web-cdn.bsky.app/static/favicon-32x32.png"
                           width={32} height={32}/>
                </a>
                <Link href="/feed/foryou" className="header-submenu">
                    <h1>{title}</h1>
                </Link>
                <div className="header-divider"></div>
                <Link href="/feed/wuwa" className="header-submenu">
                    <div style={{display: 'flex', alignItems: 'center'}}>
                    <Image src="https://cdn.bsky.app/img/avatar/plain/did:plc:dyxukde6k2muyhg2waekj2rx/bafkreiflhlucxlb6wsedzae5bg7js7qjv2pqumahmsm2t6teodloi7zamm@jpeg"
                           alt="wuwa icon"
                           width={28}
                           height={28}
                           className="header-icon">
                    </Image>
                    <h1 className="header-submenu-text">鳴潮</h1>
                    </div>
                </Link>
                <div className="header-divider"></div>
                <Link href="/feed/miku" className="header-submenu">
                    <div style={{display: 'flex', alignItems: 'center'}}>
                        <Image src="https://cdn.bsky.app/img/avatar/plain/did:plc:dyxukde6k2muyhg2waekj2rx/bafkreifux4qjcih7chotf7gyhktuviyfuxur5q4b5pr6su2g4cmqncovoy@jpeg"
                               alt="wuwa icon"
                               width={28}
                               height={28}
                               className="header-icon">
                        </Image>
                        <h1 className="header-submenu-text">初音ミク</h1>
                    </div>
                </Link>
                <div className="header-divider"></div>
                <Link href="/feed/touhou" className="header-submenu">
                    <div style={{display: 'flex', alignItems: 'center'}}>
                        <Image src="https://cdn.bsky.app/img/avatar/plain/did:plc:dyxukde6k2muyhg2waekj2rx/bafkreigkvc6f3lhm66o6q6q3rkdbxuxcrc5ki5ctncvuv6nftlhvrhy35m@jpeg"
                               alt="wuwa icon"
                               width={28}
                               height={28}
                               className="header-icon">
                        </Image>
                        <h1 className="header-submenu-text">東方Project</h1>
                    </div>
                </Link>
                <div className="header-divider"></div>
                <Link href="/feed/prsk" className="header-submenu">
                    <div style={{display: 'flex', alignItems: 'center'}}>
                        <Image src="https://cdn.bsky.app/img/avatar/plain/did:plc:dyxukde6k2muyhg2waekj2rx/bafkreic2nvie6tt7owvjzs2iablsw3xkp7ymvbfzlrmzbrkul4trqadrzq@jpeg"
                               alt="wuwa icon"
                               width={28}
                               height={28}
                               className="header-icon">
                        </Image>
                        <h1 className="header-submenu-text">PJSK</h1>
                    </div>
                </Link>
            </div>
            <div className="feed-container">
                <div id="feed">
                    {children}
                </div>
                {/*<div id="loading" className="loading" style={{display: 'none'}}>*/}
                {/*    <div className="loading-spinner"></div>*/}
                {/*    <div>Loading posts...</div>*/}
                {/*</div>*/}
                <div id="error" className="error" style={{display: 'none'}}></div>
                <div className="load-trigger" id="load-trigger"></div>
            </div>
            {/*<Script src="/index.js" strategy="afterInteractive"/>*/}
            {/*<Script src="/feed.js" strategy="afterInteractive"/>*/}
            <PaginationButton/>
        </>
    )
}