import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Sparkles, 
  Mail, 
  Send, 
  FileText, 
  Loader2, 
  AlertCircle, 
  Clipboard,
  HelpCircle,
  Mic,
  MicOff,
  Trash2,
  Volume2
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'text' | 'voice'>('text');
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [emails, setEmails] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Team Contacts State (Local Storage)
  const [teamMembers, setTeamMembers] = useState<Array<{ name: string; email: string }>>(() => {
    const saved = localStorage.getItem('vibecode_team_members');
    return saved ? JSON.parse(saved) : [];
  });
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Sync team contacts to local storage
  useEffect(() => {
    localStorage.setItem('vibecode_team_members', JSON.stringify(teamMembers));
  }, [teamMembers]);

  // Cleanup timers and preview URLs on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Format recording duration (e.g. 00:00)
  const formatTime = (secs: number) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  // Contacts management functions
  const addTeamMember = () => {
    const name = newMemberName.trim();
    const email = newMemberEmail.trim();

    if (!name || !email) {
      alert('이름과 이메일을 모두 입력해 주세요.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('올바르지 않은 이메일 형식입니다.');
      return;
    }

    if (teamMembers.some(m => m.email.toLowerCase() === email.toLowerCase())) {
      alert('이미 등록된 이메일 주소입니다.');
      return;
    }

    setTeamMembers(prev => [...prev, { name, email }]);
    setNewMemberName('');
    setNewMemberEmail('');
  };

  const removeTeamMember = (email: string) => {
    setTeamMembers(prev => prev.filter(m => m.email !== email));
    
    // Also remove from active recipient string if selected
    const activeEmails = emails.split(',').map(e => e.trim()).filter(Boolean);
    const updatedEmails = activeEmails.filter(e => e.toLowerCase() !== email.toLowerCase());
    setEmails(updatedEmails.join(', '));
  };

  const toggleMemberSelection = (email: string) => {
    const activeEmails = emails.split(',').map(e => e.trim()).filter(Boolean);
    const index = activeEmails.findIndex(e => e.toLowerCase() === email.toLowerCase());

    if (index > -1) {
      // Uncheck: remove from active string
      activeEmails.splice(index, 1);
    } else {
      // Check: add to active string
      activeEmails.push(email);
    }
    
    setEmails(activeEmails.join(', '));
  };

  const isMemberSelected = (email: string) => {
    const activeEmails = emails.split(',').map(e => e.trim()).filter(Boolean);
    return activeEmails.some(e => e.toLowerCase() === email.toLowerCase());
  };

  // Microphone recording functions
  const startRecording = async () => {
    chunksRef.current = [];
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordingDuration(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop all media tracks to release microphone lock
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error("Mic access error:", err);
      alert("마이크 권한을 획득하지 못했습니다. 브라우저 설정 및 마이크 연결 상태를 확인해 주세요.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordingDuration(0);
  };

  // Convert Blob file to Base64
  const convertBlobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Helper to load sample text for testing
  const loadSampleTranscript = () => {
    const sample = `오늘 스크럼 시작할게요. 민수님은 어제 말씀하신 메인 페이지 UI 컴포넌트 다 만드셨나요? 네, 다 만들었고 오늘 테스트 예정입니다. 그리고 백엔드 쪽에서 로그인 API를 이번 주까지 완료해주셔야 프론트랑 붙여볼 수 있을 것 같아요. 영희님이 맡아주시기로 했죠? 아 네, 제가 금요일까지 끝내놓을게요. 아, 그리고 우리 다음 주 배포 일정 확인해야 하니까 다들 달력에 일정 비워두세요.`;
    setTranscript(sample);
  };

  // Summarize text scrum notes using backend BFF API
  const handleSummarize = async () => {
    if (!transcript.trim()) return;
    
    setIsSummarizing(true);
    setSummary(''); // Clear previous summary
    
    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: transcript }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '회의록 요약 도중 오류가 발생했습니다.');
      }
      
      setSummary(data.summary);
    } catch (err: any) {
      console.error(err);
      alert(err.message || '요약에 실패했습니다. API 키 또는 서버 연결을 확인해 주세요.');
    } finally {
      setIsSummarizing(false);
    }
  };

  // Summarize raw audio using native Gemini multimodal capability
  const handleAudioSummarize = async () => {
    if (!audioBlob) return;
    
    setIsSummarizing(true);
    setSummary('');
    
    try {
      const base64Audio = await convertBlobToBase64(audioBlob);
      const response = await fetch('/api/summarize-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          audio: base64Audio,
          mimeType: audioBlob.type || 'audio/webm'
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '음성 요약 도중 오류가 발생했습니다.');
      }
      setSummary(data.summary);
    } catch (err: any) {
      console.error(err);
      alert(err.message || '음성 스크럼 분석에 실패했습니다. API 키를 확인해 주세요.');
    } finally {
      setIsSummarizing(false);
    }
  };

  // Send summary via email using backend BFF API
  const handleSendEmail = async () => {
    if (!summary.trim() || !emails.trim()) return;
    
    const emailList = emails
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0);
      
    if (emailList.length === 0) {
      alert('올바른 이메일 주소를 하나 이상 입력하세요.');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emailList.filter(email => !emailRegex.test(email));
    
    if (invalidEmails.length > 0) {
      alert('올바르지 않은 이메일 형식이 포함되어 있습니다.');
      return;
    }
    
    setIsSendingEmail(true);
    
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary,
          emails: emailList
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '이메일 전송 도중 에러가 발생했습니다.');
      }
      
      alert('지정된 팀원들에게 요약 이메일 전송을 완료했습니다.');
      
      // Reset inputs as required by specifications
      setTranscript('');
      setSummary('');
      setEmails('');
      deleteRecording();
    } catch (err: any) {
      console.error(err);
      alert(err.message || '이메일 발송에 실패했습니다. 이메일 주소 및 서버 설정을 확인하세요.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Top Navigation / Header */}
      <header className="glass-panel sticky top-0 z-50 border-b border-white/5 py-4 px-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white m-0 flex items-center gap-2">
              VibeCode <span className="text-xs bg-indigo-500/20 text-indigo-300 font-medium px-2 py-0.5 rounded-full border border-indigo-500/30">Scrum AI</span>
            </h1>
            <p className="text-[10px] text-slate-400">Smart Meeting Summarizer & Emailer</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>BFF Client Online</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Left Side: Input Panel with Tab Switches */}
        <section className="glass-panel rounded-2xl p-6 shadow-xl transition-all duration-300 hover:shadow-indigo-500/5">
          
          {/* Tab Headers */}
          <div className="flex border-b border-white/10 pb-4 mb-4 justify-between items-center">
            <div className="flex gap-2 bg-slate-900/60 p-1.5 rounded-xl border border-white/5">
              <button
                onClick={() => {
                  if (isRecording) stopRecording();
                  setActiveTab('text');
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'text'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                텍스트 입력
              </button>
              <button
                onClick={() => setActiveTab('voice')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'voice'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                음성 녹음 <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-1.5 py-0.5 rounded-full border border-emerald-500/30">Gemini</span>
              </button>
            </div>

            {activeTab === 'text' && (
              <button 
                onClick={loadSampleTranscript}
                className="text-xs bg-slate-800/80 hover:bg-slate-800 text-indigo-300 hover:text-indigo-200 border border-slate-700/50 hover:border-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                예시 대화 불러오기
              </button>
            )}
          </div>

          {/* TAB 1: Text Input Mode */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400 leading-relaxed">
                진행된 스크럼 대화 내용이나 회의록 텍스트를 복사하여 입력해 주세요.
              </p>

              <div className="relative mb-6">
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="여기에 대화체로 진행된 스크럼 내용을 붙여넣으세요...&#10;(예시: '민수님 어제 만드신 컴포넌트 테스트하셨나요?...')"
                  className="w-full h-80 rounded-xl bg-slate-950/60 border border-white/10 p-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/80 transition-all font-sans text-sm resize-none"
                />
                {transcript && (
                  <button 
                    onClick={() => setTranscript('')}
                    className="absolute right-3 bottom-3 text-xs text-slate-500 hover:text-slate-300 bg-slate-900/80 hover:bg-slate-900 border border-white/5 px-2.5 py-1 rounded-md transition-all"
                  >
                    지우기
                  </button>
                )}
              </div>

              <button
                onClick={handleSummarize}
                disabled={isSummarizing || !transcript.trim()}
                className={`w-full py-3.5 px-6 rounded-xl font-medium tracking-wide flex items-center justify-center gap-2 transition-all duration-300 ${
                  isSummarizing || !transcript.trim()
                    ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-white/5'
                    : 'glow-btn bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/10 cursor-pointer'
                }`}
              >
                {isSummarizing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-300" />
                    <span>요약 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>AI 요약 및 액션 아이템 도출</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 2: Voice Recording Mode */}
          {activeTab === 'voice' && (
            <div className="space-y-6 py-4">
              <p className="text-sm text-slate-400 leading-relaxed">
                마이크로 스크럼 회의 음성을 직접 녹음해 보세요. Gemini가 음성 데이터 모달리티를 네이티브로 직접 읽고 요약합니다.
              </p>

              {/* Status & Display Card */}
              <div className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center border border-white/5 min-h-[250px] relative overflow-hidden">
                {isRecording && (
                  <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />
                )}

                {/* Animated waves while recording */}
                {isRecording && (
                  <div className="flex gap-1.5 items-end justify-center mb-6 h-12">
                    {[1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3, 2, 1].map((val, idx) => (
                      <div
                        key={idx}
                        className="w-1.5 rounded-full bg-red-500"
                        style={{
                          height: `${val * 8}px`,
                          animation: `bounce 1s ease-in-out infinite`,
                          animationDelay: `${idx * 0.05}s`
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Timer or Status Text */}
                <div className="text-center">
                  {isRecording ? (
                    <span className="text-4xl font-mono font-bold tracking-wider text-red-500 animate-pulse">
                      {formatTime(recordingDuration)}
                    </span>
                  ) : audioUrl ? (
                    <div className="space-y-4 w-full flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                        <Volume2 className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-semibold text-emerald-400">음성 녹음 완료 ({formatTime(recordingDuration)})</span>
                      <audio src={audioUrl} controls className="w-64 max-w-full rounded-xl bg-slate-900 border border-white/10" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400 mx-auto">
                        <Mic className="w-7 h-7" />
                      </div>
                      <p className="text-xs text-slate-500">마이크를 준비하고 하단 녹음 버튼을 눌러주세요</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                {!audioBlob ? (
                  isRecording ? (
                    <button
                      onClick={stopRecording}
                      className="w-full py-4 rounded-xl font-medium tracking-wide flex items-center justify-center gap-2 cursor-pointer bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/10 transition-all"
                    >
                      <MicOff className="w-5 h-5" />
                      녹음 중지
                    </button>
                  ) : (
                    <button
                      onClick={startRecording}
                      disabled={isSummarizing}
                      className="w-full py-4 rounded-xl font-medium tracking-wide flex items-center justify-center gap-2 cursor-pointer glow-btn bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/10 transition-all"
                    >
                      <Mic className="w-5 h-5" />
                      녹음 시작
                    </button>
                  )
                ) : (
                  <div className="flex w-full gap-3">
                    <button
                      onClick={deleteRecording}
                      disabled={isSummarizing}
                      className="flex-1 py-3.5 px-4 rounded-xl text-xs font-semibold cursor-pointer border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-red-400 hover:text-red-300 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      다시 녹음
                    </button>
                    <button
                      onClick={handleAudioSummarize}
                      disabled={isSummarizing}
                      className="flex-[2] py-3.5 px-4 rounded-xl text-xs font-semibold cursor-pointer glow-btn bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2 transition-all"
                    >
                      {isSummarizing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          요약 중...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          음성으로 요약하기
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </section>

        {/* Right Side: Analysis & Sharing */}
        <div className="space-y-8">
          
          {/* Output Card */}
          <section className="glass-panel rounded-2xl p-6 shadow-xl relative min-h-[300px] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-lg font-semibold text-white m-0">AI 분석 결과</h2>
                </div>
                {summary && (
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(summary);
                      alert('클립보드에 요약본이 복사되었습니다.');
                    }}
                    className="text-xs bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    복사
                  </button>
                )}
              </div>

              {summary ? (
                <div className="glass-card rounded-xl p-5 border border-white/5 max-h-[400px] overflow-y-auto mb-6">
                  <div className="markdown-body text-slate-300 text-sm">
                    <ReactMarkdown>{summary}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="glass-card rounded-xl border border-dashed border-white/10 p-12 text-center flex flex-col items-center justify-center min-h-[250px] mb-6">
                  <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 border border-indigo-500/20">
                    <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                  </div>
                  <h3 className="text-sm font-medium text-slate-300 mb-1">대기 중</h3>
                  <p className="text-xs text-slate-500 max-w-[280px] leading-relaxed">
                    회의 내용을 입력하고 분석 버튼을 누르면 이곳에 결과가 표시됩니다.
                  </p>
                </div>
              )}
            </div>

            {/* Email Card (Only active when summary exists) */}
            <div className={`transition-all duration-300 ${summary ? 'opacity-100 pointer-events-auto' : 'opacity-40 pointer-events-none'}`}>
              <div className="border-t border-white/10 pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-sm font-semibold text-white m-0">이메일 공유</h2>
                </div>

                <div className="space-y-4">
                  {/* Team Selection Checkboxes */}
                  {teamMembers.length > 0 && (
                    <div className="space-y-2 mb-2 p-3 bg-slate-950/20 rounded-xl border border-white/5">
                      <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase mb-2">팀원 수신자 선택 (체크박스)</p>
                      <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto pr-1">
                        {teamMembers.map((member) => {
                          const selected = isMemberSelected(member.email);
                          return (
                            <label
                              key={member.email}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer select-none text-xs ${
                                selected
                                  ? 'bg-indigo-600/25 border-indigo-500/30 text-indigo-200 font-medium'
                                  : 'bg-slate-900/40 border-white/5 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleMemberSelection(member.email)}
                                className="w-3.5 h-3.5 rounded border-white/10 bg-slate-950 text-indigo-600 focus:ring-indigo-500/30 focus:ring-offset-slate-900 cursor-pointer"
                              />
                              <span className="truncate">
                                {member.name} <span className="text-[9px] text-slate-500">({member.email})</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <input
                      type="text"
                      disabled={!summary}
                      value={emails}
                      onChange={(e) => setEmails(e.target.value)}
                      placeholder="수신자 이메일을 쉼표(,)로 구분하여 입력하세요"
                      className="w-full rounded-xl bg-slate-950/60 border border-white/10 px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/80 transition-all text-xs"
                    />
                  </div>

                  <button
                    onClick={handleSendEmail}
                    disabled={isSendingEmail || !summary || !emails.trim()}
                    className={`w-full py-3 px-6 rounded-xl font-medium tracking-wide flex items-center justify-center gap-2 transition-all duration-300 ${
                      isSendingEmail || !summary || !emails.trim()
                        ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed border border-white/5'
                        : 'glow-btn bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/10 cursor-pointer'
                    }`}
                  >
                    {isSendingEmail ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                        <span>전송 중...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>이메일 전송</span>
                      </>
                    )}
                  </button>

                  {/* Team Members List Management Collapsible details */}
                  <div className="border-t border-white/5 pt-4 mt-4">
                    <details className="group">
                      <summary className="flex items-center justify-between text-xs text-slate-400 cursor-pointer hover:text-slate-200 transition-colors list-none select-none">
                        <span className="flex items-center gap-1.5 font-medium">
                          👤 자주 보내는 팀원 주소록 ({teamMembers.length})
                        </span>
                        <span className="text-[10px] text-indigo-400 group-open:rotate-180 transition-transform duration-200">▼</span>
                      </summary>
                      
                      <div className="mt-4 space-y-4">
                        {/* Add Member Form */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newMemberName}
                            onChange={(e) => setNewMemberName(e.target.value)}
                            placeholder="이름"
                            className="flex-1 rounded-lg bg-slate-950/60 border border-white/10 px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-xs"
                          />
                          <input
                            type="email"
                            value={newMemberEmail}
                            onChange={(e) => setNewMemberEmail(e.target.value)}
                            placeholder="이메일"
                            className="flex-[2] rounded-lg bg-slate-950/60 border border-white/10 px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-xs"
                          />
                          <button
                            onClick={addTeamMember}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-3 py-2 rounded-lg text-xs transition-all flex items-center justify-center shrink-0 cursor-pointer"
                          >
                            등록
                          </button>
                        </div>

                        {/* Member List with Delete Option */}
                        {teamMembers.length > 0 ? (
                          <div className="max-h-[140px] overflow-y-auto space-y-1.5 border border-white/5 rounded-xl p-2 bg-slate-950/30">
                            {teamMembers.map(member => (
                              <div key={member.email} className="flex justify-between items-center bg-slate-900/30 px-3 py-2 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-semibold text-slate-200 truncate">{member.name}</span>
                                  <span className="text-[10px] text-slate-500 truncate">{member.email}</span>
                                </div>
                                <button
                                  onClick={() => removeTeamMember(member.email)}
                                  className="text-slate-500 hover:text-red-400 p-1.5 rounded-md hover:bg-red-500/10 transition-all cursor-pointer"
                                  title="삭제"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500 text-center py-4">등록된 주소록 팀원이 없습니다.</p>
                        )}
                      </div>
                    </details>
                  </div>

                </div>
              </div>
            </div>
          </section>

          {/* Tips Info Panel */}
          <section className="glass-panel rounded-2xl p-5 shadow-lg border border-white/5">
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-300 mb-1">Gmail SMTP 및 앱 비밀번호 연동</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  백엔드의 <code className="text-[10px] text-indigo-300">backend/.env</code> 파일에 구글 2단계 인증으로 발급받은 16자리 앱 비밀번호와 Gemini API 키를 기입하셔야 요약 및 메일 전송이 정상 작동합니다.
                </p>
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 py-4 text-center text-xs text-slate-500 mt-8">
        <p>© 2026 VibeCode AI Scrum Summarizer. Built for Developer Education.</p>
      </footer>
    </div>
  );
}
