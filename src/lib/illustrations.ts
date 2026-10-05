/**
 * Hand-drawn line-art illustrations, one per product category.
 *
 * Each drawing lives in a 240x180 local coordinate box and is composed into
 * product placeholder images (seed script) and the home page category tiles.
 * Style: zinc strokes on the light surface, emerald accent details.
 *
 * Default presentation attributes (stroke etc.) are applied by the wrapper
 * <g> element in the consumer; individual elements override when needed.
 */

const STROKE = "#52525b";
const ACCENT = "#059669";
const FILL_SOFT = "#e4e4e7";

const cpu = `
  <path d="M50,122 L50,152 Q50,160 58,160 L88,160 Z" fill="${FILL_SOFT}" stroke="none"/>
  <rect x="50" y="20" width="140" height="140" rx="6"/>
  <rect x="88" y="58" width="64" height="64" stroke="${ACCENT}"/>
  <rect x="66" y="42" width="9" height="9"/>
  <rect x="165" y="42" width="9" height="9"/>
  <rect x="66" y="129" width="9" height="9"/>
  <rect x="165" y="129" width="9" height="9"/>
`;

const gpu = `
  <rect x="10" y="45" width="15" height="112" fill="${FILL_SOFT}"/>
  <rect x="25" y="45" width="190" height="95" rx="6"/>
  <rect x="150" y="32" width="38" height="13"/>
  <circle cx="85" cy="92" r="34"/>
  <circle cx="85" cy="92" r="12"/>
  <circle cx="167" cy="92" r="34"/>
  <circle cx="167" cy="92" r="12"/>
  <rect x="58" y="140" width="118" height="14" stroke="${ACCENT}"/>
  <line x1="72" y1="140" x2="72" y2="154" stroke="${ACCENT}" stroke-width="2"/>
  <line x1="86" y1="140" x2="86" y2="154" stroke="${ACCENT}" stroke-width="2"/>
  <line x1="100" y1="140" x2="100" y2="154" stroke="${ACCENT}" stroke-width="2"/>
  <line x1="114" y1="140" x2="114" y2="154" stroke="${ACCENT}" stroke-width="2"/>
  <line x1="128" y1="140" x2="128" y2="154" stroke="${ACCENT}" stroke-width="2"/>
  <line x1="142" y1="140" x2="142" y2="154" stroke="${ACCENT}" stroke-width="2"/>
  <line x1="156" y1="140" x2="156" y2="154" stroke="${ACCENT}" stroke-width="2"/>
`;

const motherboard = `
  <rect x="40" y="18" width="160" height="145" rx="4"/>
  <rect x="70" y="40" width="52" height="52"/>
  <rect x="82" y="52" width="28" height="28" stroke="${ACCENT}"/>
  <rect x="150" y="30" width="9" height="85"/>
  <rect x="164" y="30" width="9" height="85"/>
  <rect x="58" y="108" width="80" height="11"/>
  <rect x="58" y="126" width="60" height="11"/>
  <rect x="150" y="125" width="28" height="28" stroke="${ACCENT}"/>
`;

const ram = `
  <rect x="28" y="62" width="184" height="48" rx="4"/>
  <rect x="38" y="70" width="16" height="28"/>
  <rect x="59" y="70" width="16" height="28"/>
  <rect x="80" y="70" width="16" height="28"/>
  <rect x="101" y="70" width="16" height="28"/>
  <rect x="122" y="70" width="16" height="28"/>
  <rect x="143" y="70" width="16" height="28"/>
  <rect x="164" y="70" width="16" height="28"/>
  <rect x="185" y="70" width="16" height="28"/>
  <rect x="28" y="110" width="24" height="8" stroke="${ACCENT}"/>
  <rect x="62" y="110" width="150" height="8" stroke="${ACCENT}"/>
`;

const storage = `
  <rect x="28" y="70" width="184" height="42" rx="3"/>
  <rect x="28" y="70" width="16" height="42" stroke="${ACCENT}"/>
  <line x1="33" y1="76" x2="33" y2="106" stroke="${ACCENT}" stroke-width="2"/>
  <line x1="39" y1="76" x2="39" y2="106" stroke="${ACCENT}" stroke-width="2"/>
  <rect x="60" y="78" width="42" height="26"/>
  <rect x="112" y="78" width="42" height="26"/>
  <circle cx="202" cy="91" r="5"/>
`;

const psu = `
  <rect x="45" y="30" width="150" height="120" rx="6"/>
  <circle cx="110" cy="90" r="40"/>
  <circle cx="110" cy="90" r="13"/>
  <g>
    <path d="M110,55 Q128,72 148,88"/>
    <path d="M110,55 Q128,72 148,88" transform="rotate(90 110 90)"/>
    <path d="M110,55 Q128,72 148,88" transform="rotate(180 110 90)"/>
    <path d="M110,55 Q128,72 148,88" transform="rotate(270 110 90)"/>
  </g>
  <rect x="175" y="45" width="12" height="18" rx="2" stroke="${ACCENT}"/>
  <rect x="175" y="75" width="12" height="18" rx="2" stroke="${ACCENT}"/>
  <rect x="175" y="105" width="12" height="18" rx="2" stroke="${ACCENT}"/>
`;

const cooler = `
  <g transform="translate(-22,0)">
  <rect x="85" y="18" width="70" height="18" rx="3"/>
  <path d="M100,36 C100,48 96,58 96,70" stroke="${ACCENT}"/>
  <path d="M140,36 C140,48 144,58 143,66" stroke="${ACCENT}"/>
  <rect x="70" y="40" width="100" height="95" rx="4"/>
  <line x1="74" y1="56" x2="166" y2="56"/>
  <line x1="74" y1="71" x2="166" y2="71"/>
  <line x1="74" y1="86" x2="166" y2="86"/>
  <line x1="74" y1="101" x2="166" y2="101"/>
  <line x1="74" y1="116" x2="166" y2="116"/>
  <circle cx="176" cy="87" r="38" fill="#ffffff"/>
  <circle cx="176" cy="87" r="12"/>
  <path d="M176,55 Q192,70 210,87"/>
  <path d="M176,55 Q192,70 210,87" transform="rotate(120 176 87)"/>
  <path d="M176,55 Q192,70 210,87" transform="rotate(240 176 87)"/>
  </g>
`;

const pcCase = `
  <rect x="80" y="15" width="100" height="155" rx="6"/>
  <rect x="88" y="25" width="60" height="100" stroke="${ACCENT}"/>
  <line x1="148" y1="15" x2="148" y2="170"/>
  <circle cx="164" cy="55" r="12" stroke="${ACCENT}"/>
  <circle cx="164" cy="95" r="12" stroke="${ACCENT}"/>
  <circle cx="164" cy="28" r="4"/>
  <rect x="84" y="170" width="16" height="6" fill="${FILL_SOFT}" stroke="none"/>
  <rect x="160" y="170" width="16" height="6" fill="${FILL_SOFT}" stroke="none"/>
`;

/** Illustration markup per category slug, drawn inside a 240x180 box. */
export const CATEGORY_ILLUSTRATIONS: Record<string, string> = {
  cpu,
  gpu,
  motherboard,
  ram,
  storage,
  psu,
  cooler,
  case: pcCase,
};

/** Default presentation attributes for an illustration wrapper element. */
export const ILLUSTRATION_ATTRS = `fill="none" stroke="${STROKE}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"`;

export function categoryIllustration(slug: string): string | undefined {
  return CATEGORY_ILLUSTRATIONS[slug];
}
