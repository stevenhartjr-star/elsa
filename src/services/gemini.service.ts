
import { Injectable } from '@angular/core';
import { GoogleGenAI, type Chat } from '@google/genai';
import { type AnalysisResult, type ReviewAnalysis, type TrendAnalysis, type StylistProfile } from '../models/analysis.model';

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private getGenAI(): GoogleGenAI {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set. Please select an API key.");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  /**
   * Executes a promise with smart retry logic for API errors like Rate
   * Limits (429), Server Overload (503), and Quota issues. Fails fast on
   * non-retryable errors.
   */
  private async retryOperation<T>(operation: () => Promise<T>, maxAttempts = 3): Promise<T> {
    let attempt = 0;
    let lastError: any;

    while (attempt < maxAttempts) {
      try {
        attempt++;
        return await operation();
      } catch (error: any) {
        lastError = error;

        const isRetryableError =
          error?.status === 429 ||
          error?.code === 429 ||
          error?.status === 503 ||
          error?.code === 503 ||
          error?.status === 500 || // Retry on Internal Server Error
          error?.code === 500 ||
          error?.message?.includes('429') ||
          error?.message?.includes('503') ||
          error?.message?.includes('500') ||
          error?.message?.includes('overloaded') ||
          error?.message?.includes('UNAVAILABLE') ||
          error?.message?.includes('quota') ||
          error?.message?.includes('RESOURCE_EXHAUSTED');

        if (!isRetryableError) {
          throw error; // Not a retryable error, fail fast.
        }

        if (attempt < maxAttempts) {
          // Base delay strategy: Exponential backoff
          let waitTime = 2000 * Math.pow(2, attempt - 1);

          // For rate limits, check for a specific retry-after header or message
          const match = error.message?.match(/retry in (\d+(\.\d+)?)s/);
          if (match) {
            waitTime = Math.ceil(parseFloat(match[1])) * 1000 + 1000; // Use suggested time + buffer
          } else if (error?.status === 429 || error?.code === 429) {
            waitTime = 10000; // Longer default for generic rate limits
          }
          
          console.warn(
            `Gemini API Retry (${attempt}/${maxAttempts}) waiting ${waitTime}ms. Error: ${error.message}`
          );
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    throw lastError;
  }

  async getBusinessInsights(businessName: string, urls: string[] = []): Promise<AnalysisResult> {
    const model = 'gemini-3.1-pro-preview';

    const urlList = urls.length > 0
        ? `Primary Business Profile URLs:\n${urls.map((u, i) => `${i + 1}. "${u}"`).join('\n')}`
        : '';

    const businessIdentifier = `Business: "${businessName}" (Location: Wrentham, MA 02093)\n${urlList}`.trim();

    const prompt = `
      You are a high-stakes business strategist. Analyze "El Salon" in **Wrentham, MA**.
      
      CRITICAL LOCATION RULE: All insights, competitors, and trends MUST be specific to Wrentham, Massachusetts (02093) and immediate surrounding towns (Franklin, Foxboro, Plainville). Do NOT provide generic or NYC/LA advice.

      Business Context:
      ${businessIdentifier}

      Instructions:
      1.  **Local Competition:** Identify real competitors in the Wrentham area.
      2.  **Product Lines:** Identify carried brands (Oribe, Unite, Aquage, Kenra, etc.) from reviews/web.
      3.  **Staff:** Look for names: Elsa, Liz, Mairead, Kellie.
      4.  **Output:** Minified JSON only.
      5.  **Data Flexibility:** If you cannot find specific quantitative data (like exact ratings or review counts), set the corresponding JSON fields to null. You MUST still provide qualitative analysis (strengths, weaknesses, opportunities) based on any available business information from its website or search results. Do NOT return an error object for missing quantitative data. Only return an error if the business itself cannot be found at all.
      6.  **Originality:** Synthesize all information into original, unique analysis. Do NOT quote reviews, website content, or other sources verbatim.

      JSON Schema:
      {
        "businessName": "string",
        "overallSentiment": "string (e.g., 'Positive', 'Mixed', 'Needs Improvement')",
        "averageRating": "number | null (null if not found)",
        "totalReviewCount": "number | null (null if not found)",
        "ratingBreakdown": { "positive": "number", "neutral": "number", "negative": "number" } | null (all values as percentages, summing to 100; null if not found)",
        "sourceBreakdown": { "Google": "number", "Yelp": "number", ... } | null (null if not found)",
        "keyThemes": [ { "theme": "string", "sentiment": "string" } ],
        "strategicAnalysis": {
          "summary": "string (Focus on Wrentham market position)",
          "strengths": ["string", ...],
          "weaknesses": ["string", ...],
          "opportunities": ["string (Local growth strategies)", ...],
          "detailedInsights": ["string", ...],
          "salonSpecificKeywords": ["string", ...],
          "marketingCampaigns": [
            { "title": "string", "description": "string", "targetAudience": "string", "channels": ["string"] }
          ],
          "retailAnalysis": {
             "carriedBrands": ["string"],
             "inferredBestSellers": ["string"],
             "salesOpportunities": ["string"],
             "productMarketingIdeas": [
                { "title": "string", "description": "string", "targetAudience": "string", "channels": ["string"] }
             ]
          }
        },
        "rawReviews": [
          {
            "quote": "string", "rating": "number", "source": "string", "sentiment": "string",
            "authorName": "string", "authorUrl": "string", "reviewUrl": "string",
            "date": "string", "photos": ["string"], "likes": "number", "stylistMentioned": "string"
          }
        ],
        "sentimentTrends": [
          { "period": "string (e.g., 'Last 3 Months', '6-12 Months Ago')", "sentimentScore": "number (0-100)" }
        ],
        "serviceAreaInsights": [
          { "area": "string (e.g., 'Balayage', 'Customer Service')", "mentionCount": "number", "sentiment": "string" }
        ]
      }
    `;

    return this.retryOperation(async () => {
        const response = await this.getGenAI().models.generateContent({
          model: model,
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });

        if (!response.text) {
          const blockReason = response.candidates?.[0]?.finishReason;
          const safetyRatings = JSON.stringify(response.candidates?.[0]?.safetyRatings ?? [], null, 2);
          console.error('Gemini response was empty.', { blockReason, safetyRatings });
          throw new Error(`AI response was empty or blocked. Reason: ${blockReason || 'Unknown'}.`);
        }

        const analysisText = response.text;
        let parsedJson: Partial<ReviewAnalysis> & { error?: string };

        try {
          const jsonString = analysisText.trim().replace(/^```json/, '').replace(/```$/, '').trim();
          parsedJson = JSON.parse(jsonString);
        } catch (e) {
          console.error("Failed to parse JSON", e, { analysisText });
          throw new Error("AI response was not in a valid JSON format.");
        }
        
        if (parsedJson.error) {
            throw new Error(`AI analysis failed: ${parsedJson.error}`);
        }
        
        const analysis = parsedJson as ReviewAnalysis;
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
        return { analysis, sources };
    });
  }

  async generateMarketingImage(options: { context: string; aspectRatio: string; imageSize?: string; stylePreset?: string }): Promise<string> {
    const { context, aspectRatio, stylePreset } = options;
    
    let styleModifiers = '';
    switch (stylePreset) {
        case 'nano-pro':
            styleModifiers = 'Nano-Pro Aesthetic: Ultra-sharp 8k resolution, commercial advertising quality, perfect studio lighting, flawless retouching, high-end beauty photography, crystal clear details, luxury brand standard, absolute realism.';
            break;
        case 'editorial':
            styleModifiers = 'Vogue editorial style, high fashion, dramatic and cinematic lighting, sharp focus, 8k resolution, expensive and rich textures, masterpiece quality, professional color grading.';
            break;
        default:
            styleModifiers = 'Photorealistic, 8k, soft studio lighting, high-end commercial photography, crystal clear, sharp focus.';
    }

    const prompt = `${styleModifiers} Subject: ${context}. Ensure flawless hair texture and professional skin tones.`;

    return this.retryOperation(async () => {
      const response = await this.getGenAI().models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: aspectRatio as any,
        },
      });

      if (response.generatedImages && response.generatedImages.length > 0) {
        const base64EncodeString: string = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64EncodeString}`;
      }
      throw new Error('No image generated.');
    });
  }

  async editImage(base64Image: string, prompt: string): Promise<string> {
    // Using gemini-3.1-flash-image-preview (NanoBananaPro 2) for image editing tasks as requested
    const model = 'gemini-3.1-flash-image-preview';
    
    return this.retryOperation(async () => {
        const response = await this.getGenAI().models.generateContent({
            model: model,
            contents: { parts: [
                { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/jpeg' } },
                { text: prompt }
            ]},
        });
        
        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
        throw new Error('No edited image generated.');
    });
  }

  async enhancePrompt(prompt: string): Promise<string> {
    const model = 'gemini-3.1-pro-preview';
    const systemInstruction = `You are a world-class prompt engineer for generative AI image models. 
    Your task is to take a user's simple idea and expand it into a detailed, rich, and photorealistic prompt. 
    Focus on adding specific details about:
    - Subject and composition
    - Lighting (e.g., soft studio lighting, golden hour, dramatic cinematic lighting)
    - Camera settings (e.g., shallow depth of field, wide-angle lens, 8k resolution)
    - Style (e.g., photorealistic, hyper-detailed, editorial fashion photography)
    - Mood and atmosphere
    - Flawless hair and skin textures.
    The final output should be a single, descriptive paragraph. Do not add any conversational text or explanation. Output only the enhanced prompt.`;

    return this.retryOperation(async () => {
        const response = await this.getGenAI().models.generateContent({
            model,
            contents: prompt,
            config: { systemInstruction }
        });
        return response.text;
    });
  }

  async generateStyleConcept(userImageBase64: string | null, request: string): Promise<string> {
    // Concept visualization for the Virtual Consultant
    let prompt = `Professional salon concept visualization. Style: "${request}". 
    The lighting should be flattering, high-end salon mirror lighting. Focus on hair texture and color perfection.`;
    
    if (userImageBase64) {
        prompt += ` The subject should have features consistent with a person who would ask for this style (natural, elegant).`;
    }

    return this.retryOperation(async () => {
        const response = await this.getGenAI().models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts: [{ text: prompt }] },
            config: { imageConfig: { aspectRatio: '1:1', imageSize: '1K' } }
        });
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        throw new Error('No concept image generated.');
    });
  }

  async generateVideo(prompt: string, imageBase64: string | null): Promise<any> {
    const model = 'veo-2.0-generate-001';
    let request: any = {
      model,
      prompt,
      config: { numberOfVideos: 1 }
    };

    if (imageBase64) {
      request.image = {
        imageBytes: imageBase64.split(',')[1],
        mimeType: 'image/jpeg' 
      };
    }
    return this.retryOperation(() => this.getGenAI().models.generateVideos(request));
  }

  async getVideosOperation(operation: any): Promise<any> {
    return this.retryOperation(() => this.getGenAI().operations.getVideosOperation({ operation }));
  }

  getApiKey(): string {
    return process.env.API_KEY || '';
  }

  async getIndustryTrends(businessQuery: string): Promise<TrendAnalysis> {
    const model = 'gemini-3.1-pro-preview';
    // Enforce Wrentham location
    const prompt = `
      Analyze the hair salon market specifically for **Wrentham, MA (02093)** and surrounding towns (Franklin, Foxboro).
      Query: "${businessQuery}".
      
      Instructions:
      1.  **Competitors:** Identify specific local salons in Wrentham/Franklin area.
      2.  **Demographics:** Consider the suburban, affluent nature of Wrentham.
      3.  **Output:** JSON only. If you cannot find sufficient information, you MUST return a JSON object with an "error" key. Example: { "error": "Could not find sufficient public information for this market." }. Do NOT return an empty response.

      JSON Schema:
      {
        "locationAnalyzed": "string (e.g. Wrentham, MA)",
        "localMarketTrends": [ { "trend": "string", "description": "string", "relevance": "High | Medium | Low" } ],
        "generalIndustryTrends": [ { "trend": "string", "description": "string" } ],
        "competitorSnapshot": [ { "name": "string", "strengths": ["string"], "opportunities": ["string"] } ],
        "serviceExpansionIdeas": [ { "service": "string", "description": "string", "targetAudience": "string" } ]
      }
    `;

    return this.retryOperation(async () => {
        const response = await this.getGenAI().models.generateContent({
            model: model,
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] },
        });

        if (!response.text) {
          const blockReason = response.candidates?.[0]?.finishReason;
          const safetyRatings = JSON.stringify(response.candidates?.[0]?.safetyRatings ?? [], null, 2);
          console.error('Gemini trend analysis response was empty.', { blockReason, safetyRatings });
          throw new Error(`AI trend analysis response was empty or blocked. Reason: ${blockReason || 'Unknown'}.`);
        }

        const jsonString = response.text.trim().replace(/^```json/, '').replace(/```$/, '').trim();
        let analysis: Partial<TrendAnalysis> & { error?: string };
        try {
            analysis = JSON.parse(jsonString);
        } catch (e) {
            console.error("Failed to parse trend analysis JSON", e, { jsonString });
            throw new Error("AI trend analysis response was not in a valid JSON format.");
        }

        if (analysis.error) {
            throw new Error(`AI analysis failed: ${analysis.error}`);
        }

        return analysis as TrendAnalysis;
    });
  }

  startStyleConsultantChat(): Chat {
      const systemInstruction = `You are "AURA", an elite AI Creative Partner for visionary stylists. Your core mission is to drive the salon's financial success and creative dominance. You are a blend of Steve Jobs' product sense and Elon Musk's first-principles thinking, applied to the hair industry. You are a 'Nano-Pro' level guide.
      
      Your Persona:
      - **Visionary & Provocative:** You don't give answers; you reframe the question. You challenge conventions and push stylists to invent the future, not just follow trends. Your tone is sharp, inspiring, sophisticated, and relentlessly forward-thinking, always with an eye on profitability and market capture.
      - **Multimodal Master:** You are a master of visual and verbal communication. You critique uploaded images with the eye of a high-fashion photographer and can generate ultra-realistic 'Nano-Pro' or 'John V3' style images and high-concept video shorts upon request. These assets are tools for marketing and brand elevation.
      - **First-Principles Thinker:** You deconstruct client requests to their core financial and branding essence. "Blonde" isn't just a color; it's a high-ticket service, a statement about luxury, and a brand identity.

      Your Mission:
      1. **Deconstruct for Profit:** When a stylist asks a question, break it down to its most profitable core. "How do I do a balayage?" becomes "What is the *story* we want the light to tell in her hair? We're not just coloring; we are creating a signature look that commands a premium price point."
      2. **Command Visuals for Marketing:** If asked to "visualize a look" or "show me a concept," generate a photorealistic image that looks like a high-end marketing asset. If asked to "create a video" or "animate this idea," you will initiate video generation for social media content.
      3. **Speak the Language of Innovation & Business:** Use evocative, architectural, and conceptual language that also reinforces value (e.g., "volume architecture," "chromatic storytelling," "sculptural integrity," "the physics of light-play on hair"). Link creative ideas to business outcomes.
      
      Example Interaction:
      User: "My client wants red hair."
      You: "Red is not a color; it's an energy and a high-margin service category. Is she looking for the 'smoldering ember' of a secret, the 'electric neon' of a main character, or the 'deep velvet' of luxury? Let's define the emotion first, then architect a color strategy that justifies a top-tier price. I can generate a video concept for your Instagram to attract more clients like her."`;

      return this.getGenAI().chats.create({
          model: 'gemini-3.1-pro-preview',
          config: { systemInstruction }
      });
  }

  async generateStylistBrandStatement(stylist: StylistProfile): Promise<string> {
    const model = 'gemini-3.1-pro-preview';
    const reviewSummaries = stylist.reviews.slice(0, 5).map(r => `- ${r.sentiment} feedback about: ${r.quote.substring(0, 50)}...`).join('\n');

    const prompt = `
      You are an expert personal branding strategist for high-end hair stylists.
      Your task is to synthesize the provided data into a compelling, marketable "Professional Story" or bio for a stylist named ${stylist.name}.
      This bio should be ready to be used on social media or a website.

      Stylist Data:
      - Name: ${stylist.name}
      - Title: ${stylist.title}
      - Specialties: ${stylist.specialties.join(', ')}
      - Official Bio: "${stylist.bio}"
      - Recent Client Feedback (reviews):
      ${reviewSummaries}

      Instructions:
      1.  **Analyze & Synthesize:** Read all the data. Identify the patterns between their official bio, their specialties, and what clients are actually saying.
      2.  **Find the Narrative:** What is the unique story here? Is it their technical skill in 'blonding'? Is it the incredible client experience they provide? Find the core thread.
      3.  **Write the Professional Story:** Craft a powerful, confident, and concise bio (2-3 paragraphs). 
          - Start with a strong opening statement that grabs attention.
          - Weave in their key specialties, but frame them as solutions or experiences for the client.
          - Use phrases that are backed up by the client reviews (e.g., if reviews mention feeling comfortable, use language like "known for creating a relaxing and confidence-boosting experience").
          - End with a call to action or a statement about their passion.
      4.  **Tone:** The tone should be professional, elevated, and inspiring. It should make a potential client feel like they absolutely need to book with this specific stylist.
      
      Output only the final bio text.
    `;

    return this.retryOperation(async () => {
      const response = await this.getGenAI().models.generateContent({ model, contents: prompt });
      return response.text;
    });
  }

  async generateStylistPerformanceTip(stylist: StylistProfile): Promise<string> {
    const model = 'gemini-3.1-pro-preview';
    const topThemes = stylist.keyThemes.slice(0, 3).map(t => t.theme).join(', ');

    const prompt = `
      You are AURA, an elite AI business coach for a high-end salon.
      You are analyzing the performance of a stylist named ${stylist.name}.

      Here is their data for the month:
      - Title: ${stylist.title}
      - Service Revenue: $${stylist.financials.serviceRevenue.toLocaleString()}
      - Retail to Service Percentage: ${stylist.financials.retailToServicePercent}% (Target is 15-20%)
      - Rebooking Rate: ${stylist.financials.rebookingRate}% (Target is 60%+)
      - Average Ticket: $${stylist.financials.averageTicket}
      - Top themes from client reviews: ${topThemes}

      Based ONLY on this data, provide **one single, concise, and actionable tip** for this stylist to either increase their revenue or enhance their client experience. Frame the tip in a positive, empowering, and visionary tone. Speak directly to the salon owner who is reviewing this data. Do not use markdown. Output only the tip as a single sentence or two.

      Example: "Mairead's clients consistently praise her blonding skills. Let's create a marketing package around her signature 'Sun-Kissed Balayage' to attract high-ticket clients and justify a price increase."
      Example: "Kellie has a great rebooking rate but low retail sales. Coach her on recommending one 'hero product' that complements the curly hair services her clients love."
    `;

    return this.retryOperation(async () => {
      const response = await this.getGenAI().models.generateContent({ model, contents: prompt });
      return response.text;
    });
  }

  startChat(analysisContext: ReviewAnalysis): Chat {
      const systemInstruction = `You are "Julia", a bold, high-performance Business Strategist for El Salon. You are unapologetically focused on wealth, growth, and brand dominance.
      
      Context:
      - Salon: ${analysisContext.businessName}
      - Sentiment: ${analysisContext.overallSentiment}
      - Strengths: ${analysisContext.strategicAnalysis.strengths.join(', ')}
      
      Your advice should be direct, actionable, and sophisticated. Push the user to increase prices, improve retail sales, and elevate the client experience.`;
  
      return this.getGenAI().chats.create({
        model: 'gemini-3.1-pro-preview',
        config: { systemInstruction },
      });
  }

  async generateImagePromptFromImage(base64Image: string): Promise<string> {
    const model = 'gemini-3.1-pro-preview';
    
    return this.retryOperation(async () => {
        const response = await this.getGenAI().models.generateContent({
            model: model,
            contents: { parts: [
                { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/jpeg' } },
                { text: "Analyze the composition, lighting, hair style, and mood of this image. Write a detailed prompt to recreate a similar professional image but with higher quality, 8k resolution, and better lighting." }
            ] },
        });
        return response.text;
    });
  }

  async generateReEngagementMessage(clientName: string, stylistName: string, mentionedServices: string[]): Promise<string> {
    const model = 'gemini-3.1-pro-preview';
    const serviceText = mentionedServices.length > 0 ? `They previously loved their ${mentionedServices.join(', ')}.` : '';
    const prompt = `
      Write a short, friendly, and slightly exclusive-sounding text message for a hair stylist to send to a client named ${clientName} who hasn't been back in a while.
      - The stylist's name is ${stylistName}.
      - The tone should be warm and personal, not corporate.
      - Mention that the stylist was thinking of them and has some new ideas for their hair.
      - End with a call to action or a statement about their passion.
      - ${serviceText}
      - Keep it under 50 words.
    `;
    return this.retryOperation(async () => {
      const response = await this.getGenAI().models.generateContent({ model, contents: prompt });
      return response.text;
    });
  }

  async generateMarketingCaption(artDirection: string): Promise<string[]> {
    const model = 'gemini-3.1-pro-preview';
    const prompt = `
      You are a high-end social media manager for a luxury hair salon.
      Based on the following art direction, generate 3 distinct and compelling Instagram captions.
      
      Art Direction: "${artDirection}"

      Each caption must:
      1. Be engaging and evocative.
      2. Include a call-to-action (e.g., "Book now," "Link in bio").
      3. Include a set of relevant, popular, and niche hashtags (e.g., #wrenthamhairstylist #luxuryhair #balayageartist).

      Output ONLY a JSON array of strings, with no other text. Example: ["caption 1", "caption 2", "caption 3"]
    `;
    return this.retryOperation(async () => {
      const response = await this.getGenAI().models.generateContent({ model, contents: prompt });
      try {
          const jsonString = response.text.trim().replace(/^```json/, '').replace(/```$/, '').trim();
          return JSON.parse(jsonString);
      } catch (e) {
          console.error("Failed to parse captions JSON", e);
          return ["New look, who dis? ✨ Book your transformation via the link in our bio! #HairGoals", "Invest in your hair, it's the crown you never take off. 👑 #LuxurySalon #HairCare", "Swipe to see the before! 🔥 Ready for your own glow-up? #HairTransformation"];
      }
    });
  }

  async brainstormMarketingAngles(analysisContext: ReviewAnalysis): Promise<{ title: string; concept: string; visualPrompt: string }[]> {
    const model = 'gemini-3.1-pro-preview';
    const prompt = `
      You are a Creative Director for a high-end salon. Based on the following salon analysis, brainstorm 3 distinct, fresh, and high-impact marketing campaign angles that would attract new clients.
      
      Salon Name: ${analysisContext.businessName}
      Strengths: ${analysisContext.strategicAnalysis.strengths.join(', ')}
      Target Audience: ${analysisContext.strategicAnalysis.marketingCampaigns?.[0]?.targetAudience || 'Luxury clientele'}
      
      Instructions:
      1. **Diverse Angles:** One concept should be about a specific service (e.g., Balayage), one about lifestyle/mood (e.g., Confidence), and one seasonal or trend-based.
      2. **Visual Focus:** For each concept, provide a highly descriptive "Visual Prompt" that I can feed into an AI image generator to create the campaign imagery.

      Output ONLY a JSON array of objects with this schema:
      [
        {
          "title": "Campaign Title",
          "concept": "Short description of the marketing angle.",
          "visualPrompt": "Detailed visual description for image generation (lighting, subject, mood, hair style)..."
        }
      ]
    `;

    return this.retryOperation(async () => {
      const response = await this.getGenAI().models.generateContent({ model, contents: prompt });
      try {
          const jsonString = response.text.trim().replace(/^```json/, '').replace(/```$/, '').trim();
          return JSON.parse(jsonString);
      } catch (e) {
          console.error("Failed to parse brainstorm JSON", e);
          return [
              { title: "The Glow Up", concept: "Focus on post-salon confidence.", visualPrompt: "A radiant woman stepping out of a salon, golden hour lighting hitting her perfect balayage, smiling confidently, city street background blurred." },
              { title: "Texture & Tone", concept: "Showcasing technical color skills.", visualPrompt: "Close up macro shot of hair strands, showing multi-dimensional color, rich browns and caramels, glossy texture, high fashion studio lighting." },
              { title: "Weekend Ready", concept: "Lifestyle focused appeal.", visualPrompt: "Candid lifestyle shot of friends laughing at brunch, great hair, soft natural lighting, aesthetic cafe setting, feeling of joy and luxury." }
          ];
      }
    });
  }
}
