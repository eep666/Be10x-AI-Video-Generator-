import { GoogleGenAI } from '@google/genai';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { prompt, imageBytes } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error('API_KEY environment variable not set');
      return new Response(JSON.stringify({ error: 'Server configuration error: API key not set.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const modelConfig: any = {
      model: 'veo-2.0-generate-001',
      prompt,
      config: {
        numberOfVideos: 1,
      },
    };

    if (imageBytes) {
      modelConfig.image = {
        imageBytes,
        mimeType: 'image/png',
      };
    }

    const operation = await ai.models.generateVideos(modelConfig);

    return new Response(JSON.stringify({ operation }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (e: any) {
    console.error(e);
    const errorMessage = e.message || 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}