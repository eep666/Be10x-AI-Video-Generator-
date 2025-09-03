/* tslint:disable */
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import {GenerateVideosParameters, GoogleGenAI} from '@google/genai';

const GEMINI_API_KEY = process.env.API_KEY;

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function blobToBase64(blob: Blob) {
  return new Promise<string>(async (resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      resolve(url.split(',')[1]);
    };
    reader.readAsDataURL(blob);
  });
}

function downloadFile(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function generateContent(prompt: string, imageBytes: string) {
  const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});

  const config: GenerateVideosParameters = {
    model: 'veo-2.0-generate-001',
    // model: 'veo-3.0-generate-preview',
    prompt,
    config: {
      // aspectRatio: '16:9',
      // durationSeconds: 1,
      // fps: 24,
      // generateAudio: true,
      // resolution: "720p",
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
    const res = await fetch(url);
    const blob = await res.blob();
    const objectURL = URL.createObjectURL(blob);
    downloadFile(objectURL, `video${i}.mp4`);
    video.src = objectURL;
    console.log('Downloaded video', `video${i}.mp4`);
    video.style.display = 'block';
  });
}

const upload = document.querySelector('#file-input') as HTMLInputElement;
const imgPreview = document.querySelector('#img') as HTMLImageElement;
let base64data = '';
let prompt = '';

upload.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files[0];
  if (file) {
    base64data = await blobToBase64(file);
    imgPreview.src = `data:image;base64,${base64data}`;
    imgPreview.style.display = 'block';
  }
});

const promptEl = document.querySelector('#prompt-input') as HTMLInputElement;
promptEl.addEventListener('input', async () => {
  prompt = promptEl.value;
});

const statusEl = document.querySelector('#status') as HTMLParagraphElement;
const spinnerEl = document.querySelector('#spinner') as HTMLDivElement;
const video = document.querySelector('#video') as HTMLVideoElement;
const quotaErrorEl = document.querySelector('#quota-error') as HTMLDivElement;
const openKeyEl = document.querySelector('#open-key') as HTMLButtonElement;

openKeyEl.addEventListener('click', async (e) => {
  await window.aistudio?.openSelectKey();
});

const generateButton = document.querySelector(
  '#generate-button',
) as HTMLButtonElement;
generateButton.addEventListener('click', (e) => {
  generate();
});

async function generate() {
  statusEl.innerText = 'Generating...';
  spinnerEl.style.display = 'block';
  video.style.display = 'none';

  generateButton.disabled = true;
  upload.disabled = true;
  promptEl.disabled = true;
  quotaErrorEl.style.display = 'none';

  try {
    await generateContent(prompt, base64data);
    statusEl.innerText = 'Done.';
  } catch (e) {
    try {
      const err = JSON.parse(e.message);
      if (err.error.code === 429) {
        // Out of quota.
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
const canvas = document.getElementById('particles-js') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let particlesArray: Particle[];

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    init(); // Re-initialize particles on resize
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

function init() {
    particlesArray = [];
    let numberOfParticles = (canvas.height * canvas.width) / 9000;
    for (let i = 0; i < numberOfParticles; i++) {
        let size = (Math.random() * 1.5) + 1;
        let x = (Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2);
        let y = (Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2);
        let directionX = (Math.random() * .4) - 0.2;
        let directionY = (Math.random() * .4) - 0.2;
        let color = 'rgba(255,255,255,0.8)';

        particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
    }
}

function connect() {
    let opacityValue = 1;
    for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
            let distance = ((particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x))
                         + ((particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y));
            if (distance < (canvas.width/8) * (canvas.height/8)) {
                opacityValue = 1 - (distance/20000);
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
    ctx.clearRect(0,0,innerWidth, innerHeight);

    for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
    }
    connect();
}

init();
animate();