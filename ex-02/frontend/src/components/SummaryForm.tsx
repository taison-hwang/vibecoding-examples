import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, FileAudio, Upload, Trash2, HelpCircle, Mic, Square, AlertCircle } from 'lucide-react';

interface SummaryFormProps {
  isLoading: boolean;
  onSubmitText: (text: string) => Promise<void>;
  onSubmitAudio: (file: File) => Promise<void>;
}

type InputMode = 'text' | 'file' | 'record';

export function SummaryForm({ isLoading, onSubmitText, onSubmitAudio }: SummaryFormProps) {
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [text, setText] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Microphone recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (inputMode === 'text') {
      if (text.trim()) {
        await onSubmitText(text);
      }
    } else {
      if (audioFile) {
        await onSubmitAudio(audioFile);
      }
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('audio/') || file.name.endsWith('.mp3') || file.name.endsWith('.wav') || file.name.endsWith('.m4a') || file.name.endsWith('.webm')) {
        setAudioFile(file);
      } else {
        alert('올바른 오디오 파일(.mp3, .wav, .m4a 등)을 업로드해주세요.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAudioFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeAudioFile = () => {
    setAudioFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Microphone recording functions
  const startRecording = async () => {
    setMicError(null);
    audioChunksRef.current = [];
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = { mimeType: 'audio/webm' };
      
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        // Fallback mimeType for safari/other browsers
        recorder = new MediaRecorder(stream);
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        
        // Find extension based on mimeType
        let ext = 'webm';
        if (recorder.mimeType.includes('wav')) ext = 'wav';
        else if (recorder.mimeType.includes('mp4')) ext = 'mp4';
        else if (recorder.mimeType.includes('mpeg')) ext = 'mp3';

        const file = new File([audioBlob], `recorded_scrum_${Date.now()}.${ext}`, {
          type: audioBlob.type
        });
        
        setAudioFile(file);
        
        // Stop all tracks in the stream to release the mic
        stream.getTracks().forEach(track => track.stop());
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error("[SummaryForm] Mic access error:", err);
      setMicError("마이크 접근 권한이 없거나 오디오 입력 장치를 찾을 수 없습니다.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isSubmitDisabled = isLoading || isRecording || (inputMode === 'text' ? !text.trim() : !audioFile);

  return (
    <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-slate-200/80 shadow-md flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600 animate-pulse" />
          회의록 입력 및 파일 분석
        </h2>
        <span className="text-xs text-slate-400 font-medium">
          다양한 입력 모델 지원
        </span>
      </div>

      {/* Input Mode Selector Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/30">
        <button
          type="button"
          onClick={() => { setInputMode('text'); removeAudioFile(); }}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            inputMode === 'text' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          텍스트 입력
        </button>
        <button
          type="button"
          onClick={() => { setInputMode('file'); removeAudioFile(); }}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            inputMode === 'file' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          오디오 업로드
        </button>
        <button
          type="button"
          onClick={() => { setInputMode('record'); removeAudioFile(); }}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            inputMode === 'record' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          마이크 녹음
        </button>
      </div>

      {/* Mode 1: Text Editor */}
      {inputMode === 'text' && (
        <div className="flex flex-col gap-3">
          <label htmlFor="minutes-text" className="text-xs font-semibold text-slate-500">
            회의내용 텍스트 입력
          </label>
          <textarea
            id="minutes-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isLoading}
            placeholder="여기에 스크럼 회의 내용을 붙여넣으세요. (예: 오늘 진행된 프론트엔드 작업 요약, 홍길동은 7월 1일까지 API 명세 완료하기로 함...)"
            className="w-full min-h-[160px] max-h-[300px] p-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all resize-y text-sm leading-relaxed text-slate-700 placeholder-slate-400 bg-slate-50/50"
          />
        </div>
      )}

      {/* Mode 2: Audio File Upload */}
      {inputMode === 'file' && !audioFile && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 group min-h-[160px] ${
            dragActive
              ? 'border-blue-500 bg-blue-50/30'
              : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/50'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="audio/*,.mp3,.wav,.m4a,.webm"
            className="hidden"
          />
          <Upload className="h-7 w-7 text-slate-400 group-hover:text-blue-500 transition-colors" />
          <div>
            <p className="text-xs font-semibold text-slate-700">
              드래그 앤 드롭 또는 클릭하여 업로드
            </p>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">
              MP3, WAV, M4A, WEBM 형식 지원 (최대 20MB)
            </p>
          </div>
        </div>
      )}

      {/* Mode 3: Microphone Record */}
      {inputMode === 'record' && !audioFile && (
        <div className="border border-slate-200 rounded-xl p-6 bg-slate-50/50 flex flex-col items-center justify-center gap-4 min-h-[160px]">
          {isRecording ? (
            <div className="flex flex-col items-center gap-3">
              {/* Pulse recording wave */}
              <div className="flex items-center gap-1.5 h-6">
                <span className="w-1 bg-red-500 rounded-full animate-bounce h-3"></span>
                <span className="w-1 bg-red-500 rounded-full animate-bounce h-5 [animation-delay:0.15s]"></span>
                <span className="w-1 bg-red-500 rounded-full animate-bounce h-4 [animation-delay:0.3s]"></span>
                <span className="w-1 bg-red-500 rounded-full animate-bounce h-5 [animation-delay:0.45s]"></span>
                <span className="w-1 bg-red-500 rounded-full animate-bounce h-2 [animation-delay:0.6s]"></span>
              </div>
              
              <div className="text-2xl font-bold text-red-500 tracking-wider font-mono">
                {formatTime(recordingSeconds)}
              </div>
              
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-red-500 hover:bg-red-600 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-md shadow-red-500/20 transition-all cursor-pointer"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                녹음 중지
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center">
              <button
                type="button"
                onClick={startRecording}
                className="w-14 h-14 bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-[0.96] text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20 transition-all cursor-pointer group"
              >
                <Mic className="h-6 w-6 group-hover:scale-110 transition-transform" />
              </button>
              <div>
                <p className="text-xs font-semibold text-slate-700">마이크 녹음 시작</p>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">클릭하여 스크럼 회의 내용을 실시간 녹음하세요.</p>
              </div>
            </div>
          )}

          {micError && (
            <div className="text-red-500 text-[10px] font-semibold flex items-center gap-1 mt-1 text-center max-w-[280px]">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {micError}
            </div>
          )}
        </div>
      )}

      {/* Selected Audio File Status display */}
      {(inputMode === 'file' || inputMode === 'record') && audioFile && (
        <div className="bg-blue-50/50 border border-blue-200/80 p-5 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 p-2.5 rounded-lg text-white animate-pulse">
              <FileAudio className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 truncate max-w-[220px] md:max-w-[360px]">
                {audioFile.name}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {(audioFile.size / (1024 * 1024)).toFixed(2)} MB • {inputMode === 'record' ? '녹음본 저장됨' : '파일 업로드됨'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={removeAudioFile}
            className="p-2 hover:bg-red-50 text-red-500 hover:text-red-600 rounded-lg transition-colors"
            title="파일 삭제"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitDisabled}
        className={`w-full py-3.5 px-5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
          isSubmitDisabled
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200/50'
            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/10 cursor-pointer active:scale-[0.98]'
        }`}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>AI 분석 및 요약 중...</span>
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            <span>✨ AI 요약 및 액션 아이템 도출</span>
          </>
        )}
      </button>

      {/* Info Warning */}
      <div className="flex gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-500">
        <HelpCircle className="h-4 w-4 text-slate-400 shrink-0" />
        <p className="leading-relaxed">
          실제 Gemini 호출은 백엔드(`/api/summarize`)를 경유하여 안전하게 API Key를 보호합니다. Key가 미설정된 환경에서는 지연 로딩 후 Mock 데이터가 출력됩니다.
        </p>
      </div>
    </form>
  );
}
