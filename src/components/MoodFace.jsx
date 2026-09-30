import React from 'react';
import { moodColors, moodLabels } from '../constants/theme';

// Line-art mood faces, drawn rather than typed.
//
// These replace the emoji glyphs this app used to render (😄🙂😐😔😢).
// Emoji were a problem for a mood tracker: every OS draws them in its own
// house style, so the five faces never read as one set, they ignored the
// mood palette entirely, and their weight/size shifted between Windows,
// macOS, Android and iOS. Drawing them as SVG makes the five a matched
// family, ties each face to its own colour from moodColors, and keeps the
// stroke weight identical at every size they're used at.

const STROKE = 2.6;

// Geometry is authored against a 48x48 box: a circle at (24,24) r=20.5,
// eyes on the y=20 line, mouth around y=26-32.
const FACES = {
  // Very good — dot eyes, open smile with a tongue.
  rad: (c) => (
    <>
      <circle cx="17.5" cy="20" r="2.4" fill={c} stroke="none" />
      <circle cx="30.5" cy="20" r="2.4" fill={c} stroke="none" />
      <path d="M15 26.2q9 9.2 18 0" />
      <path d="M22 30.5c0.4 6.4 3.9 6.4 4.3 0" />
    </>
  ),
  // Good — dot eyes, plain smile.
  good: (c) => (
    <>
      <circle cx="17.5" cy="20" r="2.4" fill={c} stroke="none" />
      <circle cx="30.5" cy="20" r="2.4" fill={c} stroke="none" />
      <path d="M15 26.6q9 8 18 0" />
    </>
  ),
  // Normal — dot eyes, flat mouth.
  meh: (c) => (
    <>
      <circle cx="17.5" cy="20" r="2.4" fill={c} stroke="none" />
      <circle cx="30.5" cy="20" r="2.4" fill={c} stroke="none" />
      <path d="M17 29.5h14" />
    </>
  ),
  // Bad — dot eyes, frown.
  bad: (c) => (
    <>
      <circle cx="17.5" cy="20" r="2.4" fill={c} stroke="none" />
      <circle cx="30.5" cy="20" r="2.4" fill={c} stroke="none" />
      <path d="M15.5 31.2q8.5-7.4 17 0" />
    </>
  ),
  // Awful — crossed-out eyes, nose, deep frown.
  awful: (c) => (
    <>
      <path d="M14.6 16.9 20.4 22.7" />
      <path d="M20.4 16.9 14.6 22.7" />
      <path d="M27.6 16.9 33.4 22.7" />
      <path d="M33.4 16.9 27.6 22.7" />
      <circle cx="24" cy="26.4" r="1.35" fill={c} stroke="none" />
      <path d="M16 32.6q8-6.8 16 0" />
    </>
  ),
};

/**
 * @param {string}  mood   one of rad | good | meh | bad | awful
 * @param {number}  size   rendered px (square). Default 24.
 * @param {string}  label  pass when the face is the only indicator of the
 *                         mood, so screen readers announce it. Omit when a
 *                         text label sits next to it — then it's decorative.
 */
export default function MoodFace({ mood, size = 24, label, className, style }) {
  const draw = FACES[mood];
  if (!draw) return null;

  const color = moodColors[mood];
  const described = label === true ? moodLabels[mood] : label;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      style={style}
      fill="none"
      stroke={color}
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={described ? 'img' : undefined}
      aria-label={described || undefined}
      aria-hidden={described ? undefined : true}
      focusable="false"
    >
      {/* Faint wash of the mood's own colour, so the face reads as filled
          on light surfaces without needing a second palette. */}
      <circle cx="24" cy="24" r="20.5" fill={`${color}1F`} />
      {draw(color)}
    </svg>
  );
}
