import React, { useState, useEffect } from "react";
import { X, Key, ExternalLink } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: "vi" | "en";
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, language }) => {
  const [apiKey, setApiKey] = useState("");
  const [apiKey2, setApiKey2] = useState("");

  useEffect(() => {
    if (isOpen) {
      setApiKey(localStorage.getItem("gemini_api_key") || "");
      setApiKey2(localStorage.getItem("gemini_api_key_2") || "");
    }
  }, [isOpen]);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem("gemini_api_key", apiKey.trim());
    } else {
      localStorage.removeItem("gemini_api_key");
    }
    if (apiKey2.trim()) {
      localStorage.setItem("gemini_api_key_2", apiKey2.trim());
    } else {
      localStorage.removeItem("gemini_api_key_2");
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#191a1a] w-full max-w-md rounded-2xl border border-[#383a3b] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-[#383a3b] bg-[#222425]">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Key size={18} className="text-[#9fa1a1]" />
            {language === "vi" ? "Cài đặt API" : "API Settings"}
          </h2>
          <button onClick={onClose} className="p-1 rounded-md text-[#9fa1a1] hover:text-white hover:bg-[#383a3b] transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="space-y-4">
             <div className="space-y-2">
               <label className="block text-sm font-medium text-[#e8e8e6]">
                 Google Gemini API Key (Primary)
               </label>
               <input 
                 type="password"
                 value={apiKey}
                 onChange={(e) => setApiKey(e.target.value)}
                 className="w-full bg-[#111111] border border-[#383a3b] rounded-lg px-3 py-2 text-[#e8e8e6] focus:outline-none focus:border-[#2383E2] transition-colors font-mono text-sm"
                 placeholder={language === "vi" ? "Nhập API key của bạn..." : "Enter your API key..."}
               />
             </div>
             <div className="space-y-2">
               <label className="block text-sm font-medium text-[#e8e8e6]">
                 Backup API Key (Auto-rotate on quota error)
               </label>
               <input 
                 type="password"
                 value={apiKey2}
                 onChange={(e) => setApiKey2(e.target.value)}
                 className="w-full bg-[#111111] border border-[#383a3b] rounded-lg px-3 py-2 text-[#e8e8e6] focus:outline-none focus:border-[#2383E2] transition-colors font-mono text-sm"
                 placeholder={language === "vi" ? "Nhập API key dự phòng..." : "Enter backup API key..."}
               />
             </div>
          </div>

          <div className="bg-[#222425] border border-[#383a3b] rounded-lg p-4 space-y-3">
             <h3 className="text-sm font-semibold text-white">
                {language === "vi" ? "Cách lấy API Key miễn phí:" : "How to get a free API Key:"}
             </h3>
             <ol className="text-[#9fa1a1] space-y-2 text-sm list-decimal list-inside">
                <li>
                  {language === "vi" ? "Truy cập " : "Go to "}
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[#2383E2] hover:underline inline-flex items-center gap-1">
                    Google AI Studio <ExternalLink size={12} />
                  </a>
                </li>
                <li>{language === "vi" ? "Đăng nhập bằng tài khoản Google." : "Sign in with your Google account."}</li>
                <li>{language === "vi" ? "Nhấp vào nút 'Create API key'." : "Click on the 'Create API key' button."}</li>
                <li>{language === "vi" ? "Sao chép khóa và dán vào ô bên trên." : "Copy the key and paste it into the field above."}</li>
             </ol>
             <p className="text-xs text-[#9fa1a1] mt-2 border-t border-[#383a3b] pt-2">
                {language === "vi" 
                  ? "Khóa của bạn được lưu trữ an toàn ngay trên trình duyệt (localStorage)." 
                  : "Your key is stored securely in your browser's local storage."}
             </p>
          </div>
        </div>

        <div className="p-4 border-t border-[#383a3b] bg-[#222425] flex justify-end gap-3">
           <button 
             onClick={onClose}
             className="px-4 py-2 text-sm font-medium text-[#c6c7c8] hover:text-white transition-colors"
           >
             {language === "vi" ? "Hủy" : "Cancel"}
           </button>
           <button 
             onClick={handleSave}
             className="px-4 py-2 text-sm font-medium bg-[#e8e8e6] text-[#191a1a] rounded-lg hover:bg-white transition-colors"
           >
             {language === "vi" ? "Lưu" : "Save"}
           </button>
        </div>
      </div>
    </div>
  );
}
