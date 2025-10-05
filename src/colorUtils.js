// src/colorUtils.js

// 1. Define a list of colors for the system to cycle through.
const AVAILABLE_COLORS = [
  '#ff4d4d', // Red
  '#33ccff', // Blue
  '#ffcc00', // Yellow
  '#94ff33', // Green
  '#ff6b6b', // Pink
  '#cc99ff', // Purple
  '#ff9966', // Orange
  '#6666ff', // Indigo
  '#ff66a3', // Magenta
  '#33ff99', // Cyan/Teal
];

// 2. Define a persistent storage map OUTSIDE any React component.
// This is the cache that ensures the same type always gets the same color.
export const typeColorMap = {}; 

// 3. Keep a counter to cycle through the AVAILABLE_COLORS array.
let colorIndex = 0;

/**
 * Assigns a persistent color to a toy type. If the type is new, a color is assigned
 * from the AVAILABLE_COLORS list and saved in typeColorMap.
 * @param {string} type - The toy type string (e.g., 'Gundam').
 * @returns {string} The HEX color code.
 */
export const getTypeBadgeColor = (type) => {
  const DEFAULT_COLOR = '#666666'; 
  const lowerType = type?.toLowerCase().trim();

  if (!lowerType) {
    return DEFAULT_COLOR;
  }
  
  // CHECK MAP: If the color exists in the map, return it immediately.
  if (typeColorMap[lowerType]) {
    return typeColorMap[lowerType];
  }

  // ASSIGN NEW COLOR: If not found, assign a new color from the cycle.
  const newColor = AVAILABLE_COLORS[colorIndex];
  
  // Store the new assignment in the persistent map
  typeColorMap[lowerType] = newColor;

  // ADVANCE INDEX: Move to the next color, wrapping around if necessary.
  colorIndex = (colorIndex + 1) % AVAILABLE_COLORS.length;

  // Return the newly assigned color
  return newColor;
};