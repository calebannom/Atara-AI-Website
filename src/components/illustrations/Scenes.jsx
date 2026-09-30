import React from 'react';
import './Scenes.css';

// ─────────────────────────────────────────────────────────────────────
// Original flat-vector scenes of people, drawn for Atara.
//
// The brief was to put human connection on the page — two people
// talking, one receiving counsel from the other, and moments of shared
// joy. These are hand-authored SVG rather than stock art so they carry
// the product's own palette (the logo's rose, the structural navy) and
// so there is no licensing or hotlinking to worry about.
//
// Every figure is built in a local coordinate space whose origin is the
// HIP. Everything above is negative y, the seated thigh runs along +x,
// and the shin drops back down. Composing that way is what makes the
// people actually read as sitting in the chairs rather than floating in
// front of them.
// ─────────────────────────────────────────────────────────────────────

const C = {
  rose: '#0A7C4A',
  roseMid: '#12A150',
  roseSoft: '#CFEBDC',
  roseWash: '#EDF8F1',
  navy: '#17402D',
  navyDeep: '#0F2A1E',
  navySoft: '#DDEDE4',
  teal: '#0FB39B',
  tealSoft: '#CFF0EA',
  amber: '#F5A524',
  amberSoft: '#FCE3B4',
  wood: '#C98A56',
  cream: '#FFF3E4',
  skinA: '#F0C09A',
  skinAdk: '#DCA87E',
  skinB: '#9C6540',
  skinBdk: '#835130',
  hairA: '#2E2140',
  hairB: '#3D2415',
  ink: '#241A38',
  white: '#FFFFFF',
};

function Blob({ fill, rotate = 0, opacity = 1, cx = 230, cy = 170 }) {
  return (
    <path
      opacity={opacity}
      fill={fill}
      transform={`rotate(${rotate} ${cx} ${cy})`}
      d="M368 126c23 45 14 107-25 141s-101 40-150 27-90-45-104-90 3-103 41-135 93-39 141-23 74 35 97 80z"
    />
  );
}

/* A head in three-quarter profile, looking toward +x. */
function Head({ skin, skinShade, hair, style, blush }) {
  return (
    <g>
      {/* ear on the far side */}
      <circle cx="-19" cy="2" r="6" fill={skinShade} />
      <circle cx="0" cy="0" r="24" fill={skin} />
      {/* nose, on the side being faced */}
      <path d="M23 -1c5 3 6 7 5 10-1 2-5 2-8 1z" fill={skinShade} />

      {style === 'bun' && (
        <>
          <path d="M-24 -3a24 24 0 0 1 47-6c1 5-8-9-24-9s-21 20-23 15z" fill={hair} />
          <circle cx="-24" cy="-13" r="10" fill={hair} />
        </>
      )}
      {style === 'long' && (
        <>
          <path d="M-24 -2a24 24 0 0 1 48-3c0 5-9-12-24-12s-22 20-24 15z" fill={hair} />
          <path d="M-24 -8c-8 6-11 30-6 52 7-8 6-32 8-40z" fill={hair} />
        </>
      )}
      {style === 'curls' && (
        <>
          <circle cx="-14" cy="-14" r="11" fill={hair} />
          <circle cx="2" cy="-20" r="12" fill={hair} />
          <circle cx="17" cy="-13" r="10" fill={hair} />
        </>
      )}
      {style === 'crop' && (
        <path d="M-24 -2a24 24 0 0 1 48 0c0 5-9-13-24-13s-22 18-24 13z" fill={hair} />
      )}

      {/* both eyes sit toward the side being faced, which is what sells
          the three-quarter turn */}
      <circle cx="7" cy="-3" r="2.6" fill={C.ink} />
      <circle cx="17" cy="-3" r="2.6" fill={C.ink} />
      <path d="M8 9q5 4 10 0" stroke={C.ink} strokeWidth="2.4"
            strokeLinecap="round" fill="none" />
      {blush && <circle cx="6" cy="6" r="5" fill={C.roseSoft} opacity="0.8" />}
    </g>
  );
}

/**
 * A seated person, origin at the hip, facing +x.
 * `lean` tips the upper body forward (positive = toward the person
 * they are talking to), which is how attentiveness reads.
 */
function SeatedPerson({
  skin, skinShade, hair, hairStyle, top, topShade, trousers, trousersShade,
  lean = 0, armPose = 'gesture', blush,
}) {
  return (
    <g>
      {/* ── legs ───────────────────────────────────────────────────── */}
      {/* far leg, slightly behind */}
      <rect x="-2" y="-16" width="44" height="26" rx="13" fill={trousersShade} />
      <rect x="24" y="-8" width="22" height="54" rx="11" fill={trousersShade} />
      {/* near leg */}
      <rect x="0" y="-6" width="50" height="27" rx="13.5" fill={trousers} />
      <rect x="34" y="4" width="24" height="56" rx="12" fill={trousers} />
      {/* shoe */}
      <path d="M32 52h26a9 9 0 0 1 9 9v3H32z" fill={C.ink} opacity="0.82" />

      {/* ── upper body, leaning ────────────────────────────────────── */}
      <g transform={`rotate(${lean} 0 0)`}>
        {/* torso: hips up to shoulders */}
        <path
          d="M-19 4c-2-16 1-38 4-52 3-13 13-21 26-21 14 0 24 9 25 23l3 50c0 6-5 10-11 10h-36c-6 0-11-4-11-10z"
          fill={top}
        />
        {/* the far side sits in shadow so the body reads as rounded */}
        <path d="M22 -67c8 3 13 11 14 21l3 50c0 6-5 10-11 10h-9z" fill={topShade} />

        {/* neck */}
        <rect x="-1" y="-84" width="17" height="22" rx="8.5" fill={skinShade} />

        <g transform="translate(7 -100)">
          <Head skin={skin} skinShade={skinShade} hair={hair}
                style={hairStyle} blush={blush} />
        </g>

        {/* near arm */}
        {armPose === 'gesture' ? (
          /* open palm, turned toward the other person — listening */
          <>
            <path d="M14 -56C34 -50 46 -38 50 -24" stroke={top} strokeWidth="15"
                  strokeLinecap="round" fill="none" />
            <circle cx="52" cy="-20" r="9" fill={skin} />
          </>
        ) : (
          /* hands folded into the lap — a more closed, listening-in posture */
          <>
            <path d="M12 -54C28 -44 32 -30 30 -16" stroke={top} strokeWidth="15"
                  strokeLinecap="round" fill="none" />
            <circle cx="29" cy="-11" r="9" fill={skin} />
          </>
        )}

        {/* far arm, resting along the body */}
        <path d="M-12 -54C-22 -42 -22 -26 -16 -14" stroke={topShade}
              strokeWidth="13" strokeLinecap="round" fill="none" />
      </g>
    </g>
  );
}

/* A simple armchair, seat top at y=0, facing +x (back on the -x side). */
function Chair({ body, shade }) {
  return (
    <g>
      <rect x="-46" y="-78" width="26" height="92" rx="12" fill={shade} />
      <rect x="-44" y="0" width="104" height="26" rx="12" fill={body} />
      <rect x="-30" y="24" width="12" height="30" rx="6" fill={C.wood} />
      <rect x="38" y="24" width="12" height="30" rx="6" fill={C.wood} />
    </g>
  );
}

function Bubble({ x, y, w, h, fill, tail = 'left', children }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} rx={Math.min(h / 2, 18)} fill={fill} />
      <path
        d={tail === 'left'
          ? `M${w * 0.24} ${h - 3} l-4 15 l20 -13z`
          : `M${w * 0.76} ${h - 3} l4 15 l-20 -13z`}
        fill={fill}
      />
      {children}
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   The counselling scene — one person listening, one being heard.
   ═══════════════════════════════════════════════════════════════════ */
export function CounselScene({ className, animated = true }) {
  return (
    <svg viewBox="0 0 460 340" className={className} role="img"
         aria-label="Two people sitting facing each other and talking — a counsellor listening to someone">
      <Blob fill={C.roseWash} />
      <Blob fill={C.navySoft} rotate={132} opacity={0.55} />

      {/* rug */}
      <ellipse cx="235" cy="286" rx="176" ry="26" fill={C.cream} />
      <ellipse cx="235" cy="286" rx="176" ry="26" fill={C.navy} opacity="0.05" />

      {/* plant, back left */}
      <g className={animated ? 'ill-sway' : undefined}
         style={{ transformOrigin: '52px 262px' }}>
        <path d="M52 262c-3-30 5-50 17-64-3 24-6 42-6 64z" fill={C.teal} />
        <path d="M50 262c-19-18-24-40-22-56 14 16 23 33 28 56z" fill={C.teal} opacity="0.7" />
        <path d="M40 258h28l-4 30H44z" fill={C.amber} />
      </g>

      {/* chairs, drawn before the people */}
      <g transform="translate(150 214)"><Chair body={C.navySoft} shade="#CBD4EF" /></g>
      <g transform="translate(330 214) scale(-1 1)"><Chair body={C.roseSoft} shade="#EFB3D6" /></g>

      {/* the counsellor — leaning in, open hand, listening */}
      <g transform="translate(150 200)">
        <SeatedPerson
          skin={C.skinB} skinShade={C.skinBdk} hair={C.hairB} hairStyle="bun"
          top={C.navy} topShade={C.navyDeep}
          trousers="#3D4E9E" trousersShade={C.navyDeep}
          lean={7} armPose="gesture"
        />
      </g>

      {/* the person being counselled — hands in the lap, turned to speak */}
      <g transform="translate(330 200) scale(-1 1)">
        <SeatedPerson
          skin={C.skinA} skinShade={C.skinAdk} hair={C.hairA} hairStyle="long"
          top={C.roseMid} topShade={C.rose}
          trousers="#5B4A86" trousersShade="#463868"
          lean={-3} armPose="lap" blush
        />
      </g>

      {/* the conversation itself, alternating */}
      <g className={animated ? 'ill-bubble-b' : undefined}>
        <Bubble x={258} y={12} w={104} h={40} fill={C.white} tail="right">
          <circle cx="30" cy="20" r="4.4" fill={C.rose} opacity="0.35" />
          <circle cx="50" cy="20" r="4.4" fill={C.rose} opacity="0.6" />
          <circle cx="70" cy="20" r="4.4" fill={C.rose} opacity="0.85" />
        </Bubble>
      </g>
      <g className={animated ? 'ill-bubble-a' : undefined}>
        <Bubble x={140} y={18} w={96} h={38} fill={C.navy} tail="left">
          <path d="M48 11c4-7 15-5 15 3 0 6-9 11-15 15-6-4-15-9-15-15 0-8 11-10 15-3z"
                fill={C.white} opacity="0.95" />
        </Bubble>
      </g>

      {/* warmth marks */}
      <circle cx="410" cy="96" r="6" fill={C.amber} opacity="0.7"
              className={animated ? 'ill-twinkle' : undefined} />
      <circle cx="72" cy="128" r="4.5" fill={C.teal} opacity="0.65"
              className={animated ? 'ill-twinkle ill-delay' : undefined} />
      <circle cx="392" cy="196" r="3.5" fill={C.rose} opacity="0.5"
              className={animated ? 'ill-twinkle' : undefined} />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Shared joy — the moment something lifts.
   ═══════════════════════════════════════════════════════════════════ */
function StandingCheerer({ skin, skinShade, hair, hairStyle, top, topShade, trousers }) {
  return (
    <g>
      {/* legs */}
      <rect x="-16" y="0" width="22" height="56" rx="11" fill={trousers} />
      <rect x="10" y="0" width="22" height="56" rx="11" fill={trousers} />
      <path d="M-18 50h24v10a5 5 0 0 1-5 5h-19z" fill={C.ink} opacity="0.8" />
      <path d="M8 50h24v15H13a5 5 0 0 1-5-5z" fill={C.ink} opacity="0.8" />

      {/* torso */}
      <path d="M-22 4c-3-16 0-40 3-54 3-13 12-21 25-21s22 8 25 21c3 14 6 38 3 54z"
            fill={top} />
      <path d="M18 -71c7 4 11 11 13 18 3 14 6 38 3 54h-9z" fill={topShade} />

      {/* both arms up */}
      <path d="M-18 -56C-40 -66-50 -84-48 -102" stroke={top} strokeWidth="14"
            strokeLinecap="round" fill="none" />
      <path d="M18 -56C40 -66 50 -84 48 -102" stroke={top} strokeWidth="14"
            strokeLinecap="round" fill="none" />
      <circle cx="-49" cy="-107" r="8.5" fill={skin} />
      <circle cx="49" cy="-107" r="8.5" fill={skin} />

      <rect x="-8" y="-92" width="17" height="22" rx="8.5" fill={skinShade} />
      <g transform="translate(0 -110)">
        <circle cx="0" cy="0" r="25" fill={skin} />
        {hairStyle === 'curls' ? (
          <>
            <circle cx="-16" cy="-14" r="12" fill={hair} />
            <circle cx="0" cy="-21" r="13" fill={hair} />
            <circle cx="16" cy="-14" r="12" fill={hair} />
          </>
        ) : (
          <path d="M-25 -3a25 25 0 0 1 50 0c0 6-9-14-25-14s-23 20-25 14z" fill={hair} />
        )}
        <circle cx="-8" cy="-2" r="2.8" fill={C.ink} />
        <circle cx="8" cy="-2" r="2.8" fill={C.ink} />
        {/* open, delighted mouth */}
        <path d="M-8 8a8 8 0 0 0 16 0z" fill={C.ink} opacity="0.85" />
        <circle cx="-15" cy="6" r="5" fill={C.roseSoft} opacity="0.85" />
        <circle cx="15" cy="6" r="5" fill={C.roseSoft} opacity="0.85" />
      </g>
    </g>
  );
}

export function JoyScene({ className, animated = true }) {
  return (
    <svg viewBox="0 0 460 340" className={className} role="img"
         aria-label="Two people celebrating together with their arms raised">
      <Blob fill={C.tealSoft} rotate={42} opacity={0.7} />
      <Blob fill={C.roseWash} rotate={196} opacity={0.85} />
      <ellipse cx="230" cy="290" rx="150" ry="16" fill={C.navy} opacity="0.07" />

      {[
        [96, 58, C.rose, 0], [356, 70, C.teal, 0.5], [146, 30, C.amber, 1.0],
        [306, 36, C.navy, 1.5], [66, 130, C.amber, 2.0], [388, 142, C.rose, 2.6],
        [232, 22, C.teal, 3.1],
      ].map(([cx, cy, fill, d], i) => (
        <rect key={i} x={cx} y={cy} width="11" height="11" rx="3.5" fill={fill}
              opacity="0.85" transform={`rotate(${i * 41} ${cx + 5} ${cy + 5})`}
              className={animated ? 'ill-fall' : undefined}
              style={{ animationDelay: `${d}s` }} />
      ))}

      <g transform="translate(168 230)" className={animated ? 'ill-hop' : undefined}>
        <StandingCheerer
          skin={C.skinA} skinShade={C.skinAdk} hair={C.hairA} hairStyle="straight"
          top={C.rose} topShade="#A80069" trousers={C.navyDeep}
        />
      </g>
      <g transform="translate(296 230)" className={animated ? 'ill-hop' : undefined}
         style={{ animationDelay: '0.32s' }}>
        <StandingCheerer
          skin={C.skinB} skinShade={C.skinBdk} hair={C.hairB} hairStyle="curls"
          top={C.teal} topShade="#0A8C79" trousers={C.navy}
        />
      </g>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   A compact two-figure mark for smaller slots.
   ═══════════════════════════════════════════════════════════════════ */
export function ListeningMark({ size = 72, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" className={className}
         role="img" aria-label="Two people in conversation">
      <circle cx="48" cy="48" r="46" fill={C.roseWash} />
      <circle cx="31" cy="38" r="12" fill={C.navy} />
      <path d="M11 76c0-12 9-21 20-21s20 9 20 21z" fill={C.navy} opacity="0.9" />
      <circle cx="66" cy="43" r="10" fill={C.rose} />
      <path d="M50 76c0-10 7-18 16-18s16 8 16 18z" fill={C.rose} opacity="0.9" />
      <path d="M45 20c3-5 12-4 12 3 0 6-8 10-12 13-4-3-12-7-12-13 0-7 9-8 12-3z"
            fill={C.amber} />
    </svg>
  );
}

export const SCENE_COLORS = C;
