import LoadPost from "@/app/feed/loadPost";

// This function tells Next.js which routes to pre-render
export async function generateStaticParams() {
    // List all the feed types you want to export as HTML
    // Example: /feed/foryou, /feed/discover
    const types = ['foryou', 'discover', 'popular'];

    return types.map((type) => ({
        type: type,
    }));
}

export default async function ForYou({params}: { params: Promise<{ type: string }> }) {
    const {type: rawType} = await params;
    const type = rawType || 'foryou';

    return <LoadPost type={type}/>;
}