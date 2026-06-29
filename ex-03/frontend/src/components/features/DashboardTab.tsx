import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Mic, Square, Mail, FileText, Send, Loader2, AlertCircle } from 'lucide-react';
import type { Recipient } from '../../lib/api';


interface DashboardTabProps {
  textInput: string;
  setTextInput: (val: string) => void;
  summary: string;
  setSummary: (val: string) => void;
  isAnalyzing: boolean;
  isSendingEmail: boolean;
  recipients: Recipient[];
  onSummarizeText: () => Promise<void>;
  onSummarizeAudio: (blob: Blob) => Promise<void>;
  onSendEmail: () => Promise<void>;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

// Simple line-by-line Markdown to HTML renderer for clean visualization without external packages
const renderSimpleMarkdown = (markdown: string): string => {
  if (!markdown) return '';

  const lines = markdown.split('\n');
  let html = '';
  let inList = false;
  let inCodeBlock = false;

  for (let line of lines) {
    // Escape HTML tags to prevent XSS
    if (!inCodeBlock) {
      line = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    // Code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        html += '</code></pre>\n';
        inCodeBlock = false;
      } else {
        html += '<pre className="bg-bg-main p-3 rounded-lg border border-border-color font-mono text-xs overflow-x-auto my-3"><code class="text-text-muted">';
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      html += line + '\n';
      continue;
    }

    // Headers
    if (line.startsWith('# ')) {
      html += `<h1 class="text-xl font-bold text-text-main border-b border-border-color pb-1 mt-6 mb-3">${line.substring(2)}</h1>\n`;
      continue;
    }
    if (line.startsWith('## ')) {
      html += `<h2 class="text-lg font-bold text-text-main mt-5 mb-2">${line.substring(3)}</h2>\n`;
      continue;
    }
    if (line.startsWith('### ')) {
      html += `<h3 class="text-base font-bold text-text-main mt-4 mb-2">${line.substring(4)}</h3>\n`;
      continue;
    }

    // Lists
    const isListItem = line.trim().startsWith('- ') || line.trim().startsWith('* ');
    if (isListItem) {
      if (!inList) {
        html += '<ul class="list-disc pl-5 my-2 space-y-1 text-text-muted">\n';
        inList = true;
      }
      let content = line.trim().substring(2);
      
      // Checkbox support
      if (content.startsWith('[ ] ')) {
        content = `<input type="checkbox" disabled class="mr-2 accent-primary" /> ` + content.substring(4);
      } else if (content.startsWith('[x] ') || content.startsWith('[X] ')) {
        content = `<input type="checkbox" checked disabled class="mr-2 accent-primary" /> ` + content.substring(4);
      }
      
      // Inner bold formatting
      content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html += `<li class="text-sm">${content}</li>\n`;
      continue;
    } else {
      if (inList) {
        html += '</ul>\n';
        inList = false;
      }
    }

    // Empty lines
    if (line.trim() === '') {
      html += '<br/>\n';
      continue;
    }

    // Bold text replacements for normal lines
    let formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Normal paragraph
    html += `<p class="text-sm text-text-muted leading-relaxed mb-2">${formattedLine}</p>\n`;
  }

  if (inList) {
    html += '</ul>\n';
  }
  if (inCodeBlock) {
    html += '</code></pre>\n';
  }

  return html;
};

export const DashboardTab: React.FC<DashboardTabProps> = ({
  textInput,
  setTextInput,
  summary,
  setSummary,
  isAnalyzing,
  isSendingEmail,
  recipients,
  onSummarizeText,
  onSummarizeAudio,
  onSendEmail,
  showToast,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Format recording seconds (e.g. 01:23)
  const formatTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start Voice Recording
  const handleStartRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('이 브라우저는 음성 녹음 기능을 지원하지 않습니다.', 'error');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine format support - Safari might only support audio/mp4, standard webm is preferred
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4'; // Safari fallback
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        // Stop stream tracks
        stream.getTracks().forEach((track) => track.stop());

        // Validate file size (< 20MB)
        const limitSize = 20 * 1024 * 1024;
        if (audioBlob.size >= limitSize) {
          showToast('10분 이내(20MB 미만)의 오디오만 지원합니다.', 'error');
          return;
        }

        // Process audio summary
        try {
          showToast('음성 녹음 완료! AI 분석을 시작합니다.', 'info');
          await onSummarizeAudio(audioBlob);
        } catch (err: any) {
          console.error(err);
          showToast(err.message || '음성 분석 도중 에러가 발생했습니다.', 'error');
        }
      };

      recorder.start(250); // Slice data every 250ms
      setIsRecording(true);
      setRecordingSeconds(0);

      // Start elapsed timer
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Microphone recording error', err);
      showToast('마이크 연결 권한이 거부되었거나 사용 중입니다.', 'error');
    }
  };

  // Stop Voice Recording
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Handle Text Summary Click
  const handleTextSummarizeSubmit = async () => {
    if (!textInput.trim()) {
      showToast('회의록 텍스트를 먼저 입력해주세요.', 'error');
      return;
    }
    try {
      await onSummarizeText();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'AI 요약 중 에러가 발생했습니다.', 'error');
    }
  };

  // Handle Email Send Trigger
  const handleEmailSendClick = async () => {
    if (recipients.length === 0) {
      showToast('설정 탭에서 메일을 발송할 팀원을 먼저 추가해주세요.', 'error');
      return;
    }
    if (!summary) {
      showToast('AI 요약 결과가 없습니다. 먼저 텍스트/음성을 요약해 주세요.', 'error');
      return;
    }
    try {
      await onSendEmail();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || '이메일 전송에 실패했습니다.', 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
      {/* Left Column: Meeting Input */}
      <div className="flex flex-col gap-6">
        <div className="bg-card-bg border border-border-color p-6 rounded-xl shadow-lg flex-1 flex flex-col">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-text-main">
            <FileText className="w-5 h-5 text-primary" />
            회의록 입력
          </h2>
          
          <div className="flex-1 flex flex-col gap-4">
            <textarea
              placeholder="회의 녹취록이나 데일리 스크럼 대화 내용 텍스트를 입력해 주세요..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              disabled={isAnalyzing || isRecording}
              className="w-full flex-1 min-h-[250px] bg-bg-main border border-border-color rounded-lg p-4 text-text-main text-sm focus:outline-none focus:border-primary transition-colors leading-relaxed resize-none"
            />
            
            {/* Audio Recording Controls */}
            <div className="bg-bg-main border border-border-color p-4 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3.5 h-3.5 rounded-full ${isRecording ? 'bg-danger animate-pulse' : 'bg-text-muted opacity-40'}`} />
                <div>
                  <div className="text-xs font-semibold text-text-muted">마이크 오디오 녹음 (2단계)</div>
                  <div className="text-[10px] text-text-muted mt-0.5">최대 20MB 미만, 10분 이내 음성 녹음</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {isRecording && (
                  <span className="text-xs font-mono font-bold text-danger bg-danger/10 px-2.5 py-1 rounded">
                    {formatTime(recordingSeconds)}
                  </span>
                )}
                
                {isRecording ? (
                  <button
                    onClick={handleStopRecording}
                    className="bg-danger hover:bg-rose-600 text-white p-2.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-semibold shadow-md"
                  >
                    <Square className="w-4 h-4" />
                    녹음 중지
                  </button>
                ) : (
                  <button
                    onClick={handleStartRecording}
                    disabled={isAnalyzing || isSendingEmail}
                    className="bg-border-color hover:bg-border-color/80 text-text-main disabled:opacity-40 p-2.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-semibold"
                  >
                    <Mic className="w-4 h-4 text-primary" />
                    녹음 시작
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <button
            onClick={handleTextSummarizeSubmit}
            disabled={isAnalyzing || isRecording || isSendingEmail || !textInput.trim()}
            className="w-full bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white mt-4 py-3 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                AI 분석 중... (Gemini)
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                AI 요약 및 액션 아이템 도출
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Column: AI Result Output */}
      <div className="flex flex-col gap-6">
        <div className="bg-card-bg border border-border-color p-6 rounded-xl shadow-lg flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-text-main">
              <Sparkles className="w-5 h-5 text-primary" />
              AI 분석 결과 요약
            </h2>
            {summary && (
              <button
                onClick={() => {
                  setSummary('');
                  showToast('요약 결과가 초기화되었습니다.', 'info');
                }}
                disabled={isAnalyzing || isSendingEmail}
                className="text-xs text-text-muted hover:text-text-main transition-colors cursor-pointer"
              >
                지우기
              </button>
            )}
          </div>

          <div className="flex-1 border border-border-color rounded-lg overflow-hidden bg-bg-main p-4 flex flex-col min-h-[300px]">
            {isAnalyzing ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-text-main font-medium">Gemini AI가 스크럼 회의록을 분석하고 있습니다...</p>
                <p className="text-xs text-text-muted mt-1">
                  회의 내용을 요약하고 핵심 액션 아이템(할 일, 기한)을 정리하고 있습니다.
                </p>
              </div>
            ) : !summary ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 opacity-60">
                <Sparkles className="w-12 h-12 text-text-muted mb-3 opacity-30" />
                <p className="text-text-muted font-medium">분석 결과가 여기에 출력됩니다.</p>
                <p className="text-xs text-text-muted mt-1 max-w-xs">
                  회의 내용을 좌측 텍스트 상자에 적어 분석을 시작하거나 마이크 음성을 녹음해주세요.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto max-h-[420px] pr-2">
                <div 
                  className="markdown-body text-left text-text-muted" 
                  dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(summary) }} 
                />
              </div>
            )}
          </div>

          {/* Email dispatch section with defensive UI check */}
          <div className="mt-4 pt-4 border-t border-border-color flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-text-muted shrink-0" />
              <div className="text-left">
                <div className="text-xs text-text-muted font-semibold">일괄 발송 대상 수신자</div>
                <div className="text-xs font-bold text-text-main mt-0.5">
                  {recipients.length === 0 ? (
                    <span className="text-danger flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      수신자를 추가해주세요
                    </span>
                  ) : (
                    <span>{recipients[0].name} 외 {recipients.length - 1}명</span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleEmailSendClick}
              disabled={isAnalyzing || isSendingEmail || !summary || recipients.length === 0}
              className="bg-success hover:bg-emerald-600 disabled:opacity-40 text-white font-semibold px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-md text-sm"
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  SMTP 발송 중...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  팀원들에게 이메일 전송
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
