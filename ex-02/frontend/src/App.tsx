import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SummaryForm } from './components/SummaryForm';
import { ResultViewer } from './components/ResultViewer';
import { MemberManager } from './components/MemberManager';
import { useLocalStorage } from './hooks/useLocalStorage';
import { AlertCircle, CheckCircle2, RotateCcw, X, Info } from 'lucide-react';

interface ActionItem {
  owner: string;
  task: string;
  due: string;
}

const BACKEND_URL = 'http://localhost:3001';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings'>('dashboard');
  const [emails, setEmails] = useLocalStorage<string[]>('scrum_team_emails', []);
  
  // API result states
  const [summary, setSummary] = useState('');
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [lastInputText, setLastInputText] = useState('');
  const [lastInputFile, setLastInputFile] = useState<File | null>(null);

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Interactive notification states
  const [modal, setModal] = useState<{ title: string; body: string; type: 'error' | 'warning' | 'info' } | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (text: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToast({ text, type });
  };

  const handleAddEmail = (email: string) => {
    if (!emails.includes(email)) {
      setEmails([...emails, email]);
      showToast(`이메일이 등록되었습니다: ${email}`, 'success');
    }
  };

  const handleRemoveEmail = (email: string) => {
    setEmails(emails.filter(e => e !== email));
    showToast(`이메일이 삭제되었습니다: ${email}`, 'warning');
  };

  // 1. Text Summary Request
  const handleSummarizeText = async (text: string) => {
    setIsLoading(true);
    setErrorText(null);
    setLastInputText(text);
    setLastInputFile(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || '회의록 요약 도출에 실패했습니다.');
      }

      const data = await response.json();
      setSummary(data.summary);
      setActionItems(data.action_items || []);
      showToast('회의록 요약 및 액션 아이템 도출 성공!', 'success');
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || '요약 도출에 실패했습니다. 다시 시도해주세요.');
      showToast('AI 요약 요청에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Audio Summary Request
  const handleSummarizeAudio = async (file: File) => {
    setIsLoading(true);
    setErrorText(null);
    setLastInputFile(file);
    setLastInputText('');

    try {
      const formData = new FormData();
      formData.append('audio', file);

      const response = await fetch(`${BACKEND_URL}/api/summarize-audio`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || '오디오 회의록 요약 도출에 실패했습니다.');
      }

      const data = await response.json();
      setSummary(data.summary);
      setActionItems(data.action_items || []);
      showToast('오디오 회의록 분석 및 요약 완료!', 'success');
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || '오디오 요약 도출에 실패했습니다. 다시 시도해주세요.');
      showToast('오디오 분석 요청에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Retry logic
  const handleRetry = async () => {
    if (lastInputFile) {
      await handleSummarizeAudio(lastInputFile);
    } else if (lastInputText) {
      await handleSummarizeText(lastInputText);
    }
  };

  // 3. Email Send Request
  const handleSendEmail = async () => {
    if (emails.length === 0 || !summary) return;
    setIsEmailSending(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary,
          action_items: actionItems,
          emails
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || '이메일 전송 중 에러가 발생했습니다.');
      }

      const data = await response.json();
      if (data.isMock) {
        setModal({
          title: '📧 가상 이메일 발송 완료 (SMTP 미설정)',
          body: '서버의 SMTP 설정(.env)이 완료되지 않아, 실제 발송을 대체하여 백엔드 터미널 콘솔 로그에 formatted 이메일 HTML 바디를 출력하였습니다. 정상 동작 흐름으로 간주합니다.',
          type: 'info'
        });
        showToast('가상 이메일 발송 로그를 출력했습니다.', 'success');
      } else {
        showToast('회의 요약 이메일 전송 완료!', 'success');
      }
    } catch (err: any) {
      console.error(err);
      setModal({
        title: '❌ 이메일 전송 실패',
        body: `일부 또는 전체 이메일 전송에 실패했습니다. 백엔드 환경변수(.env) 및 SMTP 메일 서버 설정을 다시 확인하세요.\n(상세 에러: ${err.message})`,
        type: 'error'
      });
      showToast('이메일 발송 실패!', 'error');
    } finally {
      setIsEmailSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header component */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        memberCount={emails.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        {activeTab === 'dashboard' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Form input */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <SummaryForm
                isLoading={isLoading}
                onSubmitText={handleSummarizeText}
                onSubmitAudio={handleSummarizeAudio}
              />
            </div>

            {/* Right Column: Output result & errors */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* Error state display */}
              {errorText && (
                <div className="bg-red-50 border border-red-200 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
                  <div className="flex gap-3 items-start">
                    <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-800">요약 도출에 실패했습니다.</p>
                      <p className="text-xs text-red-600 mt-1 leading-relaxed">{errorText}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer self-start sm:self-auto shrink-0"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    재시도
                  </button>
                </div>
              )}

              {/* API response visualizer */}
              {!errorText && (
                <ResultViewer
                  summary={summary}
                  actionItems={actionItems}
                  memberCount={emails.length}
                  isEmailSending={isEmailSending}
                  onSendEmail={handleSendEmail}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            {/* Settings Tab: Member list control */}
            <MemberManager
              emails={emails}
              onAddEmail={handleAddEmail}
              onRemoveEmail={handleRemoveEmail}
            />
          </div>
        )}
      </main>

      {/* Footer copyright */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-center text-slate-500 text-xs mt-auto">
        <div className="max-w-6xl mx-auto px-6">
          <p>© 2026 AI Scrum Minutes Minimizer. Built for local developers and scrum teams.</p>
        </div>
      </footer>

      {/* Modern Custom Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl glass-panel animate-slideIn border-l-4 transition-all duration-300 max-w-sm border-slate-200/50">
          <div className="shrink-0">
            {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            {toast.type === 'warning' && <AlertCircle className="h-5 w-5 text-amber-500" />}
            {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
          </div>
          <span className="text-xs font-bold text-slate-800 leading-snug">
            {toast.text}
          </span>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors ml-auto"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Premium Blur-Overlay Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 flex flex-col animate-scaleUp">
            {/* Modal Header */}
            <div className={`p-4 border-b flex items-center gap-2.5 ${
              modal.type === 'error' ? 'bg-red-50/50 border-red-100' : 'bg-blue-50/50 border-blue-100'
            }`}>
              {modal.type === 'error' ? (
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
              ) : (
                <Info className="h-5 w-5 text-blue-500 shrink-0" />
              )}
              <h3 className="text-sm font-bold text-slate-800 truncate">
                {modal.title}
              </h3>
              <button
                onClick={() => setModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-all ml-auto"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-5 flex-1 text-slate-600 text-xs font-medium leading-relaxed whitespace-pre-line">
              {modal.body}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setModal(null)}
                className={`px-5 py-2 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer ${
                  modal.type === 'error'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
