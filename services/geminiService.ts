
import { GoogleGenAI, Type } from "@google/genai";
import { VideoInfo, PsychologicalHook, ThumbnailResult } from "../types";

export class GeminiService {
  private static instance: GeminiService;
  
  private constructor() {}

  static getInstance() {
    if (!this.instance) {
      this.instance = new GeminiService();
    }
    return this.instance;
  }

  async analyzeVideoInfo(info: VideoInfo): Promise<Omit<ThumbnailResult, 'imageUrl'>> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const targetLang = info.language === 'ko' ? 'Korean' : 'English';
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a world-class YouTube growth strategist. Generate a complete content package based on the description and category.
      
      Channel Name: ${info.channelName}
      Video Content/Description: ${info.description}
      Category: ${info.category}
      Target Language: ${targetLang}
      
      Requirements:
      1. Consistency: Maintain the unique voice and style of "${info.channelName}".
      2. Titles: Generate 5 high-CTR titles based on the description.
      3. Hooks: Generate 4 specific hooks for the thumbnail image.
      4. Full Description: A professional SEO-optimized description. **At the very end of the description, you MUST include 3-5 high-impact #hashtags (with # prefix).**
      5. Keywords: A separate comma-separated list of 10-15 keywords **WITHOUT** the '#' symbol (for the YouTube tags field).
      6. Analysis: A strategic breakdown of why this content will perform well.
      7. Pinned Comment: A high-engagement pinned comment that encourages viewers to subscribe, comment, or watch another related video.

      Return the output strictly in JSON format matching the provided schema. 
      The 'titles', 'copy', 'fullDescription', 'keywords', and 'pinnedComment' MUST be in ${targetLang}. 
      The 'analysis' and 'psychology' fields can be in Korean.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: { type: Type.STRING },
            titles: { type: Type.ARRAY, items: { type: Type.STRING } },
            fullDescription: { type: Type.STRING, description: "Description text including #hashtags at the bottom." },
            keywords: { type: Type.STRING, description: "Comma separated keywords WITHOUT # prefix." },
            pinnedComment: { type: Type.STRING, description: "A high-engagement pinned comment." },
            hooks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  label: { type: Type.STRING },
                  copy: { type: Type.STRING },
                  psychology: { type: Type.STRING }
                },
                required: ['type', 'label', 'copy', 'psychology']
              }
            }
          },
          required: ['analysis', 'titles', 'fullDescription', 'keywords', 'hooks', 'pinnedComment']
        }
      }
    });

    return JSON.parse(response.text);
  }

  async generateThumbnail(prompt: string, referenceImage?: string, channelName?: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const parts: any[] = [
      { text: `High-CTR YouTube thumbnail style for the channel "${channelName || 'Professional Channel'}". Style: Professional lighting, vibrant colors, high contrast, Rule of Thirds composition. Focus: ${prompt}. Cinematic quality, 4K resolution, vivid textures. The person in the image should have an exaggerated facial expression (e.g., extreme shock, anger, or mysterious smile) to trigger mirror neurons. Keep the background simple and out-of-focus (bokeh) to highlight the subject. Use bright visual cues like arrows or circles if appropriate.` }
    ];

    if (referenceImage) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: referenceImage.split(',')[1]
        }
      });
      parts[0].text += " Incorporate the character/object from the provided reference image seamlessly into this new professional thumbnail composition.";
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "1K"
        }
      }
    });

    let imageUrl = '';
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }
    
    if (!imageUrl) throw new Error("Image generation failed to return data.");
    return imageUrl;
  }
}
