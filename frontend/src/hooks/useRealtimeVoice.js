import { useCallback, useEffect, useRef, useState } from "react";
import api from "../services/api";
import { speakBrowserText, stopBrowserSpeech } from "../utils/speechUtils";

/**
 * useRealtimeVoice - Manages real-time two-way voice conversations with Sham's AI.
 * 
 * Supports:
 * - Native OpenAI Realtime API over WebRTC (when OPENAI_API_KEY is configured).
 * - Conversational Voice Engine (continuous Web Speech recognition -> LLM -> Auto-TTS)
 *   which works out of the box with Groq or any LLM provider!
 * - Automatic speech detection & instant real-time live transcription.
 * - Automatic barge-in / speech interruption (stops AI speech when user speaks).
 * - Full state lifecycle: connecting, listening, thinking, speaking, muted, error.
 * - Audio level & frequency analysis for reactive visualizers.
 * - Auto-persistence of spoken conversation turns into the chat history.
 */
export const useRealtimeVoice = ({
  conversationId,
  onTurnSaved,
  voice = "alloy",
  language = "auto",
}) => {
  const [status, setStatus] = useState("disconnected"); // 'disconnected' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'muted' | 'error'
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [mode, setMode] = useState("conversational"); // 'webrtc' | 'conversational'
  const [userTranscript, setUserTranscript] = useState("");
  const [assistantTranscript, setAssistantTranscript] = useState("");
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 1
  const [frequencies, setFrequencies] = useState(new Uint8Array(32));

  // References
  const isVoiceActiveRef = useRef(false);
  const statusRef = useRef("disconnected");
  const isMutedRef = useRef(false);
  const conversationIdRef = useRef(conversationId);
  const voiceRef = useRef(voice);
  const languageRef = useRef(language);

  // WebRTC refs
  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const remoteAudioElRef = useRef(null);

  // Audio / Speech refs
  const micStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechDebounceTimerRef = useRef(null);
  const fallbackAudioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    voiceRef.current = voice;
  }, [voice]);

  useEffect(() => {
    languageRef.current = language;
    if (recognitionRef.current) {
      try {
        const targetLang =
          language && language !== "auto" ? language : navigator.language || "en-IN";
        recognitionRef.current.lang = targetLang;
      } catch {
        /* ignore */
      }
    }
  }, [language]);

  // Web Audio frequency analysis
  const startAudioAnalysis = (stream) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        if (!analyserRef.current || !isVoiceActiveRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(1, avg / 128);

        setAudioLevel(normalized);
        setFrequencies(new Uint8Array(dataArray));

        animFrameRef.current = requestAnimationFrame(updateMeter);
      };

      animFrameRef.current = requestAnimationFrame(updateMeter);
    } catch (err) {
      console.warn("Could not start audio analysis:", err);
    }
  };

  const stopAudioAnalysis = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
    setFrequencies(new Uint8Array(32));
  };

  // Helper to persist conversation turn
  const persistTurn = useCallback(
    async (userText, assistantText) => {
      const convId = conversationIdRef.current;
      if (!convId || (!userText && !assistantText)) return;
      try {
        await api.post("/chat/realtime/save-turn", {
          conversationId: convId,
          userText,
          assistantText,
        });
        if (onTurnSaved) onTurnSaved();
      } catch (err) {
        console.error("Failed to save voice turn:", err);
      }
    },
    [onTurnSaved]
  );

  // -------------------------------------------------------------
  // SPEECH PLAYBACK (TTS & SpeechSynthesis)
  // -------------------------------------------------------------
  const speakText = (text) => {
    return new Promise((resolve) => {
      if (!isVoiceActiveRef.current || !text) {
        resolve();
        return;
      }

      setStatus("speaking");

      speakBrowserText(text, {
        lang: languageRef.current,
        onStart: () => {
          if (isVoiceActiveRef.current) setStatus("speaking");
        },
        onEnd: () => {
          resolve();
        },
        onError: () => {
          resolve();
        },
      });
    });
  };

  // -------------------------------------------------------------
  // BARGE-IN / INTERRUPTION
  // -------------------------------------------------------------
  const interrupt = useCallback(() => {
    // 1. Stop audio elements
    if (fallbackAudioRef.current) {
      fallbackAudioRef.current.pause();
      fallbackAudioRef.current.currentTime = 0;
      fallbackAudioRef.current = null;
    }

    // 2. Stop browser speech synthesis
    stopBrowserSpeech();

    // 3. Stop WebRTC audio & signal cancellation
    if (remoteAudioElRef.current) {
      remoteAudioElRef.current.pause();
      remoteAudioElRef.current.currentTime = 0;
    }
    if (dcRef.current && dcRef.current.readyState === "open") {
      try {
        dcRef.current.send(JSON.stringify({ type: "response.cancel" }));
      } catch {
        /* ignore */
      }
    }

    if (isVoiceActiveRef.current) {
      setStatus(isMutedRef.current ? "muted" : "listening");
    }
  }, []);

  // -------------------------------------------------------------
  // PROCESS USER SPOKEN PROMPT
  // -------------------------------------------------------------
  const handleUserSpokenPrompt = async (prompt) => {
    if (!isVoiceActiveRef.current || !prompt || prompt.length < 2) return;

    setStatus("thinking");
    setUserTranscript(prompt);
    setAssistantTranscript("");

    try {
      const convId = conversationIdRef.current;
      const chatRes = await api.post("/chat", {
        conversationId: convId,
        message: prompt,
      });

      const replyText =
        chatRes.data?.assistantMessage?.content ||
        "I understood your question, but could not generate a response.";

      setAssistantTranscript(replyText);

      if (!isVoiceActiveRef.current) return;

      // Speak AI response out loud
      await speakText(replyText);

      if (!isVoiceActiveRef.current) return;

      // Save turn and return to listening
      await persistTurn(prompt, replyText);
      setStatus(isMutedRef.current ? "muted" : "listening");
    } catch (err) {
      console.error("Error generating voice response:", err);
      if (isVoiceActiveRef.current) {
        setStatus(isMutedRef.current ? "muted" : "listening");
      }
    }
  };

  // -------------------------------------------------------------
  // CONTINUOUS SPEECH RECOGNITION (Web Speech API)
  // -------------------------------------------------------------
  const startSpeechRecognition = (stream) => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Fallback to MediaRecorder audio chunking if Web Speech is absent
      startMediaRecorderFallback(stream);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang =
        languageRef.current && languageRef.current !== "auto"
          ? languageRef.current
          : navigator.language || "en-IN";
      recognitionRef.current = recognition;

      let accumulatedFinal = "";

      recognition.onstart = () => {
        if (isVoiceActiveRef.current) {
          setStatus("listening");
        }
      };

      recognition.onresult = (event) => {
        if (!isVoiceActiveRef.current || isMutedRef.current) return;

        // Barge-in: If user speaks while AI is talking, interrupt AI immediately!
        if (statusRef.current === "speaking") {
          interrupt();
        }

        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            accumulatedFinal += " " + item[0].transcript;
          } else {
            interim += item[0].transcript;
          }
        }

        const liveDisplay = (accumulatedFinal + " " + interim).trim();
        if (liveDisplay) {
          setUserTranscript(liveDisplay);
        }

        // When user pauses speaking, trigger response
        if (accumulatedFinal.trim().length > 1) {
          if (speechDebounceTimerRef.current) {
            clearTimeout(speechDebounceTimerRef.current);
          }

          speechDebounceTimerRef.current = setTimeout(async () => {
            const finalPrompt = accumulatedFinal.trim();
            accumulatedFinal = "";
            if (finalPrompt.length >= 2) {
              await handleUserSpokenPrompt(finalPrompt);
            }
          }, 900);
        }
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition warning:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setStatus("error");
          setError("Microphone permission denied. Please allow microphone access.");
        }
      };

      recognition.onend = () => {
        // Automatically restart speech recognition while voice mode is active
        if (
          isVoiceActiveRef.current &&
          statusRef.current !== "error" &&
          statusRef.current !== "disconnected"
        ) {
          try {
            recognition.start();
          } catch {
            /* ignore restart collisions */
          }
        }
      };

      recognition.start();
      setStatus("listening");
    } catch (err) {
      console.warn("Web Speech start error, falling back to audio recording:", err);
      startMediaRecorderFallback(stream);
    }
  };

  // MediaRecorder audio upload fallback (for browsers without Web Speech)
  const startMediaRecorderFallback = (stream) => {
    try {
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        if (!isVoiceActiveRef.current) return;
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        chunksRef.current = [];
        if (blob.size < 2000) {
          if (isVoiceActiveRef.current) setStatus("listening");
          return;
        }

        setStatus("thinking");
        try {
          const formData = new FormData();
          formData.append("audio", blob, "voice.webm");
          const { data } = await api.post("/chat/transcribe", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          if (data.text?.trim()) {
            await handleUserSpokenPrompt(data.text.trim());
          } else {
            setStatus("listening");
          }
        } catch (err) {
          console.error("Transcription fallback error:", err);
          if (isVoiceActiveRef.current) setStatus("listening");
        }
      };

      // Record in 3.5-second chunks
      recorder.start();
      const chunkInterval = setInterval(() => {
        if (!isVoiceActiveRef.current) {
          clearInterval(chunkInterval);
          return;
        }
        if (statusRef.current === "listening" && recorder.state === "recording") {
          recorder.stop();
          setTimeout(() => {
            if (isVoiceActiveRef.current && recorder.state === "inactive") {
              try {
                recorder.start();
              } catch {}
            }
          }, 200);
        }
      }, 3500);

      setStatus("listening");
    } catch (err) {
      console.error("MediaRecorder setup error:", err);
      setStatus("error");
      setError("Could not access microphone.");
    }
  };

  // -------------------------------------------------------------
  // OPENAI REALTIME WEBRTC CONNECTION
  // -------------------------------------------------------------
  const connectWebRTC = async (stream, session) => {
    setMode("webrtc");

    const pc = new RTCPeerConnection();
    pcRef.current = pc;

    const remoteAudio = new Audio();
    remoteAudio.autoplay = true;
    remoteAudioElRef.current = remoteAudio;

    pc.ontrack = (event) => {
      remoteAudio.srcObject = event.streams[0];
    };

    const micTrack = stream.getAudioTracks()[0];
    if (micTrack) {
      pc.addTrack(micTrack, stream);
    }

    const dc = pc.createDataChannel("oai-events");
    dcRef.current = dc;

    let currentTurnUser = "";
    let currentTurnAssistant = "";

    dc.onopen = () => {
      setStatus("listening");
      dc.send(
        JSON.stringify({
          type: "session.update",
          session: {
            modalities: ["audio", "text"],
            voice: session.voice || voiceRef.current,
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
              create_response: true,
            },
          },
        })
      );
    };

    dc.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);

        switch (event.type) {
          case "input_audio_buffer.speech_started":
            interrupt();
            currentTurnUser = "";
            currentTurnAssistant = "";
            setUserTranscript("");
            setAssistantTranscript("");
            break;

          case "input_audio_buffer.speech_stopped":
            setStatus("thinking");
            break;

          case "response.created":
          case "response.audio.delta":
            if (statusRef.current !== "speaking") {
              setStatus("speaking");
            }
            break;

          case "response.audio_transcript.delta":
            currentTurnAssistant += event.delta || "";
            setAssistantTranscript(currentTurnAssistant);
            break;

          case "conversation.item.input_audio_transcription.completed":
            currentTurnUser = event.transcript || "";
            setUserTranscript(currentTurnUser);
            break;

          case "response.done":
            setStatus(isMutedRef.current ? "muted" : "listening");
            if (currentTurnUser || currentTurnAssistant) {
              persistTurn(currentTurnUser, currentTurnAssistant);
            }
            break;

          default:
            break;
        }
      } catch (parseErr) {
        console.warn("Could not parse Realtime event:", parseErr);
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const baseUrl = "https://api.openai.com/v1/realtime";
    const sdpResponse = await fetch(`${baseUrl}?model=${session.model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${session.client_secret.value}`,
        "Content-Type": "application/sdp",
      },
    });

    if (!sdpResponse.ok) {
      throw new Error(`OpenAI WebRTC negotiation failed: ${sdpResponse.statusText}`);
    }

    const answer = {
      type: "answer",
      sdp: await sdpResponse.text(),
    };
    await pc.setRemoteDescription(answer);
  };

  // -------------------------------------------------------------
  // START VOICE SESSION
  // -------------------------------------------------------------
  const connect = async () => {
    setError(null);
    setStatus("connecting");
    setUserTranscript("");
    setAssistantTranscript("");
    isVoiceActiveRef.current = true;

    // 1. Microphone capture
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;
      startAudioAnalysis(stream);
    } catch (micErr) {
      console.error("Microphone access error:", micErr);
      setStatus("error");
      if (micErr.name === "NotAllowedError" || micErr.name === "PermissionDeniedError") {
        setError(
          "Microphone access blocked. Click the lock/camera icon in your address bar to allow microphone access, then try again."
        );
      } else {
        setError("Could not access microphone: " + (micErr.message || "Unknown error"));
      }
      return;
    }

    // 2. Check if OpenAI Realtime WebRTC is available
    try {
      const { data: sessionData } = await api.post("/chat/realtime/session", {
        voice: voiceRef.current,
      });

      if (sessionData.configured && sessionData.client_secret?.value) {
        await connectWebRTC(stream, sessionData);
        return;
      }
    } catch (err) {
      console.warn("Realtime WebRTC not available; activating conversational engine:", err);
    }

    // 3. Fallback to conversational voice engine (Web Speech API -> LLM -> Auto-TTS)
    setMode("conversational");
    startSpeechRecognition(stream);
  };

  // -------------------------------------------------------------
  // MUTE / UNMUTE
  // -------------------------------------------------------------
  const toggleMute = useCallback(() => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);

    if (micStreamRef.current) {
      micStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMute;
      });
    }

    setStatus(nextMute ? "muted" : "listening");
  }, [isMuted]);

  // -------------------------------------------------------------
  // DISCONNECT / CLEANUP
  // -------------------------------------------------------------
  const disconnect = useCallback(() => {
    isVoiceActiveRef.current = false;

    if (speechDebounceTimerRef.current) {
      clearTimeout(speechDebounceTimerRef.current);
      speechDebounceTimerRef.current = null;
    }

    // Stop Speech Recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    }

    // Stop audio & speech synthesis
    if (fallbackAudioRef.current) {
      fallbackAudioRef.current.pause();
      fallbackAudioRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        /* ignore */
      }
      mediaRecorderRef.current = null;
    }

    // Stop WebRTC
    if (dcRef.current) {
      try {
        dcRef.current.close();
      } catch {
        /* ignore */
      }
      dcRef.current = null;
    }
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {
        /* ignore */
      }
      pcRef.current = null;
    }
    if (remoteAudioElRef.current) {
      remoteAudioElRef.current.pause();
      remoteAudioElRef.current.srcObject = null;
      remoteAudioElRef.current = null;
    }

    // Stop microphone stream
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }

    stopAudioAnalysis();
    setStatus("disconnected");
    setIsMuted(false);
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    status,
    error,
    isMuted,
    mode,
    userTranscript,
    assistantTranscript,
    audioLevel,
    frequencies,
    connect,
    disconnect,
    interrupt,
    toggleMute,
  };
};

export default useRealtimeVoice;
