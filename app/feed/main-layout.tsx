import Image from "next/image";
import {PaginationButton} from "@/app/feed/pagination";
import Header from "@/app/feed/header";

export default function MainLayout(title: string, children: React.ReactNode) {

    return (
        <>
            <div className="bg-black border-bottom border-secondary min-vh-100">
            {Header(title)}
                <div className="container mt-3 mb-5" style={{ maxWidth: '600px' }}>
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
            </div>
            {/*<Script src="/index.js" strategy="afterInteractive"/>*/}
            {/*<Script src="/feed.js" strategy="afterInteractive"/>*/}
            <PaginationButton/>
        </>
    )
}