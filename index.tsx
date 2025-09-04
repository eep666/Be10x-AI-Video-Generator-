/* tslint:disable */
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI } from 'https://esm.sh/@google/genai@^1.4.0';

// FIX: API key should be a constant and not user-modifiable through the UI.
const geminiApiKey = process.env.API_KEY;

// FIX: Added type annotation for ms parameter.
async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// FIX: Added type annotations for blob parameter and return value.
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise(async (resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      // FIX: Cast reader.result to string to safely call split method.
      const url = reader.result as string;
      resolve(url.split(',')[1]);
    };
    reader.readAsDataURL(blob);
  });
}

// FIX: Added type annotations for parameters.
function downloadFile(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// FIX: Added type annotations for parameters.
async function generateContent(prompt: string, imageBytes: string) {
  const ai = new GoogleGenAI({apiKey: geminiApiKey});

  // FIX: Use 'any' type for config object to allow conditional property assignment.
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
    // FIX: Appended API key to the video download URL as required.
    const res = await fetch(`${url}&key=${geminiApiKey}`);
    const blob = await res.blob();
    const objectURL = URL.createObjectURL(blob);
    downloadFile(objectURL, `video${i}.mp4`);
    // FIX: Ensure video element is not null before accessing properties.
    if (video) {
      video.src = objectURL;
      console.log('Downloaded video', `video${i}.mp4`);
      video.style.display = 'block';
    }
  });
}

// FIX: Cast DOM elements to their specific types to resolve property access errors.
const upload = document.querySelector<HTMLInputElement>('#file-input')!;
const imgPreview = document.querySelector<HTMLImageElement>('#img')!;
let base64data = '';
let prompt = '';

upload.addEventListener('change', async (e) => {
  // FIX: Cast e.target to HTMLInputElement to access files property.
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    base64data = await blobToBase64(file);
    imgPreview.src = `data:image;base64,${base64data}`;
    imgPreview.style.display = 'block';
  }
});

// FIX: Cast DOM element to its specific type.
const promptEl = document.querySelector<HTMLInputElement>('#prompt-input')!;
promptEl.addEventListener('input', async () => {
  prompt = promptEl.value;
});

// FIX: Cast DOM elements to their specific types.
const statusEl = document.querySelector<HTMLElement>('#status')!;
const spinnerEl = document.querySelector<HTMLElement>('#spinner')!;
const video = document.querySelector<HTMLVideoElement>('#video')!;
// FIX: Get references to new, specific error containers.
const apiKeyErrorEl = document.querySelector<HTMLElement>('#api-key-error')!;
const quotaErrorEl = document.querySelector<HTMLElement>('#quota-error')!;

// FIX: Cast DOM element to its specific type.
const generateButton = document.querySelector<HTMLButtonElement>(
  '#generate-button',
)!;
generateButton.addEventListener('click', (e) => {
  generate();
});

async function generate() {
  quotaErrorEl.style.display = 'none';

  statusEl.innerText = 'Generating...';
  spinnerEl.style.display = 'block';
  video.style.display = 'none';

  generateButton.disabled = true;
  upload.disabled = true;
  promptEl.disabled = true;

  try {
    await generateContent(prompt, base64data);
    statusEl.innerText = 'Done.';
  } catch (e: any) { // FIX: Typed error object.
    try {
      const err = JSON.parse(e.message);
      if (err.error.code === 429) {
        // FIX: Show the specific quota error message.
        quotaErrorEl.style.display = 'block';
        statusEl.innerText = 'Quota exceeded.';
      } else {
        statusEl.innerText = err.error.message;
      }
    } catch (err) {
      statusEl.innerText = e.message;
      console.log('error', e.message);
    }
  }

  spinnerEl.style.display = 'none';
  generateButton.disabled = false;
  upload.disabled = false;
  promptEl.disabled = false;
}

// --- Particle background animation ---
// FIX: Cast canvas element to HTMLCanvasElement.
const canvas = document.getElementById('particles-js') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let particlesArray: Particle[];

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  init(); // Re-initialize particles on resize
});

class Particle {
  // FIX: Declared class properties with types.
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

function init() {
  particlesArray = [];
  let numberOfParticles = (canvas.height * canvas.width) / 9000;
  for (let i = 0; i < numberOfParticles; i++) {
    let size = Math.random() * 1.5 + 1;
    let x = Math.random() * (innerWidth - size * 2 - size * 2) + size * 2;
    let y = Math.random() * (innerHeight - size * 2 - size * 2) + size * 2;
    let directionX = Math.random() * 0.4 - 0.2;
    let directionY = Math.random() * 0.4 - 0.2;
    let color = 'rgba(255,255,255,0.8)';

    particlesArray.push(
      new Particle(x, y, directionX, directionY, size, color),
    );
  }
}

function connect() {
  let opacityValue = 1;
  for (let a = 0; a < particlesArray.length; a++) {
    for (let b = a; b < particlesArray.length; b++) {
      let distance =
        (particlesArray[a].x - particlesArray[b].x) *
          (particlesArray[a].x - particlesArray[b].x) +
        (particlesArray[a].y - particlesArray[b].y) *
          (particlesArray[a].y - particlesArray[b].y);
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

function animate() {
  requestAnimationFrame(animate);
  ctx.clearRect(0, 0, innerWidth, innerHeight);

  for (let i = 0; i < particlesArray.length; i++) {
    particlesArray[i].update();
  }
  connect();
}

function initializeApp() {
  if (!geminiApiKey) {
    apiKeyErrorEl.style.display = 'block';
    statusEl.innerText = 'API Key not configured.';
    generateButton.disabled = true;
    upload.disabled = true;
    promptEl.disabled = true;
  }
}

init();
animate();
initializeApp();
