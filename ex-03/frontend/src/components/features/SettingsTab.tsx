import React, { useState } from 'react';
import { UserPlus, Trash2, Mail, User, Settings, Eye, HelpCircle } from 'lucide-react';
import type { Recipient } from '../../lib/api';


interface SettingsTabProps {
  recipients: Recipient[];
  onAddRecipient: (name: string, email: string) => boolean;
  onDeleteRecipient: (email: string) => void;
  emailSubject: string;
  setEmailSubject: (val: string) => void;
  emailHeader: string;
  setEmailHeader: (val: string) => void;
  emailFooter: string;
  setEmailFooter: (val: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  recipients,
  onAddRecipient,
  onDeleteRecipient,
  emailSubject,
  setEmailSubject,
  emailHeader,
  setEmailHeader,
  emailFooter,
  setEmailFooter,
  showToast,
}) => {
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nameInput.trim()) {
      showToast('이름을 입력해주세요.', 'error');
      return;
    }

    if (!emailInput.trim()) {
      showToast('이메일 주소를 입력해주세요.', 'error');
      return;
    }

    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.trim())) {
      showToast('올바른 이메일 형식이 아닙니다.', 'error');
      return;
    }

    const success = onAddRecipient(nameInput.trim(), emailInput.trim());
    if (success) {
      setNameInput('');
      setEmailInput('');
    }
  };

  // Generate preview of email subject
  const getSubjectPreview = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    return emailSubject.replace('{date}', todayStr);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
      {/* Recipient Management Column */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        {/* Recipient Input Card */}
        <div className="bg-card-bg border border-border-color p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-text-main">
            <UserPlus className="w-5 h-5 text-primary" />
            수신자 추가 (Team Member)
          </h2>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">이름</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    placeholder="홍길동"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full bg-bg-main border border-border-color rounded-lg pl-10 pr-4 py-2.5 text-text-main focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">이메일 주소</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="email"
                    placeholder="example@gmail.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full bg-bg-main border border-border-color rounded-lg pl-10 pr-4 py-2.5 text-text-main focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                </div>
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary-hover text-white py-2.5 rounded-lg font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              팀원 등록
            </button>
          </form>
        </div>

        {/* Recipients List Table Card */}
        <div className="bg-card-bg border border-border-color p-6 rounded-xl shadow-lg flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-text-main">
              <Mail className="w-5 h-5 text-primary" />
              수신자 리스트
            </h2>
            <span className="bg-border-color text-text-muted px-2.5 py-0.5 rounded-full text-xs font-semibold">
              총 {recipients.length}명
            </span>
          </div>

          <div className="border border-border-color rounded-lg overflow-hidden flex-1 bg-bg-main">
            {recipients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center h-full">
                <Mail className="w-12 h-12 text-text-muted mb-3 opacity-30" />
                <p className="text-text-muted font-medium">등록된 팀원이 없습니다.</p>
                <p className="text-xs text-text-muted mt-1 max-w-xs">
                  회의 요약본을 일괄 전송할 수신자 정보를 상단 폼에서 입력해주세요.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border-color text-text-muted bg-card-bg font-medium">
                      <th className="px-4 py-3 text-left">이름</th>
                      <th className="px-4 py-3 text-left">이메일</th>
                      <th className="px-4 py-3 text-center w-20">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-color">
                    {recipients.map((member) => (
                      <tr key={member.email} className="hover:bg-card-bg/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-text-main">{member.name}</td>
                        <td className="px-4 py-3 text-text-muted font-mono">{member.email}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => onDeleteRecipient(member.email)}
                            className="text-text-muted hover:text-danger p-1.5 rounded-lg hover:bg-danger/10 transition-all cursor-pointer"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Email Template Column */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        {/* Template Form Card */}
        <div className="bg-card-bg border border-border-color p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-text-main">
            <Settings className="w-5 h-5 text-primary" />
            이메일 템플릿 설정
          </h2>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-text-muted">이메일 제목 템플릿</label>
                <div className="group relative">
                  <HelpCircle className="w-4 h-4 text-text-muted cursor-pointer hover:text-text-main" />
                  <div className="absolute right-0 bottom-full mb-2 w-48 hidden group-hover:block bg-bg-main border border-border-color p-2 rounded text-xs text-text-muted shadow-xl z-20">
                    `{`{date}`}` 입력 시 발송 당일 날짜(YYYY-MM-DD)로 변환됩니다.
                  </div>
                </div>
              </div>
              <input
                type="text"
                placeholder="제목을 입력하세요..."
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full bg-bg-main border border-border-color rounded-lg px-4 py-2 text-text-main focus:outline-none focus:border-primary transition-colors text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">이메일 상단 메세지 (머리말)</label>
              <textarea
                rows={3}
                placeholder="회의 요약본 위에 들어갈 안내 메세지..."
                value={emailHeader}
                onChange={(e) => setEmailHeader(e.target.value)}
                className="w-full bg-bg-main border border-border-color rounded-lg px-4 py-2 text-text-main focus:outline-none focus:border-primary transition-colors text-sm leading-relaxed resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">이메일 하단 메세지 (꼬리말)</label>
              <textarea
                rows={3}
                placeholder="이메일 가장 하단에 들어갈 서명 또는 문구..."
                value={emailFooter}
                onChange={(e) => setEmailFooter(e.target.value)}
                className="w-full bg-bg-main border border-border-color rounded-lg px-4 py-2 text-text-main focus:outline-none focus:border-primary transition-colors text-sm leading-relaxed resize-none"
              />
            </div>
          </div>
        </div>

        {/* Email Layout Preview Card */}
        <div className="bg-card-bg border border-border-color p-6 rounded-xl shadow-lg flex-1 flex flex-col">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-3 text-text-main">
            <Eye className="w-4.5 h-4.5 text-primary" />
            이메일 발송 레이아웃 프리뷰
          </h2>
          <div className="border border-border-color rounded-lg overflow-hidden bg-white text-slate-800 text-xs flex-1 flex flex-col min-h-[300px]">
            {/* Inbox header mock */}
            <div className="bg-slate-100 border-b border-slate-200 p-3 text-left">
              <div>
                <span className="font-semibold text-slate-500">보낸사람:</span>{" "}
                <span className="text-slate-800 font-medium">AI Scrum Sync &lt;sender@gmail.com&gt;</span>
              </div>
              <div className="mt-1">
                <span className="font-semibold text-slate-500">제목:</span>{" "}
                <span className="text-slate-900 font-bold">{getSubjectPreview()}</span>
              </div>
            </div>
            
            {/* Email content mock */}
            <div className="p-4 flex-1 overflow-y-auto text-left leading-relaxed max-h-[350px]">
              <div className="bg-slate-800 text-white py-2 px-3 rounded font-bold text-[10px] mb-4 flex items-center gap-1.5 w-fit">
                🔄 AI Scrum Sync - Meeting Summary
              </div>
              
              <div className="text-slate-700 whitespace-pre-line mb-4 font-medium">
                {emailHeader || "(머리말 메세지 내용)"}
              </div>
              
              <div className="bg-slate-50 border border-slate-200 rounded p-3 mb-4 text-slate-600 font-mono text-[10px]">
                <div className="font-bold text-slate-800 border-b border-slate-200 pb-1 mb-2"># 🔄 스크럼 회의 요약 (본문 예시)</div>
                <div className="font-bold text-slate-700 mt-2">1. 회의 개요</div>
                <div className="text-slate-500 font-sans italic">AI 요약 분석을 거친 회의록의 핵심 요약본이 들어갑니다...</div>
                <div className="font-bold text-slate-700 mt-2">2. 액션 아이템</div>
                <div className="text-slate-500 font-sans italic">- [ ] 홍길동 | 개발 기한 준수 검토</div>
              </div>
              
              <div className="text-slate-500 whitespace-pre-line border-t border-slate-100 pt-3 text-[10px]">
                {emailFooter || "(꼬리말 메세지 내용)"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
