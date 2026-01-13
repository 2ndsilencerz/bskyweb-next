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
            >
                ▶
            </button>
        </div>
    );
}