import './index.css';
import { post } from "@/app/foryou/api/posts/[...cursor]/route";
import { PostCard } from "@/app/foryou/postcard";

let cursor: string | undefined;

export default async function ForYou() {
    const postData = await post('');
    if (!postData || !postData.data.feed) return null;

    cursor = postData.data.cursor;
    return (
        <div className="feed-container">
            {postData.data.feed.map((item, index) => {
                if (!item?.post) return null;
                
                // Convert the complex ATProto object into a plain serializable JSON object
                const serializablePost = JSON.parse(JSON.stringify(item.post));

                return (
                    <PostCard 
                        key={item.post.uri} 
                        postIndex={index} 
                        post={serializablePost} 
                    />
                );
            })}
        </div>
    );
}