// js/VisualizationManager.js
const MAX_PARTICLES = 150; // Reduce from 200 to 150 for better performance

class VisualizationManager {
  constructor() {
    this.spectrum = [];
    this.smoothedSpectrum = [];
    this.energyHistory = [];
    this.radialBands = [];
    this.glowParticles = [];
    this.audioBars = [];
    this.bassRing = null;
    
    this.HISTORY_LENGTH = 60;
    this.NUM_BANDS = 256;
    this.NUM_BARS = 64;
    
    this.globalHue = 120;
    this.globalSpeed = 1;
    this.volumeAccumulator = 0;
    
    this.initializeVisualElements();
  }

  initializeVisualElements() {
    for (let i = 0; i < this.NUM_BANDS; i++) {
      this.smoothedSpectrum[i] = 0;
      const band = new RadialBand(i, this.NUM_BANDS);
      band.initialize(this.NUM_BANDS);
      this.radialBands.push(band);
    }

    for (let i = 0; i < 100; i++) {
      const particle = new GlowParticle();
      particle.initialize();
      this.glowParticles.push(particle);
    }

    for (let i = 0; i < this.HISTORY_LENGTH; i++) {
      this.energyHistory.push(0);
    }

    for (let i = 0; i < this.NUM_BARS; i++) {
      const bar = new AudioBar(i, this.NUM_BARS);
      bar.initialize();
      this.audioBars.push(bar);
    }

    this.bassRing = new BassRing();
    this.bassRing.initialize();
  }  

  detectPeaks(spectrum) {
    let sum = 0;
    for (let i = 0; i < spectrum.length; i++) {
      sum += spectrum[i];
    }
    
    let average = sum / spectrum.length;
    this.energyHistory.push(average);
    this.energyHistory.shift();
    
    let recentAverage = this.energyHistory.slice(-5).reduce((a, b) => a + b) / 5;
    
    this.volumeAccumulator = lerp(this.volumeAccumulator, average, 0.1);
    
    return average > recentAverage * 1.5;
  }

  updateGlobalEffects(volume) {
    let targetSpeed = map(volume, 0, 255, 0.5, 4);
    this.globalSpeed = lerp(this.globalSpeed, targetSpeed, 0.1);
    this.globalHue = (this.globalHue + 0.5 * this.globalSpeed) % 360;
  }

  update(fft) {
      const currentSpectrum = fft.analyze();
      const bassEnergy = fft.getEnergy("bass");
      const highEnergy = fft.getEnergy("treble");
      const peak = this.detectPeaks(currentSpectrum);

      this.updateGlobalEffects(this.volumeAccumulator);

      // Update spectrum
      for (let i = 0; i < this.NUM_BANDS; i++) {
        this.smoothedSpectrum[i] = lerp(this.smoothedSpectrum[i], currentSpectrum[i], 0.3);
      }

      // Update visual elements
      this.radialBands.forEach((band, i) => {
        band.update(this.smoothedSpectrum[i], peak, this.globalSpeed, bassEnergy);
      });

      this.glowParticles.forEach(particle => {
        particle.update(bassEnergy, this.globalSpeed, this.globalHue);
      });

      if (peak) {
        const newParticlesCount = Math.min(5, MAX_PARTICLES - this.glowParticles.length);
        for (let i = 0; i < newParticlesCount; i++) {
          this.glowParticles.push(new GlowParticle());
        }
      }

      while (this.glowParticles.length > MAX_PARTICLES) {
        this.glowParticles.shift();
      }    

      this.audioBars.forEach((bar, i) => {
        let index = floor(map(i, 0, this.audioBars.length, 0, currentSpectrum.length));
        bar.updateSensitivity(currentSpectrum[index], bassEnergy, this.globalHue);
      });

      this.bassRing.update(highEnergy, bassEnergy, this.globalSpeed);

      return {
        bassEnergy,
        currentSpectrum,
        highEnergy
      };
  }

  draw(bassEnergy) {  // Add bassEnergy parameter
      // Central glow
      drawingContext.shadowBlur = map(bassEnergy, 0, 255, 30, 60);
      drawingContext.shadowColor = color(this.globalHue, 100, 100).toString();
      fill(this.globalHue, 100, 100, 0.1);
      circle(0, 0, MIN_RADIUS * 2);
      drawingContext.shadowBlur = 0;

      push();
      this.radialBands.forEach(band => band.draw(this.globalHue, bassEnergy));
      pop();

      this.glowParticles.forEach(particle => particle.draw(bassEnergy));

      push();
      fill(0, 0, 0, 0.2);
      noStroke();
      circle(0, 0, MIN_RADIUS * 2);
      pop();

      let baseScale = map(bassEnergy, 0, 255, 0.1, 1.5);
      push();
      scale(baseScale);
      this.audioBars.forEach(bar => bar.draw(bassEnergy));
      this.bassRing.draw(bassEnergy, this.globalHue); // Pass globalHue
      pop();
}
    

  getDebugInfo() {
    return {
      speed: this.globalSpeed.toFixed(2),
      volume: this.volumeAccumulator.toFixed(2),
      hue: Math.floor(this.globalHue)
    };
  }
}