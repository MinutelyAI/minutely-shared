import { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// DEEPGRAM CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const DEEPGRAM_WS_URL = [
  'wss://api.deepgram.com/v1/listen',
  '?model=nova-2',
  '&encoding=linear16',
  '&sample_rate=16000',
  '&smart_format=true',
  '&filler_words=false',
].join('');

export type TranscriptSegment = {
  meeting_id: string;
  speaker_name: string;
  speaker_email: string;
  text: string;
  start_secs: number;
  end_secs: number;
  is_partial: boolean;
  confidence?: number | null;
  created_at?: string;
};

export type TranscriptionStatus = 'idle' | 'connecting' | 'connected' | 'error';

interface UseTranscriptionOptions {
  meetingId: string;
  userEmail: string;
  userName: string;
  apiBaseUrl: string;
  getAuthToken: () => string | null;
  onSegmentReceived?: (segment: TranscriptSegment) => void;
}

export function useTranscription({
  meetingId,
  userEmail,
  userName,
  apiBaseUrl,
  getAuthToken,
  onSegmentReceived
}: UseTranscriptionOptions) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [status, setStatus] = useState<TranscriptionStatus>('idle');
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);

  // Refs for WebSockets and Audio
  const deepgramWsRef = useRef<WebSocket | null>(null);
  const minutelyWsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioWorkletRef = useRef<AudioWorkletNode | null>(null);

  const addSegment = useCallback((segment: TranscriptSegment) => {
    setSegments((prev) => {
      // If the last segment was partial and we get a new one from the same speaker,
      // we might want to replace it or append. 
      // For simplicity here, we just append non-partial segments.
      if (segment.is_partial) {
         // Optionally handle partials for real-time visual feedback
         return prev; 
      }
      return [...prev, segment];
    });
    onSegmentReceived?.(segment);
  }, [onSegmentReceived]);

  const stopTranscription = useCallback(async () => {
    console.log('[Transcription] Stopping pipeline...');
    
    // 1. Tear down audio
    audioWorkletRef.current?.disconnect();
    audioWorkletRef.current = null;
    if (audioContextRef.current) {
      await audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    // 2. Close sockets
    deepgramWsRef.current?.close();
    deepgramWsRef.current = null;
    minutelyWsRef.current?.close();
    minutelyWsRef.current = null;

    // 3. Notify backend
    try {
      const token = getAuthToken();
      await fetch(`${apiBaseUrl}/api/v1/meetings/${meetingId}/transcription/end`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.warn('[Transcription] Failed to notify end session:', err);
    }

    setIsTranscribing(false);
    setStatus('idle');
  }, [apiBaseUrl, meetingId, getAuthToken]);

  const startTranscription = useCallback(async (audioStream: MediaStream) => {
    if (isTranscribing) return;
    
    setStatus('connecting');
    console.log('[Transcription] Starting pipeline for meeting:', meetingId);

    try {
      const token = getAuthToken();
      
      // 1. Get session + Deepgram token from backend
      const res = await fetch(`${apiBaseUrl}/api/v1/meetings/${meetingId}/transcription/start`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Failed to start transcription session');
      const data = await res.json();
      const deepgramToken = data.deepgram_token;

      // 2. Connect to Minutely Hub (broadcast)
      const protocol = apiBaseUrl.startsWith('https') ? 'wss:' : 'ws:';
      const wsHost = apiBaseUrl.replace(/^https?:\/\//, '');
      const hubUrl = `${protocol}//${wsHost}/api/v1/meetings/${meetingId}/transcription/ws?token=${token}`;
      
      minutelyWsRef.current = new WebSocket(hubUrl);
      minutelyWsRef.current.onmessage = (e) => {
        const segment = JSON.parse(e.data);
        // Only show if it's from someone else (we show our own instantly)
        if (segment.speaker_email !== userEmail) {
          addSegment(segment);
        }
      };

      // 3. Connect to Deepgram
      deepgramWsRef.current = new WebSocket(DEEPGRAM_WS_URL, ['token', deepgramToken]);
      deepgramWsRef.current.onopen = () => {
        console.log('[Deepgram] Connected');
        startAudioCapture(audioStream);
      };

      deepgramWsRef.current.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'Results') {
          const alt = msg.channel?.alternatives?.[0];
          if (!alt || !alt.transcript) return;

          const segment: TranscriptSegment = {
            meeting_id: meetingId,
            speaker_name: userName,
            speaker_email: userEmail,
            text: alt.transcript,
            start_secs: msg.start,
            end_secs: msg.start + msg.duration,
            is_partial: !msg.is_final,
            confidence: alt.confidence
          };

          // Show locally
          if (!segment.is_partial) {
            addSegment(segment);
            // Broadcast to others
            if (minutelyWsRef.current?.readyState === WebSocket.OPEN) {
              minutelyWsRef.current.send(JSON.stringify(segment));
            }
          }
        }
      };

      setIsTranscribing(true);
      setStatus('connected');

    } catch (err) {
      console.error('[Transcription] Startup error:', err);
      setStatus('error');
    }
  }, [apiBaseUrl, meetingId, userEmail, userName, getAuthToken, isTranscribing, addSegment]);

  const startAudioCapture = async (stream: MediaStream) => {
    try {
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // Inline AudioWorklet
      const workletCode = `
        class PCMProcessor extends AudioWorkletProcessor {
          process(inputs) {
            const input = inputs[0];
            if (!input || !input[0]) return true;
            const samples = input[0];
            const pcm = new Int16Array(samples.length);
            for (let i = 0; i < samples.length; i++) {
              const s = Math.max(-1, Math.min(1, samples[i]));
              pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            this.port.postMessage(pcm.buffer, [pcm.buffer]);
            return true;
          }
        }
        registerProcessor('pcm-processor', PCMProcessor);
      `;
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      await audioContextRef.current.audioWorklet.addModule(url);
      
      audioWorkletRef.current = new AudioWorkletNode(audioContextRef.current, 'pcm-processor');
      audioWorkletRef.current.port.onmessage = (e) => {
        if (deepgramWsRef.current?.readyState === WebSocket.OPEN) {
          deepgramWsRef.current.send(e.data);
        }
      };
      
      source.connect(audioWorkletRef.current);
    } catch (err) {
      console.error('[Transcription] Audio capture error:', err);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTranscription();
    };
  }, []);

  return {
    isTranscribing,
    status,
    segments,
    startTranscription,
    stopTranscription
  };
}
