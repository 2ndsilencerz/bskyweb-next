import './index.css';
import { post } from "@/app/foryou/api/posts/[...cursor]/route";
import { PostCard } from "@/app/foryou/template";

export default async function ForYou() {
    const postData = await post('');
    if (!postData || !postData.data.feed) return null;

    return (
        <div className="feed-container">
            {postData.data.feed.map((item, index) => (
                <PostCard key={item.post.uri} postIndex={index} post={item.post} />
            ))}
        </div>
    );
}