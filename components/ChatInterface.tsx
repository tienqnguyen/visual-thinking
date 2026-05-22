
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from "react";
import { sendMessageStream } from "../services/gemini";
import { ChatMessageItem } from "./ChatMessageItem";
import { ChatInput } from "./ChatInput";
import { SettingsModal } from "./SettingsModal";
import { Terminal, Settings } from "lucide-react";
import { Part, Content } from "@google/genai";
import { ChatMessage } from "../types";

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [language, setLanguage] = useState<"vi" | "en">("vi");
  const [model, setModel] = useState<"gemini-3-pro-preview" | "gemini-3.5-flash">("gemini-3.5-flash");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string, image?: string) => {
    if (!image) {
      setErrorStatus("Please attach an image (chart, table, or report) to begin analysis.");
      return;
    }

    setErrorStatus(null);
    setIsLoading(true);
    
    const userDisplayParts: Part[] = [{ text: text || "Running technical and quantitative analysis..." }];
    const match = image.match(/^data:(.+);base64,(.+)$/);
    if (match) {
      userDisplayParts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
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
5. **Code Execution Requirement**: You MUST write and execute a Python script to model this setup. Use numpy, pandas, or scipy to calculate risk/reward, Expected Value (EV), or Monte Carlo simulations. You may optionally use matplotlib/PIL to plot/crop key price levels or distribution curves to visually supplement the analysis.

Keep the output professional, clinical, and data-driven.`;

    try {
      const history: Content[] = messages.map((msg) => ({
        role: msg.role,
        parts: msg.parts.map(p => ({ ...p })),
      }));

      const streamResult = await sendMessageStream(apiPrompt, history, model, image);
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
        return [...prev, { id: Date.now().toString(), role: "model", parts: [{ text: errorMessage }], timestamp: Date.now() }];
      });
      
      if (isQuotaOrAuthError) {
         setTimeout(() => setIsSettingsOpen(true), 1500);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-transparent relative">
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <select
          value={model}
          onChange={(e) => setModel(e.target.value as any)}
          className="bg-[#222425] text-[#9fa1a1] text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#383a3b] shadow-sm outline-none cursor-pointer focus:border-[#2383E2] transition-colors"
        >
          <option value="gemini-3-pro-preview">Pro (Preview)</option>
          <option value="gemini-3.5-flash">Flash (Fast)</option>
        </select>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-1.5 rounded-lg bg-[#222425] border border-[#383a3b] shadow-sm text-[#9fa1a1] hover:text-white hover:bg-[#383a3b] transition-all"
          title={language === 'vi' ? 'Cài đặt' : 'Settings'}
        >
          <Settings size={18} />
        </button>
        <div className="flex bg-[#222425] p-1 rounded-lg border border-[#383a3b] shadow-sm">
          <button 
            onClick={() => setLanguage("vi")}
            className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all ${language === 'vi' ? 'bg-[#383a3b] text-white shadow-sm' : 'text-[#9fa1a1] hover:text-white'}`}
          >
            VI
          </button>
          <button 
            onClick={() => setLanguage("en")}
            className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all ${language === 'en' ? 'bg-[#383a3b] text-white shadow-sm' : 'text-[#9fa1a1] hover:text-white'}`}
          >
            EN
          </button>
        </div>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        language={language} 
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-3xl mx-auto space-y-8 pb-10">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center mt-32 space-y-6">
                <div className="w-16 h-16 bg-[#222425] rounded-2xl flex items-center justify-center border border-[#383a3b] shadow-sm">
                  <Terminal size={32} className="text-[#e8e8e6]" />
                </div>
                <div>
                   <h1 className="text-2xl font-semibold mb-2">QuantVision</h1>
                   <p className="text-[#9fa1a1] text-sm">{language === 'vi' ? 'Tải lên biểu đồ hoặc bảng để bắt đầu phân tích.' : 'Upload a chart or table to begin analysis.'}</p>
                </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <ChatMessageItem key={msg.id} message={msg} isStreaming={isLoading && index === messages.length - 1} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <div className="flex-shrink-0 p-4 pb-6">
        <div className="max-w-3xl mx-auto relative">
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
