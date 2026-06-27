import React from 'react';
import { FileText, Settings, Users, Sparkles } from 'lucide-react';

interface HeaderProps {
  activeTab: 'dashboard' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'settings') => void;
  memberCount: number;
}

export function Header({ activeTab, setActiveTab, memberCount }: HeaderProps) {
  return (
    <header className="relative w-full overflow-hidden bg-slate-900 text-white shadow-xl">
      {/* Background glowing effects */}
      <div className="absolute top-[-50px] left-[10%] w-[200px] h-[200px] bg-blue-500 rounded-full mix-blend-screen filter blur-[80px] opacity-20 pointer-events-none"></div>
      <div className="absolute bottom-[-50px] right-[10%] w-[250px] h-[250px] bg-indigo-500 rounded-full mix-blend-screen filter blur-[90px] opacity-25 pointer-events-none"></div>

      <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 z-10 relative">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
            <Sparkles className="h-6 w-6 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              AI Scrum Minutes Minimizer
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              스크럼 회의록 AI 요약 및 팀원 자동 이메일 전송 시스템
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <nav className="flex bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/50 backdrop-blur-sm shadow-inner">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="h-4 w-4" />
            회의 요약 및 전송
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="h-4 w-4" />
            팀원 이메일 관리
            {memberCount > 0 && (
              <span className="absolute top-[-4px] right-[-4px] bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ring-2 ring-slate-900 animate-bounce">
                {memberCount}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
