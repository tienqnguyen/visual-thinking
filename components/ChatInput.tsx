
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, Image as ImageIcon, X, Link as LinkIcon, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatInputProps {
  onSend: (message: string, image?: string) => void;
  disabled: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUrlLoading, setIsUrlLoading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (selectedImage && !disabled) {
      onSend(input.trim(), selectedImage);
      setInput("");
      setSelectedImage(null);
      setErrorMessage(null);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleUrlSubmit = async () => {
    if (!urlValue.trim()) return;
    setIsUrlLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch(urlValue.trim(), { mode: 'cors' });
      if (response.ok) {
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onload = (event) => {
          setSelectedImage(event.target?.result as string);
          setIsUrlLoading(false);
          setShowUrlInput(false);
          setUrlValue("");
        };
        reader.readAsDataURL(blob);
      } else {
        throw new Error("CORS_BLOCK");
      }
    } catch (err) {
      setErrorMessage("Không thể tải ảnh từ URL này do bảo mật (CORS). Hãy chụp màn hình và dán (Ctrl+V) thay thế.");
      setIsUrlLoading(false);
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
    <div className="relative flex flex-col gap-3">
      <AnimatePresence>
        {selectedImage && (
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute bottom-full mb-4 left-0">
            <div className="relative p-1 bg-white dark:bg-[#0f172a] rounded-2xl border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] overflow-hidden">
              <img src={selectedImage} alt="Preview" className="h-40 w-auto rounded-xl object-contain bg-black" />
              <button onClick={() => setSelectedImage(null)} className="absolute top-2 right-2 p-1.5 bg-black/70 text-white rounded-full hover:bg-rose-600 transition-colors shadow-xl">
                <X size={14} />
              </button>
              <div className="absolute bottom-0 inset-x-0 bg-emerald-500/80 text-white text-[8px] font-black uppercase text-center py-1 tracking-widest">
                Dữ liệu đã sẵn sàng
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col bg-white dark:bg-[#0a0f18] rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl transition-all duration-500 focus-within:border-emerald-500/50">
        
        {/* URL Input Bar */}
        <AnimatePresence>
          {showUrlInput && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-slate-100 dark:border-white/5">
              <div className="p-3 flex gap-2">
                <div className="flex-1 bg-slate-50 dark:bg-black/40 rounded-xl px-3 flex items-center gap-2 border border-slate-200 dark:border-white/5">
                   <LinkIcon size={14} className="text-slate-400" />
                   <input 
                    autoFocus
                    value={urlValue}
                    onChange={(e) => setUrlValue(e.target.value)}
                    placeholder="Dán link hình ảnh (https://...)" 
                    className="flex-1 bg-transparent border-none outline-none text-xs py-2 text-slate-800 dark:text-slate-100"
                    onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                   />
                </div>
                <button 
                  onClick={handleUrlSubmit}
                  disabled={isUrlLoading || !urlValue.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-colors disabled:opacity-50"
                >
                  {isUrlLoading ? <Loader2 size={14} className="animate-spin" /> : "Fetch"}
                </button>
                <button onClick={() => setShowUrlInput(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="flex items-end gap-1 p-2">
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
          
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="p-3 text-slate-400 hover:text-emerald-500 transition-all rounded-xl hover:bg-slate-50 dark:hover:bg-white/5"
              title="Tải ảnh lên"
            >
              <ImageIcon size={20} />
            </button>
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              disabled={disabled}
              className={`p-3 transition-all rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 ${showUrlInput ? 'text-emerald-500 bg-emerald-500/5' : 'text-slate-400 hover:text-blue-500'}`}
              title="Nhập URL ảnh"
            >
              <Globe size={20} />
            </button>
          </div>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={selectedImage ? "Thêm ghi chú phân tích (tùy chọn)..." : "Vui lòng cung cấp biểu đồ để phân tích..."}
            disabled={disabled}
            rows={1}
            className="flex-1 max-h-[120px] min-h-[48px] py-3 px-3 bg-transparent border-none outline-none resize-none text-slate-800 dark:text-slate-100 placeholder-slate-500 disabled:opacity-50 font-medium text-sm md:text-base scrollbar-hide"
          />

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!selectedImage || disabled}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
              !selectedImage || disabled
                ? "bg-slate-100 dark:bg-slate-800 text-slate-400"
                : "bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:bg-emerald-700"
            }`}
          >
            {disabled ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          </motion.button>
        </form>
      </div>

      <AnimatePresence>
        {errorMessage && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[9px] text-rose-500 font-black uppercase tracking-widest text-center">
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
