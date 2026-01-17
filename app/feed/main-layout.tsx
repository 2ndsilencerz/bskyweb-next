import Image from "next/image";
import {PaginationButton} from "@/app/feed/pagination";
import Header from "@/app/feed/header";
import getBackground from "@/lib/background";

export default async function MainLayout(title: string, children: React.ReactNode) {
    const bgImage = await getBackground();
    return (
        <>
            <div>
                <div className="fixed-top vw-100 vh-100 z-0">
                    <div className="bg-black bg-opacity-25 vw-100 vh-100">
                        <Image src={bgImage[0]} alt="bgImage" width={1920} height={1080} preload={true}
                               className="z-n1 w-100 h-100 object-fit-cover"/>
                    </div>
                </div>
                <div className="bg-black border-bottom border-secondary min-vh-100">
                    <Header/>
                    <div className="container mt-5 mb-5 pt-3 pb-3" style={{maxWidth: '600px'}}>
                        <div id="feed">
                            {children}
                        </div>
                        <div id="error" className="error" style={{display: 'none'}}></div>
                    </div>
                </div>
                <PaginationButton/>
            </div>
        </>
    )
}