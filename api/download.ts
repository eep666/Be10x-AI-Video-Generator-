export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    const videoUri = url.searchParams.get('uri');

    if (!videoUri) {
      return new Response(JSON.stringify({ error: 'Video URI is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error('API_KEY environment variable not set');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const downloadUrl = `${videoUri}&key=${apiKey}`;
    
    const videoResponse = await fetch(downloadUrl);

    if (!videoResponse.ok || !videoResponse.body) {
        return new Response('Failed to fetch video from storage.', {
            status: videoResponse.status,
            statusText: videoResponse.statusText,
        });
    }

    const headers = new Headers();
    headers.set('Content-Type', videoResponse.headers.get('Content-Type') || 'video/mp4');
    headers.set('Content-Length', videoResponse.headers.get('Content-Length') || '');
    if (videoResponse.headers.get('Accept-Ranges')) {
        headers.set('Accept-Ranges', videoResponse.headers.get('Accept-Ranges'));
    }

    return new Response(videoResponse.body, {
      status: 200,
      headers: headers,
    });

  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'Failed to download video.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}