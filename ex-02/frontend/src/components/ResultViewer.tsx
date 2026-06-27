import React from 'react';
import { Mail, Calendar, User, FileText, CheckSquare, Send } from 'lucide-react';

interface ActionItem {
  owner: string;
  task: string;
  due: string;
}

interface ResultViewerProps {
  summary: string;
  actionItems: ActionItem[];
  memberCount: number;
  isEmailSending: boolean;
  onSendEmail: () => Promise<void>;
}

export function ResultViewer({
  summary,
  actionItems,
  memberCount,
  isEmailSending,
  onSendEmail
}: ResultViewerProps) {
  if (!summary) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-200 p-8 rounded-2xl text-center flex flex-col items-center justify-center gap-3">
        <div className="bg-slate-100 p-3 rounded-full text-slate-400">
          <FileText className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">분석 결과가 없습니다</p>
          <p className="text-xs text-slate-400 mt-1">상단의 입력폼에 내용을 적거나 오디오를 업로드하여 AI 분석을 실행해주세요.</p>
        </div>
      </div>
    );
  }

  const isEmailDisabled = isEmailSending || memberCount === 0;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md flex flex-col gap-6 animate-fadeIn">
      {/* Summary Heading */}
      <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          📌 회의 요약 개요
        </h2>
        <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
          AI 분석 완료
        </span>
      </div>

      {/* Summary Content */}
      <div className="bg-green-50/50 border-l-4 border-green-500 p-4 rounded-r-xl text-slate-700 text-sm leading-relaxed whitespace-pre-line shadow-sm">
        {summary}
      </div>

      {/* Action Items */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <CheckSquare className="h-4.5 w-4.5 text-blue-600" />
          ⚡ 액션 아이템 (Action Items)
        </h3>

        {actionItems && actionItems.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50/80">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/4">
                    담당자
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/2">
                    업무 내용
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/4">
                    기한
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {actionItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-800 font-semibold flex items-center gap-2">
                      <div className="bg-slate-100 p-1 rounded text-slate-500 shrink-0">
                        <User className="h-3.5 w-3.5" />
                      </div>
                      <span className="truncate max-w-[120px]">{item.owner}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">
                      {item.task}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500 text-xs">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {item.due}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">액션 아이템이 도출되지 않았습니다.</p>
        )}
      </div>

      {/* Email Trigger Block */}
      <div className="border-t border-slate-100 pt-5 flex flex-col gap-3">
        <button
          type="button"
          disabled={isEmailDisabled}
          onClick={onSendEmail}
          className={`w-full py-3.5 px-5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
            isEmailDisabled
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200/50'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10 cursor-pointer active:scale-[0.98]'
          }`}
        >
          {isEmailSending ? (
            <>
              <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>이메일 전송 중...</span>
            </>
          ) : (
            <>
              <Send className="h-4.5 w-4.5" />
              <span>✉️ 등록된 팀원에게 이메일 전송 ({memberCount}명)</span>
            </>
          )}
        </button>

        {memberCount === 0 && (
          <p className="text-center text-xs text-red-500 font-semibold animate-pulse">
            ⚠️ 이메일을 발송하려면 '팀원 이메일 관리' 탭에서 수신자를 최소 1명 이상 등록해 주세요.
          </p>
        )}
      </div>
    </div>
  );
}
