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
            let method = 'PUT';
            if (input.value.trim().startsWith('-')) {
                method = 'DELETE';
                input.value = input.value.trim().substring(1);
            }
            fetch(`/api/moderation/mute`, {
                method: method,
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
        <footer
            className="fixed-bottom bg-dark bg-opacity-75 py-2 text-center align-items-center justify-content-center"
                style={{zIndex: 1000, minHeight: '60px'}}>
            <div
                className="container d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center position-relative gap-2">
                <div className="d-flex align-items-center justify-content-between w-100 gap-2">
                    <div className="d-flex align-items-center gap-2">
                        <input
                            type="text"
                            className="form-control form-control-sm bg-dark text-white border-secondary"
                            placeholder="Enter text..."
                            style={{maxWidth: '200px', width: '120px'}}
                            id="blacklist-input"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSubmit();
                                }
                            }}
                        />
                        <button
                            className="btn btn-sm rounded-pill px-3 text-white"
                            onClick={handleSubmit}
                        >
                            Submit
                        </button>
                    </div>
                    <button
                        className="btn btn-sm rounded-pill px-4 d-flex align-items-center text-white border-0"
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
                </div>
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