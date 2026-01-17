'use client';

export function PaginationButton() {
    const handleNextPage = () => {
        // Dispatch custom event that page.tsx will listen for
        window.dispatchEvent(new CustomEvent('load-next-page'));
    };

    return (
        <footer className="fixed-bottom bg-black bg-opacity-75 border-top border-secondary py-2 text-center" style={{ zIndex: 1000 }}>
            <div className="container d-flex justify-content-center align-items-center">
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
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 3L11 8L6 13V3Z"/>
                    </svg>
                </button>
            </div>
        </footer>
    );
}