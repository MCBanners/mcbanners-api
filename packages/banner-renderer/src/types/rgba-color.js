export const rgbaColor = (r, g, b, a = 255) => ({
    r,
    g,
    b,
    a
});
export const rgbaColorToString = (color) => `rgba(${String(color.r)},${String(color.g)},${String(color.b)},${String(color.a / 255)})`;
export const WHITE = rgbaColor(255, 255, 255);
export const BLACK = rgbaColor(0, 0, 0);
export const TRANSPARENT = rgbaColor(0, 0, 0, 0);
