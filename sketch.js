let isSetupComplete = false;
let audioSource = null;

let sound, fft;
let spectrum = [];
let smoothedSpectrum = [];
let energyHistory = [];
let radialBands = [];
let glowParticles = [];
const HISTORY_LENGTH = 60;
const NUM_BANDS = 256;
const MIN_RADIUS = 100;
const MAX_RADIUS = 400;
let globalHue = 120; // Starting with green
let globalSpeed = 1;
let volumeAccumulator = 0;
let audioBars = [];

// Dynamic color generation based on volume
function getColorPalette(baseHue) {
  return [
    [baseHue, 100, 100],             // Pure primary
    [(baseHue + 5) % 360, 100, 95],  // Slight variation
    [(baseHue - 5) % 360, 100, 90],  // Another variation
    [(baseHue + 180) % 360, 100, 85],// Complementary
    [(baseHue + 90) % 360, 100, 95]  // Orthogonal
  ];
}

class RadialBand {
  constructor(index, total) {
    this.index = index;
    this.angle = (TWO_PI / total) * index;
    this.targetLength = 0;
    this.currentLength = 0;
    this.baseLength = random(30, 50);
    this.glowIntensity = 0;
    this.rotationOffset = 0;
    this.scale = 1;
  }
  
  update(energy, peak, speed, bassEnergy) {
    this.targetLength = map(energy, 0, 255, this.baseLength, MAX_RADIUS);
    this.currentLength = lerp(this.currentLength, this.targetLength, 0.3);
    this.scale = map(bassEnergy, 0, 255, 1, 1.3);
    this.rotationOffset += 0.001 * speed;
    
    if (peak) {
      this.glowIntensity = 1;
    }
    this.glowIntensity *= 0.95;
  }
  
  draw(baseHue, bassEnergy) {
      push();
      scale(this.scale);
      rotate(this.angle + this.rotationOffset);

      // Shift the hue towards white based on bass
      let whiteness = map(bassEnergy, 0, 255, 0, 80);
      let adjustedColor = color(baseHue, 100 - whiteness, 100);

      let gradient = drawingContext.createLinearGradient(MIN_RADIUS, 0, this.currentLength, 0);
      let alpha = map(bassEnergy, 0, 255, 0.7, 1);
      gradient.addColorStop(0, color(baseHue, 100 - whiteness, 100, alpha).toString());
      gradient.addColorStop(1, color(baseHue, 100 - whiteness, 100, 0).toString());

      drawingContext.strokeStyle = gradient;
      drawingContext.lineWidth = 2;

      let glowIntensity = map(bassEnergy, 0, 255, 10, 30);
      drawingContext.shadowBlur = glowIntensity;
      drawingContext.shadowColor = adjustedColor.toString();
      line(MIN_RADIUS, 0, this.currentLength, 0);

      drawingContext.shadowBlur = 0;
      pop();
  }
}


class GlowParticle {
  constructor() {
    this.reset();
  }
  
  reset() {
    this.angle = random(TWO_PI);
    this.radius = random(MIN_RADIUS, MAX_RADIUS);
    this.baseSpeed = random(0.02, 0.05);
    this.size = random(2, 6);
    this.alpha = random(0.5, 1);
  }
  
  update(energy, speed, baseHue) {
    this.angle += this.baseSpeed * speed * (1 + energy/255);
    this.alpha *= 0.98;
    this.size += 0.1;
    
    if (this.alpha < 0.1) this.reset();
    
    this.color = color(
      (baseHue + random(-20, 20) + this.angle * 10) % 360,
      100,
      100
    );
  }
  
  draw(bassEnergy) {
      let x = cos(this.angle) * this.radius;
      let y = sin(this.angle) * this.radius;

      let whiteness = map(bassEnergy, 0, 255, 0, 80);
      let adjustedColor = color(
        hue(this.color),
        saturation(this.color) - whiteness,
        100
      );

      let bassGlow = map(bassEnergy, 0, 255, this.size, this.size * 3);
      drawingContext.shadowBlur = bassGlow;
      drawingContext.shadowColor = adjustedColor.toString();

      let bassAlpha = map(bassEnergy, 0, 255, this.alpha, min(1, this.alpha * 1.5));
      fill(adjustedColor);
      noStroke();
      circle(x, y, this.size);

      drawingContext.shadowBlur = 0;
  }
}


