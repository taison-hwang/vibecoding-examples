import { useState, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { DashboardTab } from './components/features/DashboardTab';
import { SettingsTab } from './components/features/SettingsTab';
import { ToastContainer, type ToastType } from './components/ui/Toast';
import {
  healthCheck,
  summarizeText,
  summarizeAudio,
  sendEmail,
  type Recipient,
  isMockMode
} from './lib/api';
import { LayoutGrid, Settings, AlertCircle, RefreshCw } from 'lucide-react';

interface TeamMember extends Recipient {
  id: number;
}

const DEFAULT_RECIPIENTS: TeamMember[] = [
  { id: 1719623400000, name: '김스크럼', email: 'scrum_master@gmail.com' },
  { id: 1719623405000, name: '이디벨', email: 'developer_lee@gmail.com' },
];

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings'>('dashboard');

  // Shared application state to preserve state when switching tabs
  const [textInput, setTextInput] = useState('');
  const [summary, setSummary] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // LocalStorage state with custom hook fallback
  const [recipients, setRecipients] = useLocalStorage<TeamMember[]>('scrum_recipients', DEFAULT_RECIPIENTS);
  const [emailSubject, setEmailSubject] = useLocalStorage<string>('email_subject', '[스크럼 요약] {date} 회의 결과 공유');
  const [emailHeader, setEmailHeader] = useLocalStorage<string>(
    'email_header',
    '안녕하세요 팀원 여러분,\n금일 진행된 스크럼 회의 요약 및 액션 아이템을 아래와 같이 전송해 드립니다.\n내용을 확인하시고 각자의 액션 아이템을 기한 내에 완료해 주시기 바랍니다.'
  );
  const [emailFooter, setEmailFooter] = useLocalStorage<string>('email_footer', '감사합니다.\nAI Scrum Sync 시스템');

  // Backend connection status
  const [serverConnected, setServerConnected] = useState<boolean | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

  // Toast notifications list
  const [toasts, setToasts] = useState<ToastType[]>([]);

  // Show Toast helper
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    const newToast: ToastType = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      message,
      type,
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const handleCloseToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Perform Connection Check
  const checkConnection = async () => {
    setIsCheckingConnection(true);
    const connected = await healthCheck();
    setServerConnected(connected);
    setIsCheckingConnection(false);
  };

  // Poll connection on mount and every 60 seconds
  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 60000);
    return () => clearInterval(interval);
  }, []);

  // CRUD Recipient Handlers
  const handleAddRecipient = (name: string, email: string): boolean => {
    // Check if email duplicate exists
    const duplicate = recipients.some((r) => r.email.toLowerCase() === email.toLowerCase());
    if (duplicate) {
      showToast('이미 등록된 이메일 주소입니다.', 'error');
      return false;
    }

    const newMember: TeamMember = {
      id: Date.now(),
      name,
      email,
    };
    setRecipients([...recipients, newMember]);
    showToast(`${name} 팀원이 추가되었습니다.`, 'success');
    return true;
  };

  const handleDeleteRecipient = (email: string) => {
    const targetMember = recipients.find((r) => r.email === email);
    setRecipients(recipients.filter((r) => r.email !== email));
    if (targetMember) {
      showToast(`${targetMember.name} 팀원이 목록에서 제거되었습니다.`, 'info');
    }
  };

  // Business Action Triggers
  const handleSummarizeTextSubmit = async () => {
    setIsAnalyzing(true);
    try {
      const result = await summarizeText(textInput);
      setSummary(result.summary);
      showToast('AI 요약 및 액션 아이템이 성공적으로 생성되었습니다.', 'success');
    } catch (err: any) {
      showToast(err.message || 'AI 요약 처리 중 오류가 발생했습니다.', 'error');
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSummarizeAudioSubmit = async (audioBlob: Blob) => {
    setIsAnalyzing(true);
    try {
      const result = await summarizeAudio(audioBlob);
      setSummary(result.summary);
      showToast('음성 녹음본 분석 및 요약이 완료되었습니다.', 'success');
    } catch (err: any) {
      showToast(err.message || 'AI 음성 요약 처리 중 오류가 발생했습니다.', 'error');
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendEmailSubmit = async () => {
    setIsSendingEmail(true);
    try {
      // Pass clean recipient values (just name & email)
      const cleanRecipients: Recipient[] = recipients.map(({ name, email }) => ({ name, email }));
      const result = await sendEmail(summary, cleanRecipients, emailSubject, emailHeader, emailFooter);
      showToast(result.message, 'success');
    } catch (err: any) {
      showToast(err.message || '이메일 발송 중 오류가 발생했습니다.', 'error');
      throw err;
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main text-text-main flex flex-col font-sans">
      {/* Top Header Section */}
      <header className="border-b border-border-color bg-card-bg/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
              <span className="text-primary font-bold text-lg">🔄</span>
            </div>
            <div>
              <h1 className="text-md sm:text-lg font-bold tracking-tight text-text-main">AI Scrum Sync</h1>
              <p className="text-[10px] text-text-muted mt-0.5">Scrum Meeting AI Summarizer</p>
            </div>
            {isMockMode() && (
              <span className="ml-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-[10px] px-2 py-0.5 rounded-full font-bold">
                MOCK
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Connection Indicator */}
            <div className="bg-bg-main/60 border border-border-color rounded-full px-3 py-1.5 flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  serverConnected === true
                    ? 'bg-success shadow-[0_0_8px_var(--color-success)]'
                    : serverConnected === false
                    ? 'bg-danger animate-pulse shadow-[0_0_8px_var(--color-danger)]'
                    : 'bg-text-muted'
                }`}
              />
              <span className="text-[10px] sm:text-xs font-semibold text-text-muted">
                {serverConnected === true
                  ? 'Local Server: Connected'
                  : serverConnected === false
                  ? 'Local Server: Disconnected'
                  : 'Checking Server...'}
              </span>
              <button
                onClick={checkConnection}
                disabled={isCheckingConnection}
                className="text-text-muted hover:text-text-main transition-colors ml-1"
                title="연결 상태 새로고침"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingConnection ? 'animate-spin text-primary' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-border-color mb-8">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text-main'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              메인 작업 화면
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text-main'
              }`}
            >
              <Settings className="w-4 h-4" />
              설정 & 이메일 관리
            </button>
          </div>
        </div>

        {/* Connection warning banner if server is disconnected & NOT running mock mode */}
        {serverConnected === false && !isMockMode() && (
          <div className="mb-6 bg-danger/10 border border-danger/30 rounded-xl p-4 flex items-start gap-3 text-left">
            <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-danger">로컬 백엔드 서버 연결 끊김</h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                백엔드 API 서버(FastAPI)가 현재 작동하지 않고 있습니다. 요약 분석 및 이메일 전송을 진행하시려면 로컬 백엔드를 켜 주시기 바랍니다. 
                테스트를 원하실 경우 프론트엔드 환경변수 `VITE_USE_MOCK`을 `true`로 설정하여 Mock 모드로 구동할 수 있습니다.
              </p>
            </div>
          </div>
        )}

        {/* Tab views with state preservation */}
        <div className="transition-all duration-300">
          {activeTab === 'dashboard' ? (
            <DashboardTab
              textInput={textInput}
              setTextInput={setTextInput}
              summary={summary}
              setSummary={setSummary}
              isAnalyzing={isAnalyzing}
              isSendingEmail={isSendingEmail}
              recipients={recipients}
              onSummarizeText={handleSummarizeTextSubmit}
              onSummarizeAudio={handleSummarizeAudioSubmit}
              onSendEmail={handleSendEmailSubmit}
              showToast={showToast}
            />
          ) : (
            <SettingsTab
              recipients={recipients}
              onAddRecipient={handleAddRecipient}
              onDeleteRecipient={handleDeleteRecipient}
              emailSubject={emailSubject}
              setEmailSubject={setEmailSubject}
              emailHeader={emailHeader}
              setEmailHeader={setEmailHeader}
              emailFooter={emailFooter}
              setEmailFooter={setEmailFooter}
              showToast={showToast}
            />
          )}
        </div>
      </main>

      {/* Footer Section */}
      <footer className="border-t border-border-color py-6 bg-card-bg/20 mt-12 text-center">
        <p className="text-xs text-text-muted">
          AI Scrum Sync © 2026. Powered by Google Gemini 2.5 Flash & Python FastAPI.
        </p>
      </footer>

      {/* Global Toast Container */}
      <ToastContainer toasts={toasts} onClose={handleCloseToast} />
    </div>
  );
}

export default App;
