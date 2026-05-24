
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from "react";
import { sendMessageStream } from "../services/gemini";
import { ChatMessageItem } from "./ChatMessageItem";
import { ChatInput } from "./ChatInput";
import { SettingsModal } from "./SettingsModal";
import { Terminal, Settings, Globe, Lock, Copy, Check, Loader2, RefreshCw } from "lucide-react";
import { Part, Content } from "@google/genai";
import { ChatMessage } from "../types";

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [language, setLanguage] = useState<"vi" | "en">("vi");
  const [model, setModel] = useState<"gemini-3-pro-preview" | "gemini-3.5-flash" | "gemini-3.1-pro-preview">("gemini-3.5-flash");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [pinPromptOpen, setPinPromptOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pendingModel, setPendingModel] = useState<string | null>(null);
  const [isSharingPublic, setIsSharingPublic] = useState(false);
  const [isSharingPrivate, setIsSharingPrivate] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  
  const scrollContainerRef = useRef<HTMLElement>(null);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get('shareId');
    if (shareId) {
      setIsLoading(true);
      fetch(`https://ai-skynet.replit.app/api/files/${shareId}.json`)
        .then(res => {
            if (!res.ok) throw new Error("Not found");
            return res.json();
        })
        .then(data => {
           if (data.messages) {
              setMessages(data.messages);
           } else {
              setErrorStatus(language === 'vi' ? "Đoạn chat được chia sẻ không tồn tại hoặc đã hết hạn." : "Shared chat not found or has expired.");
           }
        })
        .catch(err => {
           console.error(err);
           setErrorStatus(language === 'vi' ? "Lỗi tải đoạn chat." : "Error loading shared chat.");
        })
        .finally(() => setIsLoading(false));
    }
  }, [language]);

  const handleShare = async (isPublic: boolean) => {
    if (messages.length === 0) return;
    
    if (isPublic) {
      setIsSharingPublic(true);
    } else {
      setIsSharingPrivate(true);
    }
    
    setShareLink(null);
    setCopiedLink(false);
    
    try {
      let fileId = "";
      if (isPublic) {
        let targetId = 1;
        let oldestTime = Infinity;
        let oldestId = 1;
        let foundEmpty = false;

        for (let i = 1; i <= 5; i++) {
          try {
            const checkRes = await fetch(`https://ai-skynet.replit.app/api/files/analyze-${i}.json`);
            if (!checkRes.ok) { targetId = i; foundEmpty = true; break; }
            const checkData = await checkRes.json();
            if (checkData.error || !checkData.messages || checkData.messages.length === 0) {
               targetId = i; foundEmpty = true; break;
            }
            const ts = checkData.timestamp || 0;
            if (ts < oldestTime) { oldestTime = ts; oldestId = i; }
          } catch {
             targetId = i; foundEmpty = true; break;
          }
        }
        
        if (!foundEmpty) targetId = oldestId;
        fileId = `analyze-${targetId}`;
      } else {
        fileId = `private-${Math.random().toString(36).substring(2, 10)}`;
      }

      const payload = { timestamp: Date.now(), messages };
      
      const formData = new FormData();
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      formData.append('file', blob, `${fileId}.json`);

      const res = await fetch(`https://ai-skynet.replit.app/api/files/${fileId}.json`, {
        method: "POST",
        body: formData
      });
      
      if (!res.ok) {
         throw new Error("Failed to save to external API");
      }

      const url = `${window.location.origin}?shareId=${fileId}`;
      setShareLink(url);

    } catch (err) {
      console.error(err);
      alert(language === 'vi' ? "Không thể chia sẻ." : "Failed to share.");
    } finally {
      if (isPublic) {
        setIsSharingPublic(false);
      } else {
        setIsSharingPrivate(false);
      }
    }
  };

  const copyToClipboard = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleSendMessage = async (text: string, images?: string[]) => {
    if (!images || images.length === 0) {
      setErrorStatus(language === 'vi' ? "Vui lòng tải lên biểu đồ (tối đa 2) để bắt đầu phân tích." : "Please attach chart images (up to 2) to begin analysis.");
      return;
    }

    setErrorStatus(null);
    setIsLoading(true);
    
    const userDisplayParts: Part[] = [{ text: text || "Running technical and quantitative analysis..." }];
    
    for (const img of images) {
       const match = img.match(/^data:(.+);base64,(.+)$/);
       if (match) {
         userDisplayParts.push({ inlineData: { mimeType: match[1], data: match[2] } });
       }
    }

    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substring(2, 15),
      role: "user",
      parts: userDisplayParts,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);

    const apiPrompt = `${text ? text + '\n\n' : ''}System Directive: Execute a comprehensive technical and quantitative analysis of this chart. Respond strictly in ${language === 'vi' ? 'Vietnamese' : 'English'}.
Provide a highly structured report using Markdown (H2/H3 for sections, bullet points). Include:
1. **Market Context**: Overall bias and dominant trend.
2. **Key Liquidity Levels**: Specific Support/Resistance zones.
3. **Strategic Plan**: Actionable scenarios (entry, SL, TP) based on structural breaks.
4. **Invalidation**: Specific conditions that negate the trade setup.
5. **Code Execution Requirement**: You MUST write and execute a Python script to model this setup. In the script, use matplotlib to mathematically reconstruct the price action around the key liquidity levels and ZOOM IN (crop the plot) to highlight the specific entry, stop loss, and breakout points.

Keep the output professional, clinical, and data-driven.`;

    try {
      const history: Content[] = messages.map((msg) => ({
        role: msg.role,
        parts: msg.parts.map(p => ({ ...p })),
      }));

      const streamResult = await sendMessageStream(apiPrompt, history, model, images);
      const modelMessageId = Math.random().toString(36).substring(2, 15);
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
    } catch (error: any) {
      console.error(error);
      const isQuotaOrAuthError = error?.message?.toLowerCase().includes("quota") || error?.status === 429 || error?.status === 403 || error?.message?.toLowerCase().includes("permission");
      const errorMessage = isQuotaOrAuthError 
         ? (language === "vi" ? "Đã vượt quá giới hạn lượt dùng hoặc lỗi quyền truy cập. Vui lòng thêm Gemini API Key của bạn trong phần Cài đặt (Settings) để tiếp tục sử dụng miễn phí." : "Server quota exceeded or permission denied. Please enter your free Gemini API key in Settings to continue.")
         : (error?.message || (language === "vi" ? "Lỗi phân tích. Vui lòng thử lại." : "Analysis error. Please try again."));
         
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === "model" && last.parts.length === 0) {
           return [...prev.slice(0, -1), { ...last, parts: [{ text: errorMessage }] }];
        }
        return [...prev, { id: Math.random().toString(36).substring(2, 15), role: "model", parts: [{ text: errorMessage }], timestamp: Date.now() }];
      });
      
      if (isQuotaOrAuthError) {
         setTimeout(() => setIsSettingsOpen(true), 1500);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as any;
    if (value === "gemini-3.1-pro-preview") {
       setPendingModel(value);
       setPinPromptOpen(true);
       setPinInput("");
    } else {
       setModel(value);
    }
  };

  const submitPin = () => {
    if (pinInput === "911") {
       setModel(pendingModel as any);
       setPinPromptOpen(false);
    } else {
       alert(language === 'vi' ? "Mã PIN không đúng." : "Incorrect PIN.");
       setPinPromptOpen(false);
    }
    setPendingModel(null);
  };

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-transparent relative">
      <div className="absolute top-3 right-3 left-3 sm:left-auto sm:top-4 sm:right-4 z-50 flex flex-wrap sm:flex-nowrap items-center justify-end gap-1.5 sm:gap-2">
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="p-1.5 rounded-lg bg-[#222425] border border-[#383a3b] shadow-sm text-[#9fa1a1] hover:text-white hover:bg-[#383a3b] transition-all flex items-center gap-1.5 px-2 sm:px-3 h-[28px] sm:h-[34px]"
            title={language === 'vi' ? 'Quay lại Trang chủ / Xóa Chat' : 'Back to Home / Clear Chat'}
          >
            <RefreshCw size={14} />
            <span className="text-xs font-semibold hidden sm:inline">{language === 'vi' ? 'Làm mới' : 'Clear'}</span>
          </button>
        )}
        <select
          value={model}
          onChange={handleModelChange}
          className="bg-[#222425] text-[#9fa1a1] text-[11px] sm:text-xs font-semibold px-1.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-[#383a3b] shadow-sm outline-none cursor-pointer focus:border-[#2383E2] transition-colors max-w-[85px] sm:max-w-none h-[28px] sm:h-[34px]"
        >
          <option value="gemini-3-pro-preview">Pro</option>
          <option value="gemini-3.5-flash">Flash</option>
          <option value="gemini-3.1-pro-preview">3.1 Pro</option>
        </select>
        {messages.length > 0 && (
          <>
          <button
            onClick={() => handleShare(true)}
            disabled={isSharingPublic || isSharingPrivate || isLoading}
            className="p-1.5 rounded-lg bg-[#222425] border border-[#383a3b] shadow-sm text-[#9fa1a1] hover:text-green-400 hover:bg-[#383a3b] transition-all disabled:opacity-50 h-[28px] sm:h-[34px] flex items-center justify-center w-[28px] sm:w-[34px]"
            title={language === 'vi' ? 'Chia sẻ công khai (Nằm trong 5 bài mới nhất)' : 'Public Share (Available in Recent 5)'}
          >
            {isSharingPublic ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
          </button>
          <button
            onClick={() => handleShare(false)}
            disabled={isSharingPublic || isSharingPrivate || isLoading}
            className="p-1.5 rounded-lg bg-[#222425] border border-[#383a3b] shadow-sm text-[#9fa1a1] hover:text-[#2383E2] hover:bg-[#383a3b] transition-all disabled:opacity-50 h-[28px] sm:h-[34px] flex items-center justify-center w-[28px] sm:w-[34px]"
            title={language === 'vi' ? 'Chia sẻ riêng tư (Liên kết ngẫu nhiên, chỉ người có link mới thấy)' : 'Private Share (Random link, unlisted)'}
          >
            {isSharingPrivate ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
          </button>
          </>
        )}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-1.5 rounded-lg bg-[#222425] border border-[#383a3b] shadow-sm text-[#9fa1a1] hover:text-white hover:bg-[#383a3b] transition-all h-[28px] sm:h-[34px] flex items-center justify-center w-[28px] sm:w-[34px]"
          title={language === 'vi' ? 'Cài đặt' : 'Settings'}
        >
          <Settings size={14} />
        </button>
        <button 
          onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
          className="h-[28px] sm:h-[34px] px-2 sm:px-2.5 rounded-lg bg-[#222425] border border-[#383a3b] shadow-sm text-[#9fa1a1] hover:text-white hover:bg-[#383a3b] transition-all text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1"
          title={language === 'vi' ? 'Chuyển sang tiếng Anh' : 'Switch to Vietnamese'}
        >
          <span className="opacity-70">🌐</span>
          <span>{language === 'vi' ? 'VI' : 'EN'}</span>
        </button>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        language={language} 
      />

      {pinPromptOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
           <div className="bg-[#1a1c1d] border border-[#383a3b] rounded-xl p-6 shadow-2xl w-full max-w-sm">
             <h3 className="text-white font-semibold mb-2">{language === 'vi' ? 'Yêu cầu mã PIN' : 'PIN Required'}</h3>
             <p className="text-xs text-neutral-400 mb-4">{language === 'vi' ? 'Vui lòng nhập mã PIN để sử dụng model này.' : 'Please enter PIN to use this model.'}</p>
             <input 
               type="password" 
               autoFocus
               value={pinInput}
               onChange={(e) => setPinInput(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && submitPin()}
               className="w-full bg-[#111111] text-white border border-[#383a3b] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2383E2] transition-colors mb-4"
               placeholder={language === 'vi' ? "Nhập mã PIN..." : "Enter PIN..."}
             />
             <div className="flex justify-end gap-2">
               <button 
                 onClick={() => {
                   setPinPromptOpen(false);
                   setPendingModel(null);
                 }} 
                 className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
               >
                 {language === 'vi' ? 'Hủy' : 'Cancel'}
               </button>
               <button 
                 onClick={submitPin}
                 className="px-4 py-2 text-sm font-medium bg-[#2383E2] text-white rounded-lg hover:bg-blue-600 transition-colors"
               >
                 {language === 'vi' ? 'Xác nhận' : 'Confirm'}
               </button>
             </div>
           </div>
        </div>
      )}

      {shareLink && (
        <div className="absolute top-16 right-4 z-50 bg-[#222425] border border-[#383a3b] p-3 rounded-xl shadow-xl flex flex-col gap-2 animate-in fade-in slide-in-from-top-4">
           <div className="text-xs text-[#9fa1a1] font-medium">{language === 'vi' ? 'Liên kết chia sẻ (Tạm thời):' : 'Share link (Temporary):'}</div>
           <div className="flex items-center gap-2">
             <input readOnly value={shareLink} className="bg-[#111111] text-white text-xs px-2 py-1.5 rounded-md border border-[#383a3b] w-48 outline-none" />
             <button onClick={copyToClipboard} className="p-1.5 rounded-md bg-[#2383E2] hover:bg-blue-600 text-white transition-colors">
                {copiedLink ? <Check size={14} /> : <Copy size={14} />}
             </button>
           </div>
           <button onClick={() => setShareLink(null)} className="text-[10px] text-right text-gray-400 hover:text-white uppercase font-bold mt-1">Đóng</button>
        </div>
      )}

      <main ref={scrollContainerRef} className="flex-1 overflow-y-auto p-2 md:p-6 lg:p-8 custom-scrollbar">
        <div className="max-w-5xl mx-auto space-y-8 pb-10">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center mt-32 space-y-6">
                <div className="w-16 h-16 bg-[#222425] rounded-2xl flex items-center justify-center border border-[#383a3b] shadow-sm">
                  <Terminal size={32} className="text-[#e8e8e6]" />
                </div>
                <div>
                   <h1 className="text-2xl font-semibold mb-2">QuantVision</h1>
                   <p className="text-[#9fa1a1] text-sm">{language === 'vi' ? 'Tải lên biểu đồ hoặc bảng để bắt đầu phân tích.' : 'Upload a chart or table to begin analysis.'}</p>
                </div>

                <div className="mt-12 w-full max-w-md pt-8 border-t border-[#383a3b]/50">
                  <div className="text-xs text-[#555758] uppercase font-bold tracking-wider mb-4 flex items-center justify-center gap-2">
                    <Globe size={14} className="text-green-500/70" />
                    {language === 'vi' ? 'Các phân tích công khai gần đây' : 'Recent Public Analyses'}
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2.5">
                    {[1, 2, 3, 4, 5].map((id) => (
                      <a 
                        key={id} 
                        href={`?shareId=analyze-${id}`} 
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1a1c1d] border border-[#383a3b]/60 text-xs font-semibold text-[#a1a1aa] hover:text-[#e4e4e7] hover:bg-[#272a2b] hover:border-[#4d4f51] hover:-translate-y-0.5 transition-all shadow-sm"
                      >
                         {language === 'vi' ? 'Mẫu' : 'Sample'} {id}
                      </a>
                    ))}
                  </div>
                </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <ChatMessageItem key={msg.id} message={msg} isStreaming={isLoading && index === messages.length - 1} />
            ))
          )}
        </div>
      </main>

      <div className="flex-shrink-0 p-2 md:p-4 pb-6 w-full max-w-5xl mx-auto">
        <div className="relative">
          <ChatInput onSend={handleSendMessage} disabled={isLoading} language={language} />
          {errorStatus && (
            <div className="absolute -top-12 left-0 right-0 text-red-400 font-medium bg-red-500/10 p-2 rounded border border-red-500/20 text-center text-sm shadow-sm backdrop-blur-md">
              {errorStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
