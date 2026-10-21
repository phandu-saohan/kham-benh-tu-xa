import React, { useRef, useEffect } from 'react';
import { Sparkles, Mic, MicOff, Check, ArrowRight, Brain, Bot, FileText, ChevronRight } from 'lucide-react';
import { useTelemedicine } from '../../context/TelemedicineContext';

export const AiMedicalScribe: React.FC = () => {
  const {
    aiScribe,
    toggleAiListening,
    triggerAiExtractSoap,
    setActiveEmrTab
  } = useTelemedicine();

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [aiScribe.transcript]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
      
      {/* HEADER */}
      <div className="px-3.5 py-2.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs sm:text-sm text-white">AI Medical Scribe (Vietnamese STT)</h3>
              <span className={`w-2 h-2 rounded-full ${aiScribe.isListening ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
            </div>
            <p className="text-[10px] text-slate-300 hidden sm:block">
              Nhận dạng giọng nói lâm sàng tiếng Việt & tự động phân tích ngữ nghĩa HL7 FHIR
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleAiListening}
            title={aiScribe.isListening ? 'Tạm dừng nghe' : 'Tiếp tục nghe'}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
              aiScribe.isListening
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            {aiScribe.isListening ? <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> : <MicOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{aiScribe.isListening ? 'Đang lắng nghe' : 'Tạm dừng'}</span>
          </button>
        </div>
      </div>

      {/* TRANSCRIPT SCROLL AREA */}
      <div
        ref={scrollRef}
        className="p-3 space-y-2.5 max-h-[160px] overflow-y-auto bg-slate-50/70 text-xs"
      >
        {aiScribe.transcript.map(item => {
          const isDoctor = item.speaker.includes('Bác sĩ');
          return (
            <div
              key={item.id}
              className={`flex flex-col ${isDoctor ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 mb-0.5 px-1">
                <span className={`text-[10px] font-bold ${isDoctor ? 'text-blue-700' : 'text-slate-600'}`}>
                  {item.speaker}
                </span>
                <span className="text-[9px] text-slate-400">{item.time}</span>
              </div>
              <div
                className={`max-w-[90%] rounded-xl px-3 py-1.5 text-xs leading-relaxed ${
                  isDoctor
                    ? 'bg-blue-600 text-white rounded-tr-xs shadow-xs'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs shadow-2xs'
                }`}
              >
                {item.text}
              </div>
            </div>
          );
        })}
      </div>

      {/* AI EXTRACT ACTION BAR */}
      <div className="p-2.5 bg-indigo-50/60 border-t border-indigo-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-indigo-950 text-xs">
          <Brain className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="font-semibold hidden sm:inline">Phân tích tự động:</span>
          <span className="text-[11px] text-indigo-800">
            Trích xuất S-O-A-P & Gợi ý mã bệnh ICD-10 từ lời thoại
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              triggerAiExtractSoap();
              setActiveEmrTab('soap');
            }}
            disabled={aiScribe.isExtractingSoap}
            className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Sparkles className={`w-3.5 h-3.5 text-amber-300 ${aiScribe.isExtractingSoap ? 'animate-spin' : ''}`} />
            <span>
              {aiScribe.isExtractingSoap ? 'Đang bóc tách dữ liệu...' : 'AI Bóc tách SOAP & Gợi ý ICD-10'}
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </div>
  );
};
