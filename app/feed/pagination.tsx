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

    const handleSubmit = () => {
        const input = document.getElementById('blacklist-input') as HTMLInputElement;
        if (input && input.value.trim()) {
            fetch(`/api/moderation/mute`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'word': encodeURIComponent(input.value.trim())
                },
                body: JSON.stringify({
                    uri: input.value.trim()
                })
            }).then((res) => {
                if (!res.ok) return;
                console.log(`Success`);
                input.value = '';
            });
        }
    };

    return (
        <footer className="fixed-bottom bg-dark bg-opacity-75 border-top border-secondary py-2 text-center"
                style={{zIndex: 1000, minHeight: '60px'}}>
            <div className="container d-flex justify-content-between align-items-center position-relative">
                <div className="d-none d-sm-flex align-items-center gap-2">
                    <input
                        type="text"
                        className="form-control form-control-sm bg-dark text-light border-secondary"
                        placeholder="Enter text..."
                        style={{maxWidth: '200px'}}
                        id="blacklist-input"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleSubmit();
                            }
                        }}
                    />
                    <button
                        className="btn btn-outline-light btn-sm border-secondary rounded-pill px-3"
                        onClick={handleSubmit}
                    >
                        Submit
                    </button>
                </div>
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
                    className="nav-link p-0 d-none d-sm-flex align-items-center text-end"
                    rel="noopener noreferrer"
                    style={{color: 'white', fontSize: '0.7rem', maxWidth: '30%'}}
                >
                    {copyrightText && <span className="text-secondary text-wrap">{copyrightText}</span>}
                </a>
            </div>
        </footer>
    );
}