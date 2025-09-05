/* tslint:disable */
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI } from 'https://esm.sh/@google/genai@^1.4.0';

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise(async (resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      resolve(url.split(',')[1]);
    };
    reader.readAsDataURL(blob);
  });
}

function downloadFile(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function generateContent(prompt: string, imageBytes: string) {
  const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

  const config: any = {
    model: 'veo-2.0-generate-001',
    prompt,
    config: {
      numberOfVideos: 1,
    },
  };

  if (imageBytes) {
    config.image = {
      imageBytes,
      mimeType: 'image/png',
    };
  }

  let operation = await ai.models.generateVideos(config);

  while (!operation.done) {
    console.log('Waiting for completion');
    await delay(1000);
    operation = await ai.operations.getVideosOperation({operation});
  }

  const videos = operation.response?.generatedVideos;
  if (videos === undefined || videos.length === 0) {
    throw new Error('No videos generated');
  }

  videos.forEach(async (v, i) => {
    const url = decodeURIComponent(v.video.uri);
    const res = await fetch(`${url}&key=${process.env.API_KEY}`);
    const blob = await res.blob();
    const objectURL = URL.createObjectURL(blob);
    downloadFile(objectURL, `video${i}.mp4`);
    if (video) {
      video.src = objectURL;
      console.log('Downloaded video', `video${i}.mp4`);
      video.style.display = 'block';
    }
  });
}

// DOM Element selections
const upload = document.querySelector<HTMLInputElement>('#file-input')!;
const imgPreview = document.querySelector<HTMLImageElement>('#img')!;
let base64data = '';
let prompt = '';

upload.addEventListener('change', async (e) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    base64data = await blobToBase64(file);
    imgPreview.src = `data:image;base64,${base64data}`;
    imgPreview.style.display = 'block';
  }
});

const promptEl = document.querySelector<HTMLInputElement>('#prompt-input')!;
promptEl.addEventListener('input', async () => {
  prompt = promptEl.value;
});

const statusEl = document.querySelector<HTMLElement>('#status')!;
const spinnerEl = document.querySelector<HTMLElement>('#spinner')!;
const video = document.querySelector<HTMLVideoElement>('#video')!;
const quotaErrorEl = document.querySelector<HTMLElement>('#quota-error')!;
const quotaErrorMessageEl = document.querySelector<HTMLElement>('#quota-error-message')!;
const apiErrorEl = document.querySelector<HTMLElement>('#api-error')!;
const apiErrorMessageEl = document.querySelector<HTMLElement>('#api-error-message')!;

const generateButton = document.querySelector<HTMLButtonElement>(
  '#generate-button',
)!;
generateButton.addEventListener('click', (e) => {
  generate();
});

async function generate() {
  quotaErrorEl.style.display = 'none';
  apiErrorEl.style.display = 'none';

  if (!process.env.API_KEY) {
    apiErrorMessageEl.innerText =
      'API Key is not configured. Please ensure the API_KEY environment variable is set.';
    apiErrorEl.style.display = 'block';
    statusEl.innerText = 'Error: API Key not set.';
    return;
  }

  if (!prompt.trim()) {
    apiErrorMessageEl.innerText = 'Please enter a prompt to generate a video.';
    apiErrorEl.style.display = 'block';
    statusEl.innerText = 'Text to video requires prompt to be set.';
    return;
  }

  statusEl.innerText = 'Generating...';
  spinnerEl.style.display = 'block';
  video.style.display = 'none';
  setFormEnabled(false);

  try {
    await generateContent(prompt, base64data);
    statusEl.innerText = 'Done.';
  } catch (e: any) {
    console.error(e);
    let errorMessage = 'Failed to call the Gemini API. Please try again.';
    let isQuotaError = false;

    if (e && e.message) {
      let errorDetails;
      try {
        // Attempt to parse the full message as JSON
        errorDetails = JSON.parse(e.message);
      } catch (parseError) {
        // If that fails, look for an embedded JSON object
        const jsonMatch = e.message.match(/{.*}/s);
        if (jsonMatch && jsonMatch[0]) {
          try {
            errorDetails = JSON.parse(jsonMatch[0]);
          } catch (innerParseError) {
            errorMessage = e.message; // Use raw message if inner parse fails
          }
        } else {
          errorMessage = e.message; // Use raw message if no JSON found
        }
      }

      if (errorDetails && errorDetails.error) {
        errorMessage = errorDetails.error.message || errorMessage;
        if (errorDetails.error.code === 429 || errorDetails.error.status === 'RESOURCE_EXHAUSTED') {
          isQuotaError = true;
        }
      } else if (typeof e.message === 'string' && (e.message.includes('429') || e.message.toLowerCase().includes('quota'))) {
        // Fallback check on the raw string message
        isQuotaError = true;
        errorMessage = e.message;
      }
    }

    if (isQuotaError) {
      quotaErrorMessageEl.innerText = errorMessage;
      quotaErrorEl.style.display = 'block';
      statusEl.innerText = 'Quota exceeded.';
    } else {
      apiErrorMessageEl.innerText = errorMessage;
      apiErrorEl.style.display = 'block';
      statusEl.innerText = 'Error.';
    }
  } finally {
    spinnerEl.style.display = 'none';
    setFormEnabled(true);
  }
}

// --- Particle background animation ---
const canvas = document.getElementById('particles-js') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let particlesArray: Particle[];

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  initParticles(); 
});

class Particle {
  x: number;
  y: number;
  directionX: number;
  directionY: number;
  size: number;
  color: string;

  constructor(x: number, y: number, directionX: number, directionY: number, size: number, color: string) {
    this.x = x;
    this.y = y;
    this.directionX = directionX;
    this.directionY = directionY;
    this.size = size;
    this.color = color;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
    ctx.fillStyle = this.color;
    ctx.fill();
  }

  update() {
    if (this.x > canvas.width || this.x < 0) {
      this.directionX = -this.directionX;
    }
    if (this.y > canvas.height || this.y < 0) {
      this.directionY = -this.directionY;
    }
    this.x += this.directionX;
    this.y += this.directionY;
    this.draw();
  }
}

function initParticles() {
  particlesArray = [];
  let numberOfParticles = (canvas.height * canvas.width) / 9000;
  for (let i = 0; i < numberOfParticles; i++) {
    let size = Math.random() * 1.5 + 1;
    let x = Math.random() * (innerWidth - size * 2 - size * 2) + size * 2;
    let y = Math.random() * (innerHeight - size * 2 - size * 2) + size * 2;
    let directionX = Math.random() * 0.4 - 0.2;
    let directionY = Math.random() * 0.4 - 0.2;
    let color = 'rgba(255,255,255,0.8)';
    particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
  }
}

function connectParticles() {
  let opacityValue = 1;
  for (let a = 0; a < particlesArray.length; a++) {
    for (let b = a; b < particlesArray.length; b++) {
      let distance =
        (particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x) +
        (particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y);
      if (distance < (canvas.width / 8) * (canvas.height / 8)) {
        opacityValue = 1 - distance / 20000;
        ctx.strokeStyle = `rgba(255,255,255,${opacityValue})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
        ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
        ctx.stroke();
      }
    }
  }
}

function animateParticles() {
  requestAnimationFrame(animateParticles);
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  for (let i = 0; i < particlesArray.length; i++) {
    particlesArray[i].update();
  }
  connectParticles();
}

// --- App Initialization and UI Logic ---

function setFormEnabled(isEnabled: boolean) {
    generateButton.disabled = !isEnabled;
    upload.disabled = !isEnabled;
    promptEl.disabled = !isEnabled;
}

initParticles();
animateParticles();
statusEl.innerText = 'Ready.';