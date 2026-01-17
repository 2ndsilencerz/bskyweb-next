'use client';

import {useEffect, useRef, useState} from "react";

export function PaginationButton() {
    const [copyrightText, setCopyrightText] = useState<string>('');
    const copyrightTextRef = useRef('');
    const [copyrightLink, setCopyrightLink] = useState<string>('');
    const copyrightLinkRef = useRef('');
    useEffect(() => {
        fetch('/api/background')
            .then(res => res.json())
            .then((data) => {
                const text = data.images[0].copyright;
                const link = data.images[0].copyrightlink;
                setCopyrightText(text);
                copyrightTextRef.current = text;
                setCopyrightLink(link);
                copyrightLinkRef.current = link;
            }).catch(console.error);
    }, []);

    const handleNextPage = () => {
        // Dispatch custom event that page.tsx will listen for
        window.dispatchEvent(new CustomEvent('load-next-page'));
    };

    return (
        <footer className="fixed-bottom bg-dark bg-opacity-75 border-top border-secondary py-2 text-center"
                style={{zIndex: 1000, minHeight: '60px'}}>
            <div className="container d-flex justify-content-center align-items-center position-relative">
                <button
                    className="btn btn-outline-light border-secondary rounded-pill px-4 d-flex align-items-center"
                    id="next-page-bottom"
                    title="Next Page"
                    onClick={handleNextPage}
                    style={{
                        // transition: 'opacity 0.3s',
                        // opacity: isNextPageAnimating ? 0.3 : 1
                    }}
                >
                    <span className="me-2">Next Page</span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"
                         xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 3L11 8L6 13V3Z"/>
                    </svg>
                </button>
                <a
                    href={copyrightLink}
                    target="_blank"
                    className="nav-link p-0 position-absolute end-0 me-3 d-none d-sm-flex align-items-center text-end"
                    rel="noopener noreferrer"
                    style={{color: 'white', fontSize: '0.7rem', maxWidth: '30%'}}
                >
                    {copyrightText && <span className="text-secondary text-wrap">{copyrightText}</span>}
                </a>
            </div>
        </footer>
    );
}