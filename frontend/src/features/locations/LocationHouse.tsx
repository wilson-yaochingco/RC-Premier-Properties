import styles from "./locations-index.module.css";

/**
 * Brand illustration for the Locations hero: a contemporary two-storey Filipino residence
 * drawn as a light architectural elevation (hip roof with deep eaves, a cantilevered
 * balcony with glass balustrade, a timber-louvre screen, a covered carport wing, a
 * recessed entrance, and royal palms). Original artwork, no text, no external assets.
 *
 * Every stroke is 1px (`non-scaling-stroke`) and low-contrast so it reads as paper-thin
 * drafting behind the heading. Three opacity tiers separate structure, openings and
 * context, and the whole drawing is decorative (`aria-hidden`, no pointer events).
 */

const GROUND_Y = 500;

/** Hip-roof tile courses: horizontal lines clipped to the roof's slanted edges. */
const ROOF_COURSES = [152, 164, 176, 188, 200].map((y) => {
  const inset = (206 - y) * 0.985;
  return { y, x1: 440 + inset, x2: 930 - inset };
});

/** Vertical louvres on the screen beside the balcony. */
const LOUVRES = Array.from({ length: 10 }, (_, index) => 796 + index * 9);

/** Balustrade posts across the cantilevered slab. */
const BALUSTRADE_POSTS = Array.from({ length: 13 }, (_, index) => 458 + index * 37.8);

/** One royal palm: a gently curved trunk with fronds arching from the crown. */
function Palm({ x, top, lean }: { x: number; top: number; lean: 1 | -1 }) {
  const tx = x + lean * 6;
  const fronds: Array<[number, number, number, number]> = [
    [-92, 24, -50, -30],
    [-70, 58, -34, -10],
    [-36, 72, -14, 10],
    [92, 24, 50, -30],
    [70, 58, 34, -10],
    [36, 72, 14, 10],
    [6, -52, -10, -24],
  ];
  const rings = [0.18, 0.32, 0.46, 0.6, 0.74, 0.88];
  return (
    <g className={styles.houseContext}>
      <path
        d={`M${x - 4} ${GROUND_Y} C${x - 2} ${top + 120} ${tx - 6} ${top + 60} ${tx - 3} ${top}`}
      />
      <path
        d={`M${x + 4} ${GROUND_Y} C${x + 6} ${top + 120} ${tx + 2} ${top + 60} ${tx + 3} ${top}`}
      />
      {rings.map((t) => {
        const y = GROUND_Y - (GROUND_Y - top) * t;
        const bend = lean * 6 * t;
        return <line key={t} x1={x - 4 + bend} y1={y} x2={x + 4 + bend} y2={y} />;
      })}
      {fronds.map(([dx, dy, cx, cy]) => (
        <path
          key={`${dx}-${dy}`}
          d={`M${tx} ${top} Q${tx + cx} ${top + cy} ${tx + dx} ${top + dy}`}
        />
      ))}
    </g>
  );
}

export function LocationHouse({ className }: { className?: string }) {
  return (
    <svg
      className={`${styles.house} ${className ?? ""}`}
      viewBox="0 0 1200 560"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="location-house-fade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.16" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.84" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask
          id="location-house-mask"
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="1200"
          height="560"
        >
          <rect width="1200" height="560" fill="url(#location-house-fade)" />
        </mask>
      </defs>

      <g mask="url(#location-house-mask)">
        {/* Ground and paving perspective */}
        <g className={styles.houseStructure}>
          <line x1="40" y1={GROUND_Y} x2="1160" y2={GROUND_Y} />
        </g>
        <g className={styles.houseContext}>
          <line x1="232" y1={GROUND_Y} x2="150" y2="556" />
          <line x1="468" y1={GROUND_Y} x2="414" y2="556" />
          <line x1="636" y1="506" x2="564" y2="556" />
          <line x1="744" y1="506" x2="816" y2="556" />
        </g>

        {/* Carport wing: flat slab on slender columns */}
        <g className={styles.houseStructure}>
          <path d="M160 338H486M160 350H486M160 338V350M486 338V350" />
          <path d="M192 350V500M200 350V500M440 350V500M448 350V500" />
        </g>
        <g className={styles.houseDetail}>
          <path d="M214 372H430M214 380H430" />
          <path d="M470 350V500" />
        </g>

        {/* Main volume: ground floor */}
        <g className={styles.houseStructure}>
          <path d="M470 346V500M900 346V500" />
          {/* Intermediate slab with cantilevered balcony */}
          <path d="M456 334H914M456 346H914M456 334V346M914 334V346" />
        </g>
        <g className={styles.houseDetail}>
          {/* Entrance: recessed double door, transom, canopy and steps */}
          <path d="M650 376H730V500H650Z" />
          <path d="M690 392V500M650 392H730" />
          <circle cx="684" cy="448" r="2" />
          <circle cx="696" cy="448" r="2" />
          <path d="M628 364H752V370H628Z" />
          <path d="M640 506H740M630 512H750" />
          {/* Windows */}
          <path d="M500 380H612V456H500Z" />
          <path d="M537 380V456M574 380V456M494 460H618" />
          <path d="M770 380H880V456H770Z" />
          <path d="M825 380V456M764 460H886" />
        </g>

        {/* Upper floor */}
        <g className={styles.houseStructure}>
          <path d="M470 206V334M900 206V334" />
          {/* Glass balustrade */}
          <path d="M456 300H914" />
        </g>
        <g className={styles.houseDetail}>
          {BALUSTRADE_POSTS.map((x) => (
            <line key={x} x1={x} y1="300" x2={x} y2="334" />
          ))}
          <path d="M500 224H640V292H500Z" />
          <path d="M570 224V292M500 258H640" />
          <path d="M668 224H740V292H668Z" />
          <path d="M704 224V292" />
          <path d="M790 216H882V292H790Z" />
          {LOUVRES.map((x) => (
            <line key={x} x1={x} y1="220" x2={x} y2="288" />
          ))}
        </g>

        {/* Hip roof with deep eaves */}
        <g className={styles.houseStructure}>
          <path d="M440 206L505 140H865L930 206Z" />
          <path d="M440 213H930M440 206V213M930 206V213" />
        </g>
        <g className={styles.houseContext}>
          {ROOF_COURSES.map(({ y, x1, x2 }) => (
            <line key={y} x1={x1} y1={y} x2={x2} y2={y} />
          ))}
          <path d="M515 135H855" />
        </g>

        {/* Garden wing */}
        <g className={styles.houseDetail}>
          <path d="M900 350H1044M900 362H1044M1044 350V362" />
          <path d="M1030 362V500M1038 362V500" />
          <path d="M900 470H1092M900 478H1092" />
        </g>

        {/* Drafting marks: level datum and overall dimensions */}
        <g className={styles.houseContext}>
          <path d="M968 140V500M960 140H976M960 334H976M960 500H976" />
          <path d="M930 140H958M916 334H958" strokeDasharray="3 4" />
          <path d="M170 536H900M170 530V542M470 530V542M900 530V542" />
        </g>

        <Palm x={104} top={338} lean={1} />
        <Palm x={1100} top={318} lean={-1} />
        <g className={styles.houseContext}>
          <path d="M146 500a14 14 0 0 1 28 0M178 500a10 10 0 0 1 20 0" />
          <path d="M1010 500a12 12 0 0 1 24 0M1060 500a14 14 0 0 1 28 0" />
        </g>
      </g>
    </svg>
  );
}
