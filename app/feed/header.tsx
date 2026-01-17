import Image from "next/image";
import Link from "next/link";

export default function Header(title: string = "Bsky Feed") {
    const userHandle = "chrome199523.bsky.social";
    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-black bg-opacity-75 sticky-top border-bottom border-secondary px-3" style={{ zIndex: 1000 }}>
            <div className="container-fluid d-flex align-items-center">
                <a className="navbar-brand me-3" href={`https://bsky.app/profile/${userHandle}`} target="_blank" rel="noopener noreferrer">
                    <Image alt="bsky-icon" src="https://web-cdn.bsky.app/static/favicon-32x32.png"
                           width={32} height={32}/>
                </a>

                <div className="d-flex overflow-auto align-items-center">
                    <Link href="/feed/foryou" className="nav-link p-0 me-3 d-flex align-items-center">
                        <Image
                            src="https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:3guzzweuqraryl3rdkimjamk/bafkreicqcrfqgt7v4ghdwwwoaom73la7yomvyfeg3irpttf45x2flftmx4@jpeg"
                            alt="wuwa icon"
                            width={28}
                            height={28}
                            className="rounded-circle border border-secondary">
                        </Image>
                        <h1 className="h5 mb-0 text-white">{title}</h1>
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