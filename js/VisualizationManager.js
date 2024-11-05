// js/VisualizationManager.js
const MAX_PARTICLES = 200; // Reduce from 200 to 150 for better performance

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

    // Kick detection properties
    this.kickThreshold = 190;  // Current threshold
    this.kickEnergy = 0;      // Current kick energy
    this.lastKickEnergy = 0;  // Previous frame's kick energy
    this.kickHistory = new Array(30).fill(0);  // Store recent kick energies
    this.peakKickEnergy = 0;  // Highest kick energy seen
    this.kickCount = 0;       // Number of kicks detected
    this.lastKickTime = 0;    // Time of last kick
    this.averageKickInterval = 0;  // Average time between kicks
    this.lastKickIntervals = [];   // Store recent intervals between kicks

    this.calibrationStartTime = null;
    this.waitTimeBeforeCalibration = 40000; // 20 seconds in milliseconds
    this.calibrationFrames = 0;
    this.calibrationDuration = 200; // About 3-4 seconds of samples
    this.isWaitingToCalibrate = true;
    this.isCalibrating = false;
    this.expectedBPM = 140; // Known BPM of the track
    this.bpmTolerance = 5;  // Allow +/- 5 BPM variance

    this.volumeHistory = [];
    this.shootingStarsActive = false;
    this.shootingStars = [];
    this.MAX_SHOOTING_STARS = 20;
    this.songStartTime = null;

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

    // Initialize shooting stars
    for (let i = 0; i < this.MAX_SHOOTING_STARS; i++) {
      const star = new ShootingStar();
      star.initialize();
      this.shootingStars.push(star);
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

  updateGlobalEffects(spectrum) {
    let sum = 0;
    for (let i = 0; i < spectrum.length; i++) {
      sum += spectrum[i];
    }
    let average = sum / spectrum.length;

    let targetSpeed = map(average, 0, 255, 0.5, 4);
    this.globalSpeed = lerp(this.globalSpeed, targetSpeed, 0.1);
    this.globalHue = (this.globalHue + 0.5 * this.globalSpeed) % 360;

    this.volumeAccumulator = lerp(this.volumeAccumulator, average, 0.1);
  }  

  calibrateKickThreshold(kickEnergy) {
    const currentTime = millis();

    // Wait 20 seconds before starting calibration
    if (this.isWaitingToCalibrate) {
      if (this.calibrationStartTime === null) {
        this.calibrationStartTime = currentTime;
      }

      if (currentTime - this.calibrationStartTime < this.waitTimeBeforeCalibration) {
        // During waiting period, still collect kick energy data
        this.kickHistory.push(kickEnergy);
        this.kickHistory.shift();
        return this.kickThreshold;
      } else {
        this.isWaitingToCalibrate = false;
        this.isCalibrating = true;
        // Don't clear history, just start using it for calibration
        this.calibrationFrames = 0;
        return this.kickThreshold;
      }
    }

    // Original calibration logic
    if (this.calibrationFrames < this.calibrationDuration) {
      this.kickHistory.push(kickEnergy);
      this.kickHistory.shift();
      this.calibrationFrames++;
      return this.kickThreshold;
    }

    if (this.isCalibrating) {
      // Sort energies to find natural breaks
      const sortedEnergies = [...this.kickHistory].sort((a, b) => a - b);
      const median = sortedEnergies[Math.floor(sortedEnergies.length / 2)];

      // Find the largest gap in the upper half of energy values
      let maxGap = 0;
      let threshold = median;

      for (let i = Math.floor(sortedEnergies.length * 0.5); i < sortedEnergies.length - 1; i++) {
        const gap = sortedEnergies[i + 1] - sortedEnergies[i];
        if (gap > maxGap) {
          maxGap = gap;
          threshold = sortedEnergies[i] + (gap * 0.3);
        }
      }

      this.isCalibrating = false;
      console.log('Calibration complete. New threshold:', threshold);
      return threshold;
    }

    return this.kickThreshold;
  }
  
  getCalibrationStatus() {
      if (this.isWaitingToCalibrate) {
          const timeLeft = Math.ceil((this.waitTimeBeforeCalibration - 
              (millis() - this.calibrationStartTime)) / 1000);
          return `Waiting to calibrate... ${timeLeft}s`;
      }
      if (this.isCalibrating) {
          return `Calibrating... ${Math.floor((this.calibrationFrames / this.calibrationDuration) * 100)}%`;
      }
      return null;
  }

  checkShootingStarTiming() {
    if (!this.songStartTime && audioSource === 'mp3') {
      this.songStartTime = millis();
    }

    if (this.songStartTime) {
      const currentTime = millis();
      const elapsedSeconds = (currentTime - this.songStartTime) / 1000;
      this.shootingStarsActive = elapsedSeconds >= 34.5;
    }
  }  
  

  update(fft) {
    const currentSpectrum = fft.analyze();
    const bassEnergy = fft.getEnergy("bass");
    const highEnergy = fft.getEnergy("treble");
    
    const peak = this.detectPeaks(currentSpectrum);
    
    this.lastKickEnergy = this.kickEnergy;
    this.kickEnergy = fft.getEnergy(50, 100);
  
    this.kickThreshold = this.calibrateKickThreshold(this.kickEnergy);
  
    this.kickHistory.push(this.kickEnergy);
    this.kickHistory.shift();
  
    if (this.kickEnergy > this.peakKickEnergy) {
      this.peakKickEnergy = this.kickEnergy;
    }
  
    const avgKickEnergy = this.kickHistory.length ? 
      this.kickHistory.reduce((a, b) => a + b, 0) / this.kickHistory.length : 
      0;
  
    const isKick = this.kickEnergy > this.kickThreshold && 
                   this.kickEnergy > this.lastKickEnergy;
  
    if (isKick) {
      const currentTime = millis();
      if (this.lastKickTime > 0) {
        const interval = currentTime - this.lastKickTime;
        this.lastKickIntervals.push(interval);
        if (this.lastKickIntervals.length > 10) {
          this.lastKickIntervals.shift();
        }
        this.averageKickInterval = this.lastKickIntervals.length ?
          this.lastKickIntervals.reduce((a, b) => a + b, 0) / this.lastKickIntervals.length :
          429;
      }
      this.lastKickTime = currentTime;
      this.kickCount++;
    }
    
    for (let i = 0; i < this.NUM_BANDS; i++) {
      this.smoothedSpectrum[i] = lerp(this.smoothedSpectrum[i], currentSpectrum[i], 0.3);
    }
  
    this.checkShootingStarTiming();
    
    this.radialBands.forEach((band, i) => {
      band.update(this.smoothedSpectrum[i], peak, this.globalSpeed, this.kickEnergy);
    });
  
    this.glowParticles.forEach(particle => {
      particle.update(this.kickEnergy, this.globalSpeed, this.globalHue);
    });
  
    if (this.shootingStarsActive) {
      this.shootingStars.forEach(star => {
        star.update(this.kickEnergy, this.globalSpeed, this.globalHue);
      });
    }
  
    this.audioBars.forEach((bar, i) => {
      let index = floor(map(i, 0, this.audioBars.length, 0, currentSpectrum.length));
      bar.updateSensitivity(currentSpectrum[index], this.kickEnergy, this.globalHue);
    });
  
    this.bassRing.update(highEnergy, this.kickEnergy, this.globalSpeed);
  
    return {
      bassEnergy,
      kickEnergy: this.kickEnergy,
      currentSpectrum,
      highEnergy,
      isKick,
      kickStats: {
        currentEnergy: this.kickEnergy,
        threshold: this.kickThreshold,
        peakEnergy: this.peakKickEnergy,
        averageEnergy: avgKickEnergy,
        isKick: isKick,
        kickCount: this.kickCount,
        averageInterval: this.averageKickInterval,
        recentHistory: [...this.kickHistory].slice(-5)
      }
    };
  }  
  
  draw(bassEnergy) {
    drawingContext.shadowBlur = map(bassEnergy, 0, 255, 30, 60);
    drawingContext.shadowColor = color(this.globalHue, 100, 100).toString();
    fill(this.globalHue, 100, 100, 0.1);
    circle(0, 0, MIN_RADIUS * 2);
    drawingContext.shadowBlur = 0;
  
    push();
    this.radialBands.forEach(band => band.draw(this.globalHue, bassEnergy));
    pop();
  
    this.glowParticles.forEach(particle => particle.draw(bassEnergy));
  
    if (this.shootingStarsActive) {
      this.shootingStars.forEach(star => star.draw(bassEnergy));
    }
  
    push();
    fill(0, 0, 0, 0.2);
    noStroke();
    circle(0, 0, MIN_RADIUS * 2);
    pop();
  
    let baseScale = map(bassEnergy, 0, 255, 0.1, 1.5);
    push();
    scale(baseScale);
    this.audioBars.forEach(bar => bar.draw(bassEnergy));
    this.bassRing.draw(bassEnergy, this.globalHue);
    pop();
  }
    

  getDebugInfo() {
    return {
      speed: this.globalSpeed.toFixed(2),
      volume: this.volumeAccumulator.toFixed(2),
      hue: Math.floor(this.globalHue),
      kick: {
        current: Math.floor(this.kickEnergy),
        threshold: Math.floor(this.kickThreshold),
        peak: Math.floor(this.peakKickEnergy),
        average: Math.floor(this.kickHistory.reduce((a, b) => a + b, 0) / 
                          (this.kickHistory.length || 1)),
        count: this.kickCount,
        bpm: this.averageKickInterval ? 
          Math.floor(60000 / this.averageKickInterval) : 
          140,
        recent: this.kickHistory.slice(-5).map(v => Math.floor(v))
      }
    };
  }
}