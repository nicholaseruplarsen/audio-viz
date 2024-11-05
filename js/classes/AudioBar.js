// js/classes/AudioBar.js

class AudioBar {
  constructor(index, total) {
    this.index = index;
    this.total = total; // Store total for later use
    this.width = 0; // Will set in initialize()
    this.x = 0;     // Will set in initialize()
    this.height = 0;
    this.targetHeight = 0;
    this.color = color(0, 0, 100);
    this.scale = 1;
  }

  initialize() {
    this.width = (MIN_RADIUS * 2) / this.total;
    this.x = -MIN_RADIUS + (this.width * this.index);
  }

  updateSensitivity(sensitivity, bassEnergy, globalHue) { // Add globalHue parameter
    let distanceFromCenter = Math.abs(this.index - this.total/2);
    let scaleFactor = 1 - (distanceFromCenter / (this.total/2));
    scaleFactor = pow(scaleFactor, 1.5);

    this.targetHeight = map(sensitivity, 0, 255, 0, MIN_RADIUS) * scaleFactor;
    this.height = lerp(this.height, this.targetHeight, 0.3);

    let whiteness = map(bassEnergy, 0, 255, 0, 80);
    this.color = color((globalHue + this.index) % 360, 100 - whiteness, 100, 0.7);
    this.scale = map(bassEnergy, 0, 255, 1, 1.3);
  }

  draw(bassEnergy) {
    if (this.height < 0.5) return;
    push();
    scale(this.scale);

    let whiteness = map(bassEnergy, 0, 255, 0, 50);
    let adjustedColor = color(
      hue(this.color),
      saturation(this.color) - whiteness,
      brightness(this.color) + whiteness,
      0.7
    );
    fill(adjustedColor);
    noStroke();

    let glowSize = map(bassEnergy, 0, 255, 10, 25);
    drawingContext.shadowBlur = glowSize;
    drawingContext.shadowColor = adjustedColor.toString();

    drawingContext.shadowBlur = map(bassEnergy, 0, 255, 0, 15);
    drawingContext.shadowColor = color(0, 0, 100).toString();

    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.arc(0, 0, MIN_RADIUS, 0, TWO_PI);
    drawingContext.clip();

    const centerOffset = this.width;
    rect(this.x - centerOffset, -this.height/2, this.width * 0.6, this.height);

    drawingContext.restore();
    drawingContext.shadowBlur = 0;
    pop();
  }
}