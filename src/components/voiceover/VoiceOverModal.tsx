import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Play, Pause, Plus, X, AlertCircle } from 'lucide-react';
import { VoiceOverRecorder } from '../../engine/mediaEngine';
import { formatDuration } from '../../utils/helpers';

interface VoiceOverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRecordedAudio: (audioBlob: Blob, duration: number) => void;
}

export const VoiceOverModal: React.FC<VoiceOverModalProps> = ({
  isOpen,
  onClose,
  onAddRecordedAudio,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recorderRef = useRef<VoiceOverRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (recorderRef.current && isRecording) {
        recorderRef.current.stop();
      }
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRecording(false);
      setRecordingSeconds(0);
      setRecordedBlob(null);
      setPreviewAudioUrl(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartRecording = async () => {
    setErrorMessage(null);
    setRecordedBlob(null);
    setPreviewAudioUrl(null);
    const rec = new VoiceOverRecorder();
    recorderRef.current = rec;

    const started = await rec.start((level) => {
      setMicLevel(level);
    });

    if (started) {
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } else {
      setErrorMessage(
        'Could not access microphone. Please ensure microphone permissions are granted.'
      );
    }
  };

  const handleStopRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!recorderRef.current) return;

    const blob = await recorderRef.current.stop();
    setIsRecording(false);
    setMicLevel(0);

    if (blob) {
      setRecordedBlob(blob);
      const url = URL.createObjectURL(blob);
      setPreviewAudioUrl(url);
    }
  };

  const handleTogglePreviewPlay = () => {
    if (!audioPreviewRef.current || !previewAudioUrl) return;
    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPreviewRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const handleAddToTimeline = () => {
    if (recordedBlob) {
      onAddRecordedAudio(recordedBlob, recordingSeconds);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none animate-fadeIn">
      <div className="w-full max-w-md bg-[#121620] border border-[#232a38] rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        <div className="h-12 border-b border-[#1f2633] px-4 flex items-center justify-between bg-[#0e1117]">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-rose-500" />
            <span className="font-semibold text-sm">Voice-Over Microphone Recording</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#1a202c] text-slate-400 hover:text-white rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center gap-5 text-center">
          {/* VU Visualizer Bar */}
          <div className="w-full h-8 bg-[#090b0f] rounded-lg border border-[#1d232e] overflow-hidden flex items-center p-1.5 gap-1">
            {Array.from({ length: 24 }).map((_, i) => {
              const active = micLevel > i / 24;
              const isPeak = i > 18;
              return (
                <div
                  key={i}
                  className={`flex-1 h-full rounded-sm transition-all duration-75 ${
                    active
                      ? isPeak
                        ? 'bg-red-500 shadow-sm shadow-red-500/50'
                        : 'bg-cyan-400 shadow-sm shadow-cyan-400/50'
                      : 'bg-[#161c26]'
                  }`}
                />
              );
            })}
          </div>

          {/* Time display */}
          <div className="font-mono text-3xl font-bold tracking-wider tabular-nums text-white">
            {formatDuration(recordingSeconds)}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            {!isRecording ? (
              <button
                onClick={handleStartRecording}
                className="w-14 h-14 rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-900/40 transition-transform active:scale-95"
                title="Start Recording"
              >
                <Mic className="w-6 h-6" />
              </button>
            ) : (
              <button
                onClick={handleStopRecording}
                className="w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-400 text-black flex items-center justify-center shadow-lg shadow-amber-900/40 transition-transform active:scale-95 animate-pulse"
                title="Stop Recording"
              >
                <Square className="w-6 h-6 fill-current" />
              </button>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-2.5 bg-red-950/40 border border-red-800/40 rounded flex items-center gap-2 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Preview & Add to Timeline */}
          {recordedBlob && previewAudioUrl && (
            <div className="w-full bg-[#181d27] border border-[#262f3f] rounded-lg p-3 flex items-center justify-between mt-2">
              <audio
                ref={audioPreviewRef}
                src={previewAudioUrl}
                onEnded={() => setIsPlayingPreview(false)}
                className="hidden"
              />
              <button
                onClick={handleTogglePreviewPlay}
                className="p-2 bg-[#202735] hover:bg-[#2a3449] rounded text-slate-200 flex items-center gap-1.5 text-xs"
              >
                {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlayingPreview ? 'Pause' : 'Listen Preview'}</span>
              </button>

              <button
                onClick={handleAddToTimeline}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add to Timeline</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
