// js/utils/colorUtils.js

function getColorPalette(baseHue) {
  return [
    [baseHue, 100, 100],             // Pure primary
    [(baseHue + 5) % 360, 100, 95],  // Slight variation
    [(baseHue - 5) % 360, 100, 90],  // Another variation
    [(baseHue + 180) % 360, 100, 85],// Complementary
    [(baseHue + 90) % 360, 100, 95]  // Orthogonal
  ];
}