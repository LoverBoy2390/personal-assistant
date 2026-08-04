import c01 from './heart-art-01.mjs';
import c02 from './heart-art-02.mjs';
import c03 from './heart-art-03.mjs';
import c04 from './heart-art-04.mjs';

export const heartArtBase64 = [c01, c02, c03, c04].join('');
export const heartArtUrl = `data:image/webp;base64,${heartArtBase64}`;
