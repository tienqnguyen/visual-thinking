
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from "react";
import { sendMessageStream } from "../services/gemini";
import { ChatMessageItem } from "./ChatMessageItem";
import { ChatInput } from "./ChatInput";
import { TrendingUp, BarChart2, ArrowLeft, Sun, Moon, PieChart, Activity, Globe, LayoutDashboard, Pin, X, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Part, Content } from "@google/genai";
import { ChatMessage, ExamplePrompt } from "../types";

const DEFAULT_EXAMPLES: ExamplePrompt[] = [
  {
    title: "Phân Tích Biểu Đồ",
    prompt: "Phân tích biểu đồ nến này. Xác định xu hướng chính và tìm kiếm các mẫu hình đảo chiều.",
    image: "https://images.unsplash.com/photo-1611974717482-58f0073e167c?auto=format&fit=crop&q=80&w=1000"
  },
  {
    title: "Báo Cáo Tài Chính",
    prompt: "Trích xuất doanh thu và EPS hàng quý từ bảng này.",
    image: "https://images.unsplash.com/photo-1543286386-713bdd548da4?auto=format&fit=crop&q=80&w=1000"
  },
  {
    title: "Kiểm Tra Chỉ Báo",
    prompt: "Xác định chỉ báo RSI trong biểu đồ này. Có sự phân kỳ nào không?",
    image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=1000"
  }
];

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pinnedImages, setPinnedImages] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches))) {
      return 'dark';
    }
    return 'light';
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      root.classList.remove('dark');
      localStorage.theme = 'light';
    }
  }, [theme]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleExampleClick = async (example: ExamplePrompt) => {
    setErrorStatus(null);
    try {
      const response = await fetch(example.image, { mode: 'cors' }).catch(() => null);
      if (!response || !response.ok) throw new Error("CORS error");
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        handleSendMessage(example.prompt, reader.result as string);
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      setErrorStatus("Không thể tải dữ liệu ví dụ. Vui lòng dán ảnh trực tiếp.");
    }
  };

  const handleSendMessage = async (text: string, image?: string) => {
    // QUANTVISION REQUIREMENT: Phải có hình ảnh mới phân tích
    if (!image) {
      setErrorStatus("YÊU CẦU DỮ LIỆU: QuantVision cần biểu đồ hoặc bảng biểu để thực hiện phân tích.");
      return;
    }

    setErrorStatus(null);
    setIsLoading(true);
    
    const userParts: Part[] = [{ text: text || "Phân tích hình ảnh này cho tôi." }];
    const match = image.match(/^data:(.+);base64,(.+)$/);
    if (match) {
      userParts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      if (!pinnedImages.includes(image)) {
        setPinnedImages(prev => [image, ...prev].slice(0, 8));
      }
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      parts: userParts,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      const history: Content[] = messages.map((msg) => ({
        role: msg.role,
        parts: msg.parts.map(p => ({ ...p })),
      }));

      const streamResult = await sendMessageStream(userParts[0].text!, history, image);
      const modelMessageId = (Date.now() + 1).toString();
      const modelMessage: ChatMessage = { id: modelMessageId, role: "model", parts: [], timestamp: Date.now() };
      setMessages((prev) => [...prev, modelMessage]);

      for await (const chunk of streamResult) {
        const newParts = chunk.candidates?.[0]?.content?.parts || [];
        setMessages((prev) => {
          if (prev.length === 0) return prev;
          const lastMsg = prev[prev.length - 1];
          if (!lastMsg || lastMsg.id !== modelMessageId) return prev;
          const currentParts = [...lastMsg.parts];
          for (const newPart of newParts) {
            const lastPart = currentParts[currentParts.length - 1];
            if (newPart.text && lastPart && lastPart.text !== undefined && !lastPart.executableCode && !lastPart.codeExecutionResult) {
              currentParts[currentParts.length - 1] = { ...lastPart, text: (lastPart.text || "") + newPart.text };
            } else {
              currentParts.push(newPart);
            }
          }
          return [...prev.slice(0, -1), { ...lastMsg, parts: currentParts }];
        });
      }
    } catch (error) {
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: "model", parts: [{ text: "LỖI TERMINAL: Không thể kết nối với lõi xử lý. Thử lại sau." }], timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#f8fafc] dark:bg-[#010204] transition-colors duration-300 font-sans text-slate-900 dark:text-slate-100">
      
      {/* Bảng Tham Chiếu (Sidebar) */}
      <aside className={`flex-shrink-0 bg-white dark:bg-[#0a0f18] border-r border-slate-200 dark:border-white/5 transition-all duration-300 overflow-hidden flex flex-col ${isSidebarOpen ? "w-72 md:w-80" : "w-0"}`}>
        <div className="p-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/[0.02]">
          <h2 className="font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
            <LayoutDashboard size={14} className="text-emerald-500" />
            Dữ liệu Tham chiếu
          </h2>
          <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {pinnedImages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-20 px-6">
              <Activity size={40} className="mb-4 text-emerald-500" />
              <p className="text-[9px] uppercase font-black tracking-widest">Chờ nạp dữ liệu thị giác...</p>
            </div>
          )}
          {pinnedImages.map((img, idx) => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              key={idx} className="group relative rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 bg-black shadow-xl"
            >
              <img src={img} alt="Reference" className="w-full h-auto object-contain max-h-48 group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setPinnedImages(prev => prev.filter((_, i) => i !== idx))} className="p-1.5 bg-rose-600 text-white rounded-full shadow-2xl hover:bg-rose-700 transition-colors">
                  <X size={10} />
                </button>
              </div>
            </motion.div>
          ))}
          
          <div className="pt-6 mt-6 border-t border-slate-200 dark:border-white/5">
            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Mẫu phân tích</h3>
            <div className="grid grid-cols-1 gap-2">
              {DEFAULT_EXAMPLES.map((ex, i) => (
                <button key={i} onClick={() => handleExampleClick(ex)} className="text-left p-3 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-emerald-500/20 border border-transparent hover:border-emerald-500/30 transition-all group">
                  <p className="text-[10px] font-black uppercase text-slate-500 dark:text-emerald-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-300">{ex.title}</p>
                  <p className="text-[9px] text-slate-400 line-clamp-1 mt-1">{ex.prompt}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Terminal Area */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {!isSidebarOpen && (
          <button onClick={() => setIsSidebarOpen(true)} className="absolute top-4 left-4 z-20 p-2.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl text-emerald-500 hover:scale-110 transition-transform">
            <LayoutDashboard size={20} />
          </button>
        )}

        {/* Header */}
        <header className="flex-shrink-0 bg-white/80 dark:bg-[#0a0f18]/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 px-4 md:px-6 py-3 flex items-center gap-3 relative z-10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 via-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-xl">
            <TrendingUp size={18} />
          </div>
          <div className="flex flex-col">
            <h1 className="font-black text-xs md:text-sm tracking-[0.1em] uppercase">QuantVision VN <span className="text-emerald-500 font-mono text-[9px] ml-2 opacity-70">LIVE_TERMINAL</span></h1>
          </div>
          <div className="flex-1"></div>
          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500/70">Core Active</span>
             </div>
             <button onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')} className="p-2 text-slate-500 hover:text-emerald-500 transition-colors">
               {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
             </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-trading-grid">
          <div className={`max-w-4xl mx-auto w-full ${messages.length === 0 ? "h-full flex flex-col justify-center" : "space-y-8"}`}>
            {messages.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                <div className="relative inline-block mb-8">
                   <Globe size={64} className="mx-auto text-emerald-500/20 animate-spin-slow" />
                   <div className="absolute inset-0 flex items-center justify-center">
                      <Activity size={24} className="text-emerald-500" />
                   </div>
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4">
                  Visual <span className="text-emerald-500">Analytics</span>
                </h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-black max-w-sm mx-auto leading-relaxed opacity-60">
                  Dán biểu đồ, bảng biểu hoặc báo cáo tài chính để bắt đầu phiên phân tích định lượng.
                </p>
              </motion.div>
            ) : (
              messages.map((msg, index) => (
                <ChatMessageItem key={msg.id} message={msg} isStreaming={isLoading && index === messages.length - 1} />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Error/Warning Status */}
        <AnimatePresence>
          {errorStatus && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="px-4 py-2 bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-2xl relative z-20">
              <AlertCircle size={14} />
              {errorStatus}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="flex-shrink-0 p-4 bg-white/50 dark:bg-[#020408]/50 backdrop-blur-2xl border-t border-slate-200 dark:border-white/5">
          <div className="max-w-4xl mx-auto">
            <ChatInput onSend={handleSendMessage} disabled={isLoading} />
            <div className="mt-3 flex justify-between items-center text-[8px] text-slate-500 dark:text-slate-600 font-black uppercase tracking-[0.2em]">
              <div className="flex gap-4">
                 <span>Hệ thống: Gemini 3.0 Pro Vision</span>
                 <span className="text-blue-500">Mã hóa: AES-256</span>
              </div>
              <span className="text-emerald-500">Ready for data ingestion_</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