class AudioBar {
  constructor(index, total) {
    this.index = index;
    this.width = (MIN_RADIUS * 2) / total;
    this.x = -MIN_RADIUS + (this.width * index);
    this.height = 0;
    this.targetHeight = 0;
    this.color = color(0, 0, 100);
    this.scale = 1;
  }
  
  updateSensitivity(sensitivity, bassEnergy) {
      let distanceFromCenter = Math.abs(this.index - audioBars.length/2);
      let scaleFactor = 1 - (distanceFromCenter / (audioBars.length/2));
      scaleFactor = pow(scaleFactor, 1.5);

      this.targetHeight = map(sensitivity, 0, 255, 0, MIN_RADIUS) * scaleFactor;
      this.height = lerp(this.height, this.targetHeight, 0.3);

      let whiteness = map(bassEnergy, 0, 255, 0, 80);
      this.color = color((globalHue + this.index) % 360, 100 - whiteness, 100, 0.7);
      this.scale = map(bassEnergy, 0, 255, 1, 1.3);
  }
  
  draw(bassEnergy) {
    push();
    scale(this.scale);
    
    // Add white to the color based on bass
    let whiteness = map(bassEnergy, 0, 255, 0, 50);
    let adjustedColor = color(
      hue(this.color),
      saturation(this.color) - whiteness,
      brightness(this.color) + whiteness,
      0.7
    );
    fill(adjustedColor);
    noStroke();
    
    // Original color glow
    let glowSize = map(bassEnergy, 0, 255, 10, 25);
    drawingContext.shadowBlur = glowSize;
    drawingContext.shadowColor = adjustedColor.toString();
    
    // Additional white glow
    drawingContext.shadowBlur = map(bassEnergy, 0, 255, 0, 15);
    drawingContext.shadowColor = color(0, 0, 100).toString();
    
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.arc(0, 0, MIN_RADIUS, 0, TWO_PI);
    drawingContext.clip();
    
    const centerOffset = this.width;
    rect(this.x - centerOffset, -this.height/2, this.width * 0.6, this.height);
    rect(-this.x - this.width * 0.6 + centerOffset, -this.height/2, this.width * 0.6, this.height);
    
    drawingContext.restore();
    drawingContext.shadowBlur = 0;
    pop();
  }
}


class BassRing {
  constructor() {
    this.radius = MIN_RADIUS * 1.5;
    this.thickness = 5;
    this.rotation = 0;
    this.scale = 1;
  }
  
  update(highEnergy, bassEnergy) {
    this.thickness = map(highEnergy, 0, 255, 5, 20);
    this.rotation += 0.01 * globalSpeed;
    this.scale = map(bassEnergy, 0, 255, 1, 1.3);
  }
  
  draw(bassEnergy) {
      push();
      scale(this.scale);
      rotate(this.rotation);
      noFill();
      strokeWeight(this.thickness);

      let opacity = map(bassEnergy, 0, 255, 0.6, 1);
      let whiteness = map(bassEnergy, 0, 255, 0, 80);

      stroke((globalHue + 60) % 360, 100 - whiteness, 100, opacity);

      let glowSize = map(bassEnergy, 0, 255, 20, 40);
      drawingContext.shadowBlur = glowSize;
      drawingContext.shadowColor = color((globalHue + 60) % 360, 100 - whiteness, 100).toString();

      circle(0, 0, this.radius * 2);
      drawingContext.shadowBlur = 0;
      pop();
  }
}

function startWithMicrophone() {
  audioSource = 'mic';
  userStartAudio().then(() => {
    const mic = new p5.AudioIn();
    mic.start();
    sound = mic;
    initializeVisualization();
    document.getElementById('loadingScreen').style.display = 'none';
  });
}

function startWithMP3() {
  audioSource = 'mp3';
  sound = loadSound('gigi.mp3', () => {
    initializeVisualization();
    sound.loop();
    document.getElementById('loadingScreen').style.display = 'none';
  });
}

function initializeVisualization() {
  fft = new p5.FFT(0.8, NUM_BANDS);
  fft.setInput(sound);
  
  for (let i = 0; i < NUM_BANDS; i++) {
    smoothedSpectrum[i] = 0;
    radialBands.push(new RadialBand(i, NUM_BANDS));
  }
  
  for (let i = 0; i < 100; i++) {
    glowParticles.push(new GlowParticle());
  }
  
  for (let i = 0; i < HISTORY_LENGTH; i++) {
    energyHistory.push(0);
  }
  
  initializeNewVisualizations();
  isSetupComplete = true;
}

function preload() {
  sound = loadSound('gigi.mp3', onSoundLoad, onSoundError);
}

function onSoundLoad() {
  console.log('gigi.mp3 loaded successfully.');
}

function onSoundError(err) {
  console.error('Error loading gigi.mp3:', err);
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB);
  angleMode(RADIANS);
  background(0);
}

function detectPeaks(spectrum) {
  let sum = 0;
  for (let i = 0; i < spectrum.length; i++) {
    sum += spectrum[i];
  }
  
  let average = sum / spectrum.length;
  energyHistory.push(average);
  energyHistory.shift();
  
  let recentAverage = energyHistory.slice(-5).reduce((a, b) => a + b) / 5;
  
  volumeAccumulator = lerp(volumeAccumulator, average, 0.1);
  
  return average > recentAverage * 1.5;
}

function updateGlobalEffects(volume) {
  let targetSpeed = map(volume, 0, 255, 0.5, 4);
  globalSpeed = lerp(globalSpeed, targetSpeed, 0.1);
  globalHue = (globalHue + 0.5 * globalSpeed) % 360;
}

function draw() {
  if (!isSetupComplete) return;
  background(0, 0, 0, 0.2);
  translate(width/2, height/2);
  
  let currentSpectrum = fft.analyze();
  let bassEnergy = fft.getEnergy("bass");
  let peak = detectPeaks(currentSpectrum);
  
  updateGlobalEffects(volumeAccumulator);
  
  for (let i = 0; i < NUM_BANDS; i++) {
    smoothedSpectrum[i] = lerp(smoothedSpectrum[i], currentSpectrum[i], 0.3);
  }
  
  drawingContext.shadowBlur = map(bassEnergy, 0, 255, 30, 60);
  drawingContext.shadowColor = color(globalHue, 100, 100).toString();
  fill(globalHue, 100, 100, 0.1);
  circle(0, 0, MIN_RADIUS * 2);
  drawingContext.shadowBlur = 0;
  
  push();
  radialBands.forEach((band, i) => {
    band.update(smoothedSpectrum[i], peak, globalSpeed, bassEnergy);
    band.draw(globalHue, bassEnergy);
  });
  pop();
  
  glowParticles.forEach(particle => {
    particle.update(bassEnergy, globalSpeed, globalHue);
    particle.draw(bassEnergy);
  });
  
  if (peak) {
    for (let i = 0; i < 5; i++) {
      glowParticles.push(new GlowParticle());
    }
  }
  
  while (glowParticles.length > 200) {
    glowParticles.shift();
  }
  
  updateNewVisualizations(bassEnergy);
  
  push();
  translate(-width/2, -height/2);
  fill(255);
  noStroke();
  text(`Speed: ${globalSpeed.toFixed(2)}x`, 20, 20);
    text(`Volume: ${volumeAccumulator.toFixed(2)}`, 20, 40);
    text(`Hue: ${Math.floor(globalHue)}°`, 20, 60);
    pop();
  }

  function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
  }

  function initializeNewVisualizations() {
    const NUM_BARS = 64;
    audioBars = [];
    for (let i = 0; i < NUM_BARS; i++) {
      audioBars.push(new AudioBar(i, NUM_BARS));
    }

    bassRing = new BassRing();
  }

  function updateNewVisualizations(bassEnergy) {
    let spectrum = fft.analyze();
    let highEnergy = fft.getEnergy("treble");

    push();
    fill(0, 0, 0, 0.2);
    noStroke();
    circle(0, 0, MIN_RADIUS * 2);
    pop();

    let baseScale = map(bassEnergy, 0, 255, 0.1, 1.5);

    push();
    scale(baseScale);

    audioBars.forEach((bar, i) => {
      let index = floor(map(i, 0, audioBars.length, 0, spectrum.length));
      bar.updateSensitivity(spectrum[index], bassEnergy);
      bar.draw(bassEnergy);
    });

    bassRing.update(highEnergy, bassEnergy);
    bassRing.draw(bassEnergy);

    pop();
  }