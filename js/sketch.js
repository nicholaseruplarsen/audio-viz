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
  const kick = debugInfo.kick;
  const calibrationStatus = vizManager.getCalibrationStatus();

  push();
  translate(-width / 2, -height / 2);
  fill(255);
  noStroke();

  // Original info
  text(`Speed: ${debugInfo.speed}x`, 20, 20);
  text(`Volume: ${debugInfo.volume}`, 20, 40);
  text(`Hue: ${debugInfo.hue}°`, 20, 60);
  
  // Kick detection info
  text('KICK INFO:', 20, 100);
  text(`Current Energy: ${kick.current}`, 20, 120);
  text(`Threshold: ${kick.threshold}`, 20, 140);
  text(`Peak Energy: ${kick.peak}`, 20, 160);
  text(`Average Energy: ${kick.average}`, 20, 180);
  text(`Kick Count: ${kick.count}`, 20, 200);
  text(`Estimated BPM: ${kick.bpm}`, 20, 220);
  text(`Recent Energies: ${kick.recent.join(', ')}`, 20, 240);
  
  // Visual kick energy meter
  const meterWidth = 200;
  const meterHeight = 20;
  noFill();
  stroke(255);
  rect(20, 260, meterWidth, meterHeight);
  
  // Current energy level
  fill(255);
  const energyWidth = map(kick.current, 0, max(kick.peak, kick.threshold * 1.5), 0, meterWidth);
  rect(20, 260, energyWidth, meterHeight);
  
  // Threshold line
  stroke(255, 0, 0);
  const thresholdX = map(kick.threshold, 0, max(kick.peak, kick.threshold * 1.5), 0, meterWidth);
  line(20 + thresholdX, 260, 20 + thresholdX, 260 + meterHeight);
  
  if (calibrationStatus) {
      fill(255, 255, 0); // Yellow color for calibration status
      text(calibrationStatus, 20, 280);
  }

  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
