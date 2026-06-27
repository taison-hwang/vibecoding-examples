import React, { useState } from 'react';
import { Users, Plus, X, AlertCircle, HelpCircle } from 'lucide-react';

interface MemberManagerProps {
  emails: string[];
  onAddEmail: (email: string) => void;
  onRemoveEmail: (email: string) => void;
}

export function MemberManager({ emails, onAddEmail, onRemoveEmail }: MemberManagerProps) {
  const [inputEmail, setInputEmail] = useState('');
  const [touched, setTouched] = useState(false);

  // Email validation regex (standard HTML5 level + simple checks)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValidEmail = emailRegex.test(inputEmail);
  const showError = touched && inputEmail.length > 0 && !isValidEmail;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidEmail && !emails.includes(inputEmail)) {
      onAddEmail(inputEmail);
      setInputEmail('');
      setTouched(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md flex flex-col gap-6">
      {/* Heading */}
      <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          팀원 이메일 관리
        </h2>
        <span className="text-xs text-slate-400 font-medium">
          등록 멤버수: {emails.length}명
        </span>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <label htmlFor="email-input" className="text-xs font-semibold text-slate-500">
          신규 이메일 주소 등록
        </label>
        <div className="flex gap-2">
          <input
            id="email-input"
            type="text"
            value={inputEmail}
            onChange={(e) => {
              setInputEmail(e.target.value);
              setTouched(true);
            }}
            placeholder="user@example.com"
            className={`flex-1 px-4 py-2.5 rounded-xl border text-sm focus:outline-none transition-all ${
              showError
                ? 'border-red-400 bg-red-50/10 focus:ring-4 focus:ring-red-500/10'
                : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
            }`}
          />
          <button
            type="submit"
            disabled={!isValidEmail || emails.includes(inputEmail)}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-1.5 transition-all ${
              isValidEmail && !emails.includes(inputEmail)
                ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-md'
                : 'bg-slate-100 text-slate-400 border border-slate-200/50 cursor-not-allowed'
            }`}
          >
            <Plus className="h-4 w-4" />
            추가
          </button>
        </div>

        {/* Validation error message */}
        {showError && (
          <p className="text-red-500 text-xs font-semibold flex items-center gap-1 mt-1 animate-fadeIn">
            <AlertCircle className="h-3.5 w-3.5" />
            올바른 이메일 형식이 아닙니다.
          </p>
        )}

        {emails.includes(inputEmail) && (
          <p className="text-amber-600 text-xs font-semibold flex items-center gap-1 mt-1">
            <AlertCircle className="h-3.5 w-3.5" />
            이미 등록되어 있는 이메일 주소입니다.
          </p>
        )}
      </form>

      {/* Member tags list */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-slate-500">등록된 팀원 멤버 리스트</p>

        {emails.length > 0 ? (
          <div className="flex flex-wrap gap-2.5 min-h-[80px] p-4 bg-slate-50/50 border border-slate-100 rounded-xl">
            {emails.map((email, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-blue-300 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all"
              >
                {email}
                <button
                  type="button"
                  onClick={() => onRemoveEmail(email)}
                  className="p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                  title="삭제"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <div className="min-h-[80px] border border-dashed border-slate-200 p-5 rounded-xl flex items-center justify-center text-slate-400 text-xs italic">
            등록된 팀원이 없습니다.
          </div>
        )}
      </div>

      {/* Persistence Note */}
      <div className="flex gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-500">
        <HelpCircle className="h-4 w-4 text-slate-400 shrink-0" />
        <p className="leading-relaxed">
          팀원 정보는 브라우저의 로컬 스토리지(<code className="bg-slate-200/50 px-1 py-0.5 rounded text-[10px]">LocalStorage</code>)에 저장되므로 페이지를 새로고침해도 정보가 유지됩니다.
        </p>
      </div>
    </div>
  );
}
