// sketch.js
let vizManager;
let sound, fft;
let isSetupComplete = false;
let audioSource = null;

// Remove the duplicate constants
// const MIN_RADIUS = 100;
// const MAX_RADIUS = 400;

function startWithMicrophone() {
  audioSource = 'mic';
  userStartAudio().then(() => {
    const mic = new p5.AudioIn();
    mic.start();
    sound = mic;
    if (!vizManager) {
      vizManager = new VisualizationManager();
      vizManager.initializeVisualElements();
    }
    initializeVisualization();
    document.getElementById('loadingScreen').style.display = 'none';
  });
}

function startWithMP3() {
  audioSource = 'mp3';
  loadSound('gigi.mp3', (loadedSound) => {
    sound = loadedSound;
    if (!vizManager) {
      vizManager = new VisualizationManager();
      vizManager.initializeVisualElements();
    }
    initializeVisualization();
    sound.loop();
    document.getElementById('loadingScreen').style.display = 'none';
  });
}

// Attach functions to the global window object
window.startWithMicrophone = startWithMicrophone;
window.startWithMP3 = startWithMP3;

function initializeVisualization() {
  fft = new p5.FFT(0.8, vizManager.NUM_BANDS);
  fft.setInput(sound);
  isSetupComplete = true;
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB);
  angleMode(RADIANS);
  background(0);
}

// In sketch.js

function draw() {
  if (!isSetupComplete) return;

  background(0, 0, 0, 0.2);
  translate(width / 2, height / 2);

  // Get all the updated values from vizManager
  const { kickEnergy, currentSpectrum } = vizManager.update(fft);
  
  // Update global effects based on the spectrum
  vizManager.updateGlobalEffects(currentSpectrum);
  
  // Draw everything
  vizManager.draw(kickEnergy);

  drawDebugInfo();
}

function drawDebugInfo() {
  const debugInfo = vizManager.getDebugInfo();

  push();
  translate(-width / 2, -height / 2);
  fill(255);
  noStroke();
  text(`Speed: ${debugInfo.speed}x`, 20, 20);
  text(`Volume: ${debugInfo.volume}`, 20, 40);
  text(`Hue: ${debugInfo.hue}°`, 20, 60);
  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
