import axios from 'axios';
import * as cheerio from 'cheerio';

interface TwitterPost {
    id: string;
    text: string;
    timestamp?: string;
    url: string;
    images?: string[];
}

export async function getWutheringWavesPost(): Promise<TwitterPost[]> {
    const targetUrl = 'https://x.com/Wuthering_Waves';
    const maxPosts = 20;

    try {
        // Note: Twitter/X requires authentication and uses dynamic loading
        // This is a basic implementation that may need additional handling
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            timeout: 10000,
        });
        console.log(`${JSON.stringify(response.data, null, 2)}`)

        const cheerioData = cheerio.load(response.data);
        console.log('Loaded Wuthering Waves page');
        console.log(`${JSON.stringify(cheerioData, null, 2)}`)
        const posts: TwitterPost[] = [];

        // Twitter/X uses dynamic loading, so static scraping may not work well
        // This is a simplified structure - actual implementation may need to use Twitter API
        cheerioData('article').slice(0, maxPosts).each((index, element) => {
            const $element = cheerioData(element);
            const text = $element.find('[data-testid="tweetText"]').text().trim();
            const timestamp = $element.find('time').attr('datetime');
            const tweetLink = $element.find('a[href*="/status/"]').attr('href');

            // Extract images from the post
            const images: string[] = [];
            $element.find('img[src*="pbs.twimg.com/media"]').each((_, img) => {
                const src = cheerioData(img).attr('src');
                if (src) {
                    images.push(src);
                }
            });

            if (text && tweetLink) {
                const tweetId = tweetLink.split('/status/')[1]?.split('?')[0] || '';
                posts.push({
                    id: tweetId,
                    text: text,
                    timestamp: timestamp,
                    url: `https://x.com${tweetLink}`,
                    images: images.length > 0 ? images : undefined,
                });
            }
        });

        console.log(`Fetched ${posts.length} posts from Wuthering Waves`);
        return posts.slice(0, maxPosts);

    } catch (error) {
        console.error('Error fetching Wuthering Waves posts:', error);
        throw new Error(`Failed to fetch posts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}