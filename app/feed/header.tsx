import Image from "next/image";
import Link from "next/link";

export default async function Header() {
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
                    <Link href="/feed/following" className="nav-link p-0 me-3 d-flex align-items-center">
                        <Image
                            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28'%3E%3Crect width='28' height='28' fill='%23666'/%3E%3C/svg%3E"
                            alt="following icon"
                            width={28}
                            height={28}
                            className="rounded-circle border border-secondary">
                        </Image>
                        <span className="ms-2 text-white fw-bold d-none d-sm-inline">Following</span>
                    </Link>

                    <Link href="/feed/foryou" className="nav-link p-0 me-3 d-flex align-items-center">
                        <Image
                            src="https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:3guzzweuqraryl3rdkimjamk/bafkreicqcrfqgt7v4ghdwwwoaom73la7yomvyfeg3irpttf45x2flftmx4@jpeg"
                            alt="foryou icon"
                            width={28}
                            height={28}
                            className="rounded-circle border border-secondary">
                        </Image>
                        <span className="ms-2 text-white fw-bold d-none d-sm-inline">For You</span>
                    </Link>

                    <Link href="/feed/wuwa" className="nav-link p-0 me-3 d-flex align-items-center">
                        <Image
                            src="https://cdn.bsky.app/img/avatar/plain/did:plc:dyxukde6k2muyhg2waekj2rx/bafkreiflhlucxlb6wsedzae5bg7js7qjv2pqumahmsm2t6teodloi7zamm@jpeg"
                            alt="wuwa icon"
                            width={28}
                            height={28}
                            className="rounded-circle border border-secondary">
                        </Image>
                        <span className="ms-2 text-white fw-bold d-none d-sm-inline">鳴潮</span>
                    </Link>

                    <Link href="/feed/miku" className="nav-link p-0 me-3 d-flex align-items-center">
                        <Image
                            src="https://cdn.bsky.app/img/avatar/plain/did:plc:dyxukde6k2muyhg2waekj2rx/bafkreifux4qjcih7chotf7gyhktuviyfuxur5q4b5pr6su2g4cmqncovoy@jpeg"
                            alt="miku icon"
                            width={28}
                            height={28}
                            className="rounded-circle border border-secondary">
                        </Image>
                        <span className="ms-2 text-white fw-bold d-none d-sm-inline">初音ミク</span>
                    </Link>

                    <Link href="/feed/touhou" className="nav-link p-0 me-3 d-flex align-items-center">
                        <Image
                            src="https://cdn.bsky.app/img/avatar/plain/did:plc:dyxukde6k2muyhg2waekj2rx/bafkreigkvc6f3lhm66o6q6q3rkdbxuxcrc5ki5ctncvuv6nftlhvrhy35m@jpeg"
                            alt="touhou icon"
                            width={28}
                            height={28}
                            className="rounded-circle border border-secondary">
                        </Image>
                        <span className="ms-2 text-white fw-bold d-none d-sm-inline">東方Project</span>
                    </Link>

                    <Link href="/feed/prsk" className="nav-link p-0 d-flex align-items-center">
                        <Image
                            src="https://cdn.bsky.app/img/avatar/plain/did:plc:dyxukde6k2muyhg2waekj2rx/bafkreic2nvie6tt7owvjzs2iablsw3xkp7ymvbfzlrmzbrkul4trqadrzq@jpeg"
                            alt="pjsk icon"
                            width={28}
                            height={28}
                            className="rounded-circle border border-secondary">
                        </Image>
                        <span className="ms-2 text-white fw-bold d-none d-sm-inline">PJSK</span>
                    </Link>
                </div>
            </div>
        </nav>
    )
}