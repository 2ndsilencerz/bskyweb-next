'use client';

export function PaginationButton() {
    const handleNextPage = () => {
        // Dispatch custom event that page.tsx will listen for
        window.dispatchEvent(new CustomEvent('load-next-page'));
    };

    return (
        <div className="footer">
            <button
                className="pagination-button"
                id="next-page-bottom"
                title="Next Page"
                onClick={handleNextPage}
                style={{
                    // animation: isNextPageAnimating ? 'flash 0.3s ease-in-out infinite' : 'none'
                }}
            >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 3L11 8L6 13V3Z"/>
                </svg>
            </button>
        </div>
    );
}