/** Local vector heart used by the BioCore review build. */
export function heartGraphic(className = '') {
  return `<svg class="heart-svg ${className}" viewBox="0 0 520 660" role="img" aria-label="Bluish-purple electrical anatomical heart visualization" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="heartBody" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#d6e7ff" stop-opacity=".96"/>
        <stop offset=".2" stop-color="#7568ef"/>
        <stop offset=".52" stop-color="#322184"/>
        <stop offset="1" stop-color="#120d39"/>
      </linearGradient>
      <radialGradient id="heartCore" cx="48%" cy="52%" r="46%">
        <stop offset="0" stop-color="#fff"/>
        <stop offset=".12" stop-color="#dfaaff" stop-opacity=".95"/>
        <stop offset=".38" stop-color="#7b5fff" stop-opacity=".36"/>
        <stop offset="1" stop-color="#18113c" stop-opacity="0"/>
      </radialGradient>
      <filter id="heartGlow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="10" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="veinGlow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="4" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <clipPath id="heartClip">
        <path d="M252 601C166 543 104 456 100 347c-3-74 35-126 91-139 25-6 50-1 71 14 16-31 43-52 76-57 54-8 105 28 119 89 20 88-19 196-93 280-38 43-72 64-112 67Z"/>
      </clipPath>
    </defs>
    <g class="heart-anatomy" filter="url(#heartGlow)">
      <path class="heart-vessel vessel-a" d="M260 221c-6-62 5-111 33-159l37 16c-21 50-25 95-15 142" fill="none" stroke="url(#heartBody)" stroke-width="35" stroke-linecap="round"/>
      <path class="heart-vessel vessel-b" d="M314 213c20-74 52-111 92-132l24 31c-42 29-60 66-65 119" fill="none" stroke="url(#heartBody)" stroke-width="31" stroke-linecap="round"/>
      <path class="heart-vessel vessel-c" d="M230 224c-31-59-37-102-22-153l37 6c-8 50 1 90 31 132" fill="none" stroke="url(#heartBody)" stroke-width="29" stroke-linecap="round"/>
      <path class="heart-vessel vessel-d" d="M190 230c-43-40-65-78-65-120l36-6c8 46 31 79 70 105" fill="none" stroke="url(#heartBody)" stroke-width="27" stroke-linecap="round"/>
      <path class="heart-body" d="M252 601C166 543 104 456 100 347c-3-74 35-126 91-139 25-6 50-1 71 14 16-31 43-52 76-57 54-8 105 28 119 89 20 88-19 196-93 280-38 43-72 64-112 67Z" fill="url(#heartBody)" stroke="#b7c8ff" stroke-opacity=".72" stroke-width="3"/>
      <path d="M262 226c-26 64-25 151 12 248 22 57 38 91 30 117" fill="none" stroke="#92a8ff" stroke-opacity=".42" stroke-width="12"/>
      <ellipse class="heart-core-light" cx="265" cy="390" rx="155" ry="186" fill="url(#heartCore)"/>
    </g>
    <g clip-path="url(#heartClip)" class="vein-network" fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#veinGlow)">
      <path d="M262 220c-12 69-2 132 18 196 14 47 4 112-24 175" stroke="#f0b7ff" stroke-width="5"/>
      <path d="M270 302c-57 17-94 52-131 103M275 351c53 5 101 33 147 75M259 398c-57 17-83 57-104 101M279 438c49 16 71 47 93 86" stroke="#8fd5ff" stroke-width="3.4"/>
      <path d="M207 257c24 38 31 74 32 116M333 222c-25 54-30 101-25 151M190 339c28 12 43 31 57 55M354 335c-28 14-44 34-59 62M201 453c30 5 49 23 59 50M339 457c-27 8-43 26-56 51" stroke="#b98cff" stroke-width="2.6"/>
      <path d="M159 284l46 48 20-46M378 278l-51 50-22-43M142 421l61-22-10 52M405 432l-67-29 12 53M222 538l34-55 24 58" stroke="#eef7ff" stroke-opacity=".68" stroke-width="1.8"/>
    </g>
    <g class="heart-sparks" fill="#fff" filter="url(#veinGlow)">
      <circle cx="264" cy="388" r="8"/><circle cx="198" cy="332" r="4"/><circle cx="335" cy="326" r="4"/><circle cx="231" cy="476" r="3"/><circle cx="324" cy="467" r="3"/>
    </g>
  </svg>`;
}
