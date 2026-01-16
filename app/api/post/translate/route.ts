import * as deepl from 'deepl-node';

const authKey = process.env.DEEPL_API_KEY;
const deeplClient = new deepl.DeepLClient(authKey as string);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const text = body?.text;

        if (!text) {
            return Response.json({error: 'Text parameter is required'}, {status: 400});
        }

        const request = await deeplClient.translateText(
            text,
            null,
            'en-US',
        );

        // console.log(request);
        return Response.json(request, {status: 200});
    } catch (error) {
        console.error(`Error translating text: ${error}`);
        return Response.json({error: `Internal server error ${error}`}, {status: 500});
    }
}