import * as THREE from 'three';
import { makeMarbleTexture } from './textures.js';

// Palet identitas visual. Material dibagi pakai ulang (hemat memori & draw call).
export const PAL = { cream: '#F8F1E7', cream2: '#F3E9DA', marun: '#6B1F23', ink: '#111111', gold: '#B07A3A' };
const L = (color, o = {}) => new THREE.MeshLambertMaterial({ color, ...o });

export const M = {
  cream: L(PAL.cream), cream2: L(PAL.cream2), marun: L(PAL.marun), ink: L(PAL.ink), gold: L(PAL.gold),
  wood: L('#9B7248'), steel: L('#C9C4BC'), dark: L('#2B2B2B'),
  marble: L('#ffffff', { map: makeMarbleTexture() }),
  glass: new THREE.MeshLambertMaterial({ color: '#CFE6EA', transparent: true, opacity: 0.14, depthWrite: false }),
  // Bayangan palsu (plane gelap transparan) -> tanpa shadow map, ringan di HP
  shadow: new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.12, depthWrite: false }),
};