import { useCallback, useEffect, useRef, useState } from 'react';

// Thin wrapper around the browser's own Web Speech API (SpeechRecognition).
//
// Deliberately client-only: no server, no API key, nothing added to the
// bundle that could leak (the app already ships a Groq key in its JS —
// see aiService.js — and this feature is not going to add a second one).
// The trade-off is browser support: solid in Chrome, unsupported in
// Firefox, inconsistent in Safari — and, importantly, NOT actually
// working in stable Microsoft Edge despite exposing the constructor.
//
// Edge ships `webkitSpeechRecognition` (so naive feature-detection says
// "supported"), but calling it is a silent no-op in current stable
// releases: no error event, no result event, nothing — see
// https://github.com/mdn/browser-compat-data/issues/22126. Edge's real,
// working implementation is a newer on-device model, currently shipping
// only in Canary/Dev behind a flag (learn.microsoft.com/microsoft-edge/
// web-platform/speech-recognition-api), and it's identifiable by a
// genuinely new capability that the old broken shim lacks: a
// `processLocally` property and `available()`/`install()` static methods.
// So Edge is only trusted once it exposes that new surface; until then,
// the mic button is hidden there exactly as it would be in Firefox,
// rather than shown and silently doing nothing when tapped.
const SpeechRecognitionCtor =
  typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;

const isEdge = typeof navigator !== 'undefined' && /\bEdg\//.test(navigator.userAgent);
const edgeHasWorkingLocalModel = Boolean(
  SpeechRecognitionCtor
  && (
    (SpeechRecognitionCtor.prototype && 'processLocally' in SpeechRecognitionCtor.prototype)
    || typeof SpeechRecognitionCtor.available === 'function'
  )
);
const SPEECH_SUPPORTED = Boolean(SpeechRecognitionCtor) && (!isEdge || edgeHasWorkingLocalModel);

const ERROR_MESSAGES = {
  'not-allowed': 'Microphone access was blocked. Allow it in your browser’s site settings to use voice input.',
  'service-not-allowed': 'Microphone access was blocked. Allow it in your browser’s site settings to use voice input.',
  'no-speech': "Didn't catch that — try again whenever you're ready.",
  'audio-capture': 'No microphone found. Check that one is connected and try again.',
  network: 'Voice input needs a connection. Please try again.',
};

/**
 * @param {(chunk: string) => void} onFinalChunk - called once per finalized
 *   phrase as the person speaks (not the running total — the caller
 *   appends each chunk itself, same as typing).
 */
export function useSpeechToText({ onFinalChunk } = {}) {
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState('');

  const recognitionRef = useRef(null);
  const interimRef = useRef('');
  const onFinalChunkRef = useRef(onFinalChunk);
  onFinalChunkRef.current = onFinalChunk;

  const setInterim = (text) => {
    interimRef.current = text;
    setInterimText(text);
  };

  const start = useCallback(() => {
    if (!SPEECH_SUPPORTED || recognitionRef.current) return;
    setError('');
    setInterim('');

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = (typeof navigator !== 'undefined' && navigator.language) || 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          onFinalChunkRef.current?.(chunk);
        } else {
          interim += chunk;
        }
      }
      setInterim(interim);
    };

    recognition.onerror = (event) => {
      setError(ERROR_MESSAGES[event.error] || 'Voice input hit a snag — you can still type.');
    };

    recognition.onend = () => {
      // Some browsers drop the last phrase as "interim" if recognition
      // ends before it finalizes (e.g. the user taps stop mid-sentence).
      // Commit whatever's left so the last few words aren't silently lost.
      if (interimRef.current.trim()) {
        onFinalChunkRef.current?.(interimRef.current);
      }
      setInterim('');
      recognitionRef.current = null;
      setListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setListening(false);
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  // Unmounting mid-recording (e.g. navigating away) should cut the mic,
  // not leave a recognition session running against a dead component.
  useEffect(() => () => { recognitionRef.current?.abort(); }, []);

  return {
    supported: SPEECH_SUPPORTED,
    listening,
    interimText,
    error,
    start,
    stop,
  };
}
