
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatMessage } from "../types";
import { User, Sparkles, ChevronRight, Brain, Code2, Terminal, X, ZoomIn } from "lucide-react";
import { Part } from "@google/genai";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface ChatMessageProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export const ChatMessageItem: React.FC<ChatMessageProps> = ({ message, isStreaming }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const isUser = message.role === "user";

    const renderPart = (part: Part, index: number) => {
      // @ts-ignore
      if (part.thought === true || (typeof part.thought === 'string' && part.thought.length > 0)) {
        return (
          <div key={index} className="pl-4 border-l-[3px] border-[#383a3b] text-[#9fa1a1] text-sm my-4 py-1">
             <div className="flex items-center gap-2 mb-2 font-medium">
                <Brain size={14} /> Thinking
             </div>
             <div className="leading-relaxed whitespace-pre-wrap"><ReactMarkdown remarkPlugins={[remarkGfm]}>{typeof part.thought === 'string' ? part.thought : (part.text || "")}</ReactMarkdown></div>
          </div>
        );
      }
  
      if (part.executableCode) {
        return (
          <div key={index} className="my-6 border border-[#383a3b] rounded-xl bg-[#111111] shadow-sm">
            <div className="px-4 py-2 border-b border-[#383a3b] flex items-center justify-between bg-[#222425] text-[#9fa1a1] font-medium text-xs rounded-t-xl">
               <div className="flex items-center gap-2">
                   <Code2 size={14} /> {part.executableCode.language}
               </div>
            </div>
            <div className="p-0 text-[13px] font-mono overflow-x-auto text-[#e8e8e6]">
               <SyntaxHighlighter language={part.executableCode.language.toLowerCase()} style={vscDarkPlus} customStyle={{ margin: 0, background: 'transparent' }}>
                 {part.executableCode.code}
               </SyntaxHighlighter>
            </div>
          </div>
        );
      }
  
      if (part.codeExecutionResult) {
         const isSuccess = part.codeExecutionResult.outcome === "OUTCOME_OK";
         return (
           <div key={index} className="my-6 border border-[#383a3b] rounded-xl bg-[#111111] shadow-sm">
             <div className="px-4 py-2 border-b border-[#383a3b] flex items-center justify-between bg-[#222425] font-medium text-xs rounded-t-xl">
               <div className="flex items-center gap-2 text-[#9fa1a1]">
                   <Terminal size={14} /> Output
               </div>
               <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${isSuccess ? "bg-green-900/40 text-green-400" : "bg-red-900/40 text-red-400"}`}>
                 {part.codeExecutionResult.outcome === "OUTCOME_OK" ? "Success" : "Error"}
               </span>
             </div>
             <div className="p-4 text-xs font-mono whitespace-pre-wrap overflow-x-auto text-[#9fa1a1]">
                {part.codeExecutionResult.output}
             </div>
           </div>
         );
      }
  
      if (part.text) {
        return (
          <div key={index} className="prose prose-invert max-w-none break-words my-2 space-y-4">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                code({node, inline, className, children, ...props}: any) {
                  const match = /language-(\w+)/.exec(className || '')
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{ margin: 0, padding: 0, background: 'transparent', border: 'none' }}
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  )
                },
                img({node, src, ...props}: any) {
                  return (
                    <div className="relative group inline-block">
                        <img 
                          {...props} 
                          src={src}
                          onClick={() => setSelectedImage(src || null)}
                          className="max-w-full w-auto h-auto rounded-xl border border-[#383a3b] shadow-sm my-4 object-contain cursor-zoom-in hover:opacity-90 transition-opacity"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                        <div className="absolute top-6 right-2 p-1.5 bg-black/60 rounded max-w-full w-auto h-auto opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity backdrop-blur-sm">
                           <ZoomIn size={14} className="text-white" />
                        </div>
                    </div>
                  )
                }
              }}
            >
              {part.text}
            </ReactMarkdown>
          </div>
        );
      }
  
      if (part.inlineData) {
        const imgSrc = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        return (
          <div key={index} className="my-2 inline-block mr-2 align-top relative group">
              <img
              src={imgSrc}
              onClick={() => setSelectedImage(imgSrc)}
              alt="Generated Chart"
              className={(isUser ? "h-[120px] w-[120px] md:h-[200px] md:w-[200px] object-cover" : "max-w-full w-auto h-auto object-contain cursor-zoom-in hover:opacity-90 transition-opacity") + " rounded-xl border border-[#383a3b] shadow-sm bg-[#111111] cursor-zoom-in"}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <div className="absolute top-2 right-2 p-1.5 bg-black/60 rounded max-w-full w-auto h-auto opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity backdrop-blur-sm">
                 <ZoomIn size={14} className="text-white" />
              </div>
          </div>
        );
      }
  
      return null;
    };

  return (
    <>
      <div className={`flex gap-4 w-full animate-in fade-in duration-500 mb-8 pt-4 group`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center flex-none mt-1`}>
            {isUser ? (
                <div className="w-full h-full bg-[#383a3b] text-[#e8e8e6] rounded-full flex items-center justify-center border border-[#555758]">
                   <User size={16} />
                </div>
            ) : (
                <div className="w-full h-full bg-[#1e2021] text-[#2383E2] rounded-full flex items-center justify-center border border-[#383a3b] shadow-sm">
                   <Terminal size={16} />
                </div>
            )}
        </div>
        <div className="flex-1 min-w-0 text-[#e8e8e6] min-h-[40px]">
          <div className="font-semibold text-[15px] mb-1.5 text-[#e8e8e6] opacity-0 group-hover:opacity-100 transition-opacity">
            {isUser ? "You" : "QuantVision"}
          </div>
          <div className="text-[15px] leading-relaxed">
            {message.parts.map((part, i) => renderPart(part, i))}
          </div>
        </div>
      </div>
      
      {/* Zoom Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-4 right-4 p-2 bg-[#111111] border border-[#383a3b] rounded-full hover:bg-[#222425] text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
          >
            <X size={20} />
          </button>
          <img 
            src={selectedImage} 
            alt="Zoomed Review" 
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-xl shadow-2xl ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </>
  );
};

