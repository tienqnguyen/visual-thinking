
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Part, Content } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const sendMessageStream = async (
  message: string,
  history: Content[],
  image?: string
) => {
  const chat = ai.chats.create({
    model: "gemini-3-pro-preview",
    history: history,
    config: {
      systemInstruction: `Bạn là "QuantVision VN", một chuyên gia phân tích tài chính và nghiên cứu định lượng hàng đầu. 
      Nhiệm vụ của bạn là phân tích biểu đồ chứng khoán, bảng biểu và báo cáo tài chính với độ chính xác cực cao bằng tiếng Việt.
      1. Phân tích kỹ thuật: Xác định các mẫu hình nến, chỉ báo (RSI, MACD, Moving Averages), và các vùng hỗ trợ/kháng cự.
      2. Trích xuất dữ liệu: Trích xuất số liệu từ báo cáo kết quả kinh doanh hoặc bảng cân đối kế toán và thực hiện các tính toán tài chính.
      3. Tư duy trực quan: Sử dụng Python (qua codeExecution) để thực hiện xác minh định lượng, chẳng hạn như tính toán CAGR, độ biến động (volatility), hoặc vẽ các đường xu hướng trên dữ liệu hình ảnh.
      4. Phong cách: Trả lời bằng tiếng Việt chuyên nghiệp, khách quan, dựa trên dữ liệu. 
      Luôn đưa ra tuyên bố miễn trừ trách nhiệm: "Phân tích này chỉ mang tính chất tham khảo, không phải là lời khuyên đầu tư tài chính."
      Không sử dụng định dạng markdown để tham chiếu trực tiếp đến file hình ảnh trong câu trả lời. Hãy tập trung vào việc giải thích logic phân tích.`,
      tools: [{ codeExecution: {} }],
      thinkingConfig: {
        includeThoughts: true,
        thinkingBudget: 32768
      },
    },
  });

  const parts: Part[] = [{ text: message }];
  if (image) {
    const match = image.match(/^data:(.+);base64,(.+)$/);
    if (match) {
      let mimeType = match[1];
      if (mimeType === 'application/octet-stream') {
        mimeType = 'image/jpeg';
      }

      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: match[2],
        },
      });
    }
  }

  const result = await chat.sendMessageStream({ message: parts });
  return result;
};
