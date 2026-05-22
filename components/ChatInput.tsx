
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from "react";
import { Terminal, Image as ImageIcon, Send, X } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string, image?: string) => void;
  disabled: boolean;
  language?: "vi" | "en";
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled, language = "vi" }) => {
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (selectedImage && !disabled) {
      onSend(input.trim(), selectedImage);
      setInput("");
      setSelectedImage(null);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => setSelectedImage(event.target?.result as string);
          reader.readAsDataURL(file);
          return;
        }
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  return (
    <div className="flex flex-col gap-2 relative">
      {selectedImage && (
        <div className="relative border border-[#383a3b] p-2 inline-block w-max max-w-full bg-[#222425] shadow-sm rounded-lg mb-2">
           <img src={selectedImage} alt="Preview" className="h-32 w-auto object-contain rounded" />
           <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-[#383a3b] text-white hover:bg-red-500 hover:text-white p-1 rounded-full border border-neutral-700 transition-colors shadow-sm">
             <X size={14} />
           </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 border border-[#383a3b] rounded-2xl p-3 bg-[#222425] shadow-sm transition-all focus-within:ring-1 focus-within:ring-[#2383E2]/50 focus-within:border-[#2383E2]/50">
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
        
        <div className="flex items-start gap-2 flex-1">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              selectedImage 
                ? (language === 'vi' ? "Thêm bối cảnh..." : "Add context to your image...") 
                : (language === 'vi' ? "Đặt câu hỏi, tải biểu đồ lên..." : "Ask a question, paste a chart image, or click to upload...")
            }
            disabled={disabled}
            rows={2}
            className="flex-1 bg-transparent border-none outline-none resize-none text-[#e8e8e6] placeholder-neutral-500 disabled:opacity-50 text-[15px] py-1.5 px-1 font-sans"
          />
        </div>
        
        <div className="flex justify-between items-center pt-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="text-neutral-400 hover:text-white p-2 rounded-lg hover:bg-[#383a3b] transition-colors"
          >
            <ImageIcon size={18} />
          </button>

          <button
            type="submit"
            disabled={!selectedImage || disabled}
            className={`flex items-center gap-2 font-medium justify-center px-4 py-1.5 rounded-full transition-all ${(!selectedImage && !input.trim()) || disabled ? "bg-[#383a3b] text-neutral-500" : "bg-[#e8e8e6] text-[#191a1a] hover:bg-white"}`}
          >
            <span className="text-sm">{language === 'vi' ? 'Gửi' : 'Submit'}</span>
            <Send size={14} className="opacity-80" />
          </button>
        </div>
      </form>
    </div>
  );
};
