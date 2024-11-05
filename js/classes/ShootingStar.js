// js/classes/ShootingStar.js

class ShootingStar {
    constructor() {
      this.trail = [];
      this.maxTrailLength = 4;
    }
  
    initialize() {
      this.reset();
    }
  
    reset() {
      // Start from left side with slight vertical variation
      this.x = -width/2;
      this.y = random(-height/3, height/3);
      this.speed = random(15, 25);
      this.angle = random(-PI/16, PI/16); // Somewhat horizontal trajectory
      this.length = random(20, 40);
      this.width = random(2, 4);
      this.alpha = random(0.6, 0.9);  // Increased alpha for more visibility
      this.trail = [];
      this.alive = true;
      this.velocity = {
        x: cos(this.angle) * this.speed,
        y: sin(this.angle) * this.speed
      };
    }
  
    update(energy, speed, baseHue) {
      if (!this.alive) return;
  
      // Update position
      this.x += this.velocity.x * (1 + energy/255);
      this.y += this.velocity.y * (1 + energy/255);
  
      this.alpha *= 1;
  
      // Add to trail
      const newPos = {
        x: this.x,
        y: this.y,
        alpha: this.alpha
      };
      this.trail.unshift(newPos);
  
      // Maintain fixed trail length
      if (this.trail.length > this.maxTrailLength) {
        this.trail.pop();
      }
  
      // Check if out of bounds
      if (this.x > width/2 || this.y > height/2 || this.y < -height/2 || this.alpha < 0.05) {
        this.reset();
      }
    }
  
    draw(kickEnergy) {
      if (!this.alive || this.alpha < 0.05 || this.trail.length < 2) return;
  
      // Always use white color
      let adjustedColor = color(0, 0, 100, this.alpha);  // HSB white
  
      let kickGlow = constrain(map(kickEnergy, 0, 255, 4, 8), 4, 8);  // Increased glow
      drawingContext.shadowBlur = kickGlow;
      drawingContext.shadowColor = color(0, 0, 100).toString();  // Pure white glow
      noStroke();
      
      // Draw trail
      for (let i = 0; i < this.trail.length - 1; i++) {
        if (!this.trail[i] || !this.trail[i + 1]) continue;
        
        let current = this.trail[i];
        let next = this.trail[i + 1];
        
        let segmentAlpha = map(i, 0, this.trail.length - 1, this.alpha, 0);
        
        let trailColor = color(0, 0, 100, segmentAlpha);  // White trail with fading alpha
        
        fill(trailColor);
        
        push();
        translate(current.x, current.y);
        let angle = atan2(next.y - current.y, next.x - current.x);
        rotate(angle);
        
        let segmentWidth = map(i, 0, this.trail.length - 1, this.width, 0.2);
        ellipse(0, 0, this.length * 0.4, segmentWidth);
        pop();
      }
  
      // Draw head
      if (this.trail[0]) {
        fill(adjustedColor);
        push();
        translate(this.trail[0].x, this.trail[0].y);
        rotate(atan2(this.velocity.y, this.velocity.x));
        ellipse(0, 0, this.length * 0.6, this.width);
        pop();
      }
  
      drawingContext.shadowBlur = 0;
    }
  }