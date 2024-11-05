// js/classes/BassRing.js

class BassRing {
  constructor() {
    this.radius = 0; // Will set in initialize()
    this.thickness = 5;
    this.rotation = 0;
    this.scale = 1;
  }

  initialize() {
    this.radius = MIN_RADIUS * 1.5;
  }

  update(highEnergy, bassEnergy, globalSpeed) {
    this.thickness = map(highEnergy, 0, 255, 5, 20);
    this.rotation += 0.01 * globalSpeed;
    this.scale = map(bassEnergy, 0, 255, 1, 1.3);
  }

  draw(bassEnergy, globalHue) { // Add globalHue parameter
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