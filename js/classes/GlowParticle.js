// js/classes/GlowParticle.js

class GlowParticle {
  constructor() {
    // Empty constructor
  }

  initialize() {
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

  draw(kickEnergy) {  // Change parameter from bassEnergy to kickEnergy
    let x = cos(this.angle) * this.radius;
    let y = sin(this.angle) * this.radius;

    let whiteness = map(kickEnergy, 0, 255, 0, 80);  // Use kickEnergy
    let adjustedColor = color(
      hue(this.color),
      saturation(this.color) - whiteness,
      100
    );

    let kickGlow = map(kickEnergy, 0, 255, this.size, this.size * 3);  // Use kickEnergy
    drawingContext.shadowBlur = kickGlow;
    drawingContext.shadowColor = adjustedColor.toString();

    let kickAlpha = map(kickEnergy, 0, 255, this.alpha, min(1, this.alpha * 1.5));  // Use kickEnergy
    fill(adjustedColor);
    noStroke();
    circle(x, y, this.size);

    drawingContext.shadowBlur = 0;
  }
}