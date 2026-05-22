
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Part, Content } from "@google/genai";

const getApiKey = (index = 1) => {
  if (typeof window !== "undefined") {
    if (index === 2) {
      return localStorage.getItem("gemini_api_key_2") || process.env.GEMINI_API_KEY_2;
    }
    return localStorage.getItem("gemini_api_key") || process.env.API_KEY;
  }
  return index === 2 ? process.env.GEMINI_API_KEY_2 : process.env.API_KEY;
};

export const sendMessageStream = async function* (
  message: string,
  history: Content[],
  model: string = "gemini-3.5-flash",
  image?: string
) {
  const tryCall = async function* (keyIndex: number) {
    const ai = new GoogleGenAI({ apiKey: getApiKey(keyIndex) });
    const chat = ai.chats.create({
      model: model,
      history: history,
      config: {
        systemInstruction: `You are "QuantVision", an elite quantitative trading and technical analysis AI running on terminal architecture.
        Your mandate is to analyze market charts, financial tables, and data with clinical precision.
        
        1. Data Validation & Extraction (Accuracy): Before any analysis, explicitly list the exact price levels, dates, and indicator values you can visually extract from the provided image. If you cannot see a value clearly, state that it is an assumption.
        2. Technical Structure: Identify precise price action, liquidity zones, support/resistance, and momentum divergence based on your extracted data.
        3. Advanced Quantitative Verification: Always write and execute a Python script (via codeExecution) to model the setup. You MUST calculate advanced risk metrics: Sharpe Ratio, Maximum Drawdown, Risk-of-Ruin (RoR), and the Kelly Criterion fraction. Do not rely entirely on generic Monte Carlo simulations; use specific context models (e.g., Geometric Brownian Motion, Black-Scholes, Volatility Cones, Value-at-Risk).
        4. Visual Aids (Matplotlib): When visualizing data, use matplotlib to render beautiful, professional, and diverse plots (e.g. heatmaps, payoff profiles, standard deviation distributions, depth models, zooming to key levels). You MUST render diagrams using ONLY \`plt.show()\`. DO NOT use \`plt.savefig\` or save to local files! Always use \`plt.tight_layout()\` and specify a good figure size (e.g. \`plt.figure(figsize=(10, 6))\`) so the plots are not cropped!
        5. Tone: Highly analytical, professional, objective. Output raw statistical data and trading metrics.
        6. Format: Use clean markdown, bullet points, and bold metric labels. Do not use emojis. Output print() statements in Python for explicit metric display.`,
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
    for await (const chunk of result) {
      yield chunk;
    }
  };

  try {
    yield* tryCall(1);
  } catch (error: any) {
    const isQuotaError = error?.message?.toLowerCase().includes("quota") || error?.status === 429 || error?.status === 403 || error?.message?.toLowerCase().includes("permission");
    
    // Retry with backup key if quota error and backup key exists and differs from prime key
    const primaryKey = getApiKey(1);
    const backupKey = getApiKey(2);

    if (isQuotaError && backupKey && backupKey !== primaryKey) {
      console.warn("Primary API key quota exceeded or unauthorized. Falling back to backup key...");
      yield* tryCall(2);
    } else {
      throw error;
    }
  }
};
