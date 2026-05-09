
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatMessage } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, User, Terminal, Code2, ChevronRight, Brain, Info } from "lucide-react";
import { Part } from "@google/genai";

interface ChatMessageProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

interface CollapsiblePartProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  headerClassName: string;
  contentClassName: string;
  status?: string;
}

const CollapsiblePart: React.FC<CollapsiblePartProps> = ({
  title,
  icon: Icon,
  children,
  headerClassName,
  contentClassName,
  status,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-3 rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm bg-white dark:bg-[#0f172a]/50 backdrop-blur-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all ${headerClassName}`}
      >
        <div className={`transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}>
          <ChevronRight size={14} />
        </div>
        <Icon size={14} />
        <span className="uppercase tracking-wider">{title}</span>
        {status && (
          <span
            className={`ml-auto text-[9px] uppercase px-2 py-0.5 rounded-full font-black ${
              status === "OUTCOME_OK"
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                : "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30"
            }`}
          >
            {status === "OUTCOME_OK" ? "Thành Công" : "Lỗi"}
          </span>
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-100 dark:border-white/5"
          >
            <div className={contentClassName}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ChatMessageItem: React.FC<ChatMessageProps> = ({ message, isStreaming }) => {
  const isUser = message.role === "user";

  const renderPart = (part: Part, index: number) => {
    // @ts-ignore
    if (part.thought === true || (typeof part.thought === 'string' && part.thought.length > 0)) {
      let title = "Tiến Trình Tư Duy";
      
      if (isStreaming && index === message.parts.length - 1) {
        // @ts-ignore
        const thoughtContent = typeof part.thought === 'string' ? part.thought : (part.text || "");
        const boldMatches = [...thoughtContent.matchAll(/\*\*([^*]+)\*\*/g)];
        if (boldMatches.length > 0) {
           const lastTitle = boldMatches[boldMatches.length - 1][1];
           title = `Đang Suy Nghĩ - ${lastTitle}`;
        }
      }

      return (
        <CollapsiblePart
          key={index}
          title={title}
          icon={Brain}
          headerClassName="bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:bg-indigo-900/30"
          contentClassName="p-4 bg-indigo-50/20 text-indigo-900 dark:bg-indigo-900/5 dark:text-indigo-100"
        >
          <div className="prose prose-sm max-w-none prose-indigo dark:prose-invert italic opacity-90 leading-relaxed">
             {/* @ts-ignore */}
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{typeof part.thought === 'string' ? part.thought : (part.text || "")}</ReactMarkdown>
          </div>
        </CollapsiblePart>
      );
    }

    if (part.executableCode) {
      return (
        <CollapsiblePart
          key={index}
          title={`Mã Phân Tích (${part.executableCode.language})`}
          icon={Code2}
          headerClassName="bg-blue-50/50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
          contentClassName="p-0 bg-[#0d1117]"
        >
          <div className="p-4 overflow-x-auto">
             <pre className="text-xs text-blue-300 font-mono leading-relaxed">
                 <code>{part.executableCode.code}</code>
             </pre>
          </div>
        </CollapsiblePart>
      );
    }

    if (part.codeExecutionResult) {
       const isSuccess = part.codeExecutionResult.outcome === "OUTCOME_OK";
       return (
         <CollapsiblePart
           key={index}
           title="Kết Quả Thực Thi"
           icon={Terminal}
           headerClassName={isSuccess 
             ? "bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30" 
             : "bg-rose-50/50 text-rose-700 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-300 dark:hover:bg-rose-900/30"}
           contentClassName="p-4 bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto"
           status={part.codeExecutionResult.outcome}
         >
            <div className="whitespace-pre-wrap leading-relaxed">
                {part.codeExecutionResult.output}
            </div>
         </CollapsiblePart>
       );
    }

    if (part.text) {
      return (
        <div key={index} className="prose prose-sm md:prose-base max-w-none dark:prose-invert break-words leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
        </div>
      );
    }

    if (part.inlineData) {
      return (
        <div key={index} className="mt-4 mb-4">
            <img
            src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`}
            alt="Nội dung đã tải lên"
            className="max-w-full rounded-xl border border-slate-200 dark:border-white/10 shadow-lg"
            />
        </div>
      );
    }

    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex gap-3 md:gap-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className={`flex-shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center shadow-lg transform transition-transform hover:scale-105 ${
          isUser 
            ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white" 
            : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
        }`}
      >
        {isUser ? <User size={18} /> : <Bot size={18} />}
      </div>

      <div
        className={`flex flex-col gap-2 max-w-[88%] md:max-w-[80%] ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`px-4 md:px-6 py-4 rounded-2xl shadow-sm overflow-hidden ${
            isUser
              ? "bg-blue-600 text-white rounded-tr-none shadow-blue-500/10"
              : "bg-white dark:bg-[#0f172a] dark:text-slate-100 border border-slate-100 dark:border-white/5 rounded-tl-none shadow-xl shadow-slate-200/50 dark:shadow-black/20"
          }`}
        >
          {message.parts.map((part, i) => renderPart(part, i))}
        </div>
        <div className={`flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
          <span>{new Date(message.timestamp).toLocaleTimeString('vi-VN', {
            hour: "2-digit",
            minute: "2-digit",
          })}</span>
          {!isUser && (
            <div className="flex items-center gap-1 text-emerald-500">
               <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
               <span>Đã xác minh định lượng</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
