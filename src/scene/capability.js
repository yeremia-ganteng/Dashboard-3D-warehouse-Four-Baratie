// Deteksi WebGL dan perangkat lemah -> '2d' | 'low' | 'high'
export function detectQuality() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return '2d';
    gl.getExtension('WEBGL_lose_context')?.loseContext(); // lepas konteks uji
    const mem = navigator.deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    return mem <= 2 || cores <= 2 ? 'low' : 'high';
  } catch {
    return '2d';
  }
}
export const reducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;