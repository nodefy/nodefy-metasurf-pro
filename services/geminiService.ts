
import { GoogleGenAI, Type } from "@google/genai";
import { Campaign, ScalingStrategy } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeCampaignsForScaling = async (campaigns: Campaign[]) => {
  const activeSurfCampaigns = campaigns.filter(c => c.isSurfScaling && c.status === 'ACTIVE');
  if (activeSurfCampaigns.length === 0) return [];

  const prompt = `
    Analyze these Meta Ads campaigns for extreme scaling opportunities.
    Current data: ${JSON.stringify(activeSurfCampaigns)}
    
    Criteria:
    - ROAS should be significantly above minRoas.
    - Healthy CTR (>1.5%) suggests the creative isn't fatigued.
    - Impact Score (1-100) based on volume and performance margin.
    
    Return a JSON array of actionable scaling alerts.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              campaignId: { type: Type.STRING },
              campaignName: { type: Type.STRING },
              reason: { type: Type.STRING },
              suggestedAction: { type: Type.STRING },
              impactScore: { type: Type.NUMBER }
            },
            required: ["campaignId", "campaignName", "reason", "suggestedAction", "impactScore"]
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Gemini Alert Error:", error);
    return [];
  }
};

export const generateScalingStrategy = async (campaigns: Campaign[]): Promise<ScalingStrategy | null> => {
  if (campaigns.length === 0) return null;

  const context = campaigns.map(c => ({
    name: c.name,
    roas: c.roas,
    spend: c.spend,
    cpa: c.cpa,
    ctr: c.ctr,
    objective: c.objective
  }));
  
  const prompt = `
    Act as a World-Class Meta Ads Strategist.
    Analyze the following performance data and generate a 7-day "Wave-Scaling" Growth Plan.
    Data: ${JSON.stringify(context)}
    
    The strategy must include:
    - A catchy growth-oriented title.
    - A high-level executive summary.
    - Three distinct phases of scaling (e.g. Phase 1: Aggressive Testing, Phase 2: Consolidation, Phase 3: Vertical Scale).
    - A risk level assessment (LOW, MEDIUM, HIGH).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            riskLevel: { type: Type.STRING },
            phases: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  action: { type: Type.STRING },
                  expectedOutcome: { type: Type.STRING }
                },
                required: ["name", "action", "expectedOutcome"]
              }
            }
          },
          required: ["title", "summary", "riskLevel", "phases"]
        }
      }
    });
    
    const strategy = JSON.parse(response.text || '{}');
    return {
      ...strategy,
      generatedAt: new Date().toLocaleTimeString()
    };
  } catch (error) {
    console.error("Gemini Strategy Error:", error);
    return null;
  }
};
