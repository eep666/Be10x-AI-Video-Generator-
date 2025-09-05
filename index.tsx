/* tslint:disable */
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

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
  // 1. Call our serverless function to start the generation
  const generateResponse = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, imageBytes: imageBytes || null }),
  });

  if (!generateResponse.ok) {
    const error = await generateResponse.json();
    throw new Error(error.error || 'Failed to start video generation.');
  }

  let { operation } = await generateResponse.json();

  // 2. Poll the status endpoint until the operation is done
  while (!operation.done) {
    statusEl.innerText = 'Generating video... this may take a few minutes.';
    console.log('Polling for video generation status...');
    await delay(10000); // Poll every 10 seconds

    const statusResponse = await fetch('/api/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation }),
    });

    if (!statusResponse.ok) {
      const error = await statusResponse.json();
      throw new Error(error.error || 'Failed to check video generation status.');
    }
    
    const statusResult = await statusResponse.json();
    operation = statusResult.operation;
  }

  const videos = operation.response?.generatedVideos;
  if (videos === undefined || videos.length === 0) {
    throw new Error('No videos were generated, or the operation failed.');
  }

  // 3. Download the generated video via our download proxy
  videos.forEach(async (v: any, i: number) => {
    statusEl.innerText = 'Downloading video...';
    const downloadUrl = `/api/download?uri=${encodeURIComponent(v.video.uri)}`;
    const res = await fetch(downloadUrl);
    
    if (!res.ok) {
        console.error('Failed to download video file.');
        throw new Error('Could not download the generated video.');
    }

    const blob = await res.blob();
    const objectURL = URL.createObjectURL(blob);
    downloadFile(objectURL, `video${i}.mp4`);
    if (video) {
      video.src = objectURL;
      video.style.display = 'block';
    }
  });
}

// DOM Element selections
const upload = document.querySelector<HTMLInputElement>('#file-input')!;
const imgPreview = document.querySelector<HTMLImageElement>('#img')!;
let base64data = '';
let userPrompt = '';

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
  userPrompt = promptEl.value;
});

const statusEl = document.querySelector<HTMLElement>('#status')!;
const spinnerEl = document.querySelector<HTMLElement>('#spinner')!;
const video = document.querySelector<HTMLVideoElement>('#video')!;
const errorBoxEl = document.querySelector<HTMLElement>('#error-box')!;
const errorMessageEl = document.querySelector<HTMLElement>('#error-message')!;

const generateButton = document.querySelector<HTMLButtonElement>(
  '#generate-button',
)!;
generateButton.addEventListener('click', (e) => {
  generate();
});

async function generate() {
  errorBoxEl.style.display = 'none';

  if (!userPrompt.trim()) {
    errorMessageEl.innerText = 'Please enter a prompt to generate a video.';
    errorBoxEl.style.display = 'block';
    return;
  }

  statusEl.innerText = 'Initializing...';
  spinnerEl.style.display = 'block';
  video.style.display = 'none';
  setFormEnabled(false);

  try {
    await generateContent(userPrompt, base64data);
    statusEl.innerText = 'Done.';
  } catch (e: any) {
    console.error(e);
    let friendlyMessage = e.message || 'An unknown error occurred. Please try again.';
    
    // Try to parse the message as JSON to get a cleaner error.
    try {
      // The error from the backend might be a stringified JSON.
      const errorObj = JSON.parse(friendlyMessage);
      if (errorObj && errorObj.message) {
        // If it has a message property, use that.
        friendlyMessage = errorObj.message;
      }
    } catch (parseError) {
      // It's not a JSON string, so we'll just display the original message.
    }

    errorMessageEl.innerText = friendlyMessage;
    errorBoxEl.style.display = 'block';
    statusEl.innerText = 'Error.';
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