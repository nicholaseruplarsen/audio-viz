// js/classes/RadialBand.js

class RadialBand {
  constructor(index, total) {
    this.index = index;
    this.angle = 0; // Will set in initialize()
    this.targetLength = 0;
    this.currentLength = 0;
    this.baseLength = 0; // Will set in initialize()
    this.glowIntensity = 0;
    this.rotationOffset = 0;
    this.scale = 1;
  }

  initialize(total) {
    this.angle = (TWO_PI / total) * this.index;
    this.baseLength = random(30, 50);
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
    // Only draw if the length is significant enough to be visible
    if (this.currentLength < 1) return;

    push();
    scale(this.scale);
    rotate(this.angle + this.rotationOffset);

    let whiteness = map(bassEnergy, 0, 255, 0, 80);
    let adjustedColor = color(baseHue, 100 - whiteness, 100);

    // Only create gradient if length has changed significantly
    if (abs(this.currentLength - this.lastLength) > 1) {
      this.gradient = drawingContext.createLinearGradient(MIN_RADIUS, 0, this.currentLength, 0);
      let alpha = map(bassEnergy, 0, 255, 0.7, 1);
      this.gradient.addColorStop(0, color(baseHue, 100 - whiteness, 100, alpha).toString());
      this.gradient.addColorStop(1, color(baseHue, 100 - whiteness, 100, 0).toString());
      this.lastLength = this.currentLength;
    }

    drawingContext.strokeStyle = this.gradient || 'transparent';
    drawingContext.lineWidth = 2;

    let glowIntensity = map(bassEnergy, 0, 255, 10, 30);
    drawingContext.shadowBlur = glowIntensity;
    drawingContext.shadowColor = adjustedColor.toString();
    line(MIN_RADIUS, 0, this.currentLength, 0);

    drawingContext.shadowBlur = 0;
    pop();
  }  
}