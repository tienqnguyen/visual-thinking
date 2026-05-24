
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from "react";
import { Terminal, Image as ImageIcon, Send, X } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string, images?: string[]) => void;
  disabled: boolean;
  language?: "vi" | "en";
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled, language = "vi" }) => {
  const [input, setInput] = useState("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (selectedImages.length > 0 && !disabled) {
      onSend(input.trim(), selectedImages);
      setInput("");
      setSelectedImages([]);
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
    let newImages: string[] = [];
    for (const item of items) {
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          const p = new Promise<string>((resolve) => {
             reader.onload = (event) => resolve(event.target?.result as string);
          });
          reader.readAsDataURL(file);
          newImages.push(await p);
        }
      }
    }
    if (newImages.length > 0) {
       setSelectedImages(prev => {
          const combined = [...prev, ...newImages];
          return combined.slice(0, 2);
       });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const promises = files.map(file => {
         return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
         });
      });
      Promise.all(promises).then(newImages => {
         setSelectedImages(prev => {
            const combined = [...prev, ...newImages];
            return combined.slice(0, 2);
         });
      });
    }
  };

  const removeImage = (indexToRemove: number) => {
     setSelectedImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  return (
    <div className="flex flex-col gap-2 relative">
      {selectedImages.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-2">
            {selectedImages.map((src, idx) => (
             <div key={idx} className="relative border border-[#383a3b] p-1.5 inline-block bg-[#222425] shadow-sm rounded-lg flex-shrink-0">
                <img src={src} alt="Preview" className="h-[120px] w-[120px] md:h-[160px] md:w-[160px] object-cover rounded-md" />
                <button onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-[#383a3b] text-white hover:bg-red-500 hover:text-white p-1 rounded-full border border-neutral-700 transition-colors shadow-sm">
                  <X size={14} />
                </button>
             </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 border border-[#383a3b] rounded-2xl p-3 bg-[#222425] shadow-sm transition-all focus-within:ring-1 focus-within:ring-[#2383E2]/50 focus-within:border-[#2383E2]/50">
        <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
        
        <div className="flex items-start gap-2 flex-1">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              selectedImages.length > 0 
                ? (language === 'vi' ? "Thêm bối cảnh..." : "Add context to your image...") 
                : (language === 'vi' ? "Đặt câu hỏi, tải biểu đồ lên (tối đa 2)..." : "Ask a question, paste chart images (up to 2), or click to upload...")
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
            disabled={disabled || selectedImages.length >= 2}
            className="text-neutral-400 hover:text-white p-2 rounded-lg hover:bg-[#383a3b] transition-colors disabled:opacity-50"
          >
            <ImageIcon size={18} />
          </button>

          <button
            type="submit"
            disabled={selectedImages.length === 0 || disabled}
            className={`flex items-center gap-2 font-medium justify-center px-4 py-1.5 rounded-full transition-all ${(selectedImages.length === 0 && !input.trim()) || disabled ? "bg-[#383a3b] text-neutral-500" : "bg-[#e8e8e6] text-[#191a1a] hover:bg-white"}`}
          >
            <span className="text-sm">{language === 'vi' ? 'Gửi' : 'Submit'}</span>
            <Send size={14} className="opacity-80" />
          </button>
        </div>
      </form>
    </div>
  );
};
