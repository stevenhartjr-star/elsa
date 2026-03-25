

export interface RawReview {
  quote: string;
  rating: number | null;
  source: string;
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  authorName?: string;
  authorUrl?: string;
  reviewUrl?: string;
  /** Date formatted as YYY-MM-DD */
  date?: string;
  photos?: string[];
  likes?: number;
  stylistMentioned?: string | null;
}

export interface MarketingCampaign {
  title: string;
  description: string;
  targetAudience: string;
  channels: string[];
}

export interface RetailAnalysis {
  carriedBrands: string[];
  inferredBestSellers: string[];
  salesOpportunities: string[];
  productMarketingIdeas: MarketingCampaign[];
}

export interface StrategicAnalysis {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  detailedInsights?: string[];
  marketingCampaigns?: MarketingCampaign[];
  salonSpecificKeywords?: string[];
  retailAnalysis?: RetailAnalysis;
}

export interface ReviewAnalysis {
  businessName: string;
  overallSentiment: string;
  averageRating: number | null;
  totalReviewCount: number | null;
  ratingBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  } | null;
  sourceBreakdown: { [source: string]: number } | null;
  keyThemes: {
    theme: string;
    sentiment: string;
  }[];
  strategicAnalysis: StrategicAnalysis;
  rawReviews: RawReview[];
  sentimentTrends?: { period: string; sentimentScore: number }[];
  serviceAreaInsights?: { area: string; mentionCount: number; sentiment: string }[];
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface AnalysisResult {
  analysis: ReviewAnalysis;
  sources: GroundingChunk[];
}

// Models for TrendSpotter Feature
export interface LocalTrend {
  trend: string;
  description: string;
  relevance: 'High' | 'Medium' | 'Low';
}

export interface IndustryTrend {
  trend: string;
  description: string;
}

export interface CompetitorInfo {
  name: string;
  strengths: string[];
  opportunities: string[];
}

export interface ServiceIdea {
  service: string;
  description: string;
  targetAudience: string;
  // Included directly in the TrendSpotter logic
}

export interface TrendAnalysis {
  locationAnalyzed: string;
  localMarketTrends: LocalTrend[];
  generalIndustryTrends: IndustryTrend[];
  competitorSnapshot: CompetitorInfo[];
  serviceExpansionIdeas: ServiceIdea[];
}

// Models for Chatbot/Consultant Feature
export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  html?: string;
  image?: string; // For generated concept images
  
  // Video generation properties
  isVideo?: boolean;
  videoGenerationStatus?: string;
  videoUrl?: string;
}

// Models for Stylist Hub Feature
export interface StylistFinancials {
    serviceRevenue: number;
    retailRevenue: number;
    retailToServicePercent: number; // Target 15-20%
    rebookingRate: number; // Target 60%+
    averageTicket: number;
    clientsPerMonth: number;
    newClients: number;
}

export interface StylistMeetingNote {
    id: number;
    date: string;
    goals: string;
    retailGoals: string; 
    strengths: string;
    growthAreas: string;
    actionItems: string;
}

export interface StylistProfile {
    id: string; // e.g., 'elsa-hart'
    name: string;
    level: string; // e.g., 'Level 3'
    title: string;
    imageUrl: string;
    bio: string;
    specialties: string[];
    instagramUrl: string;
    bookingUrl: string;
    
    // AI Derived Data
    reviews: RawReview[];
    positiveMentions: number;
    negativeMentions: number;
    neutralMentions: number;
    keyThemes: { theme: string, count: number }[];
    averageClientRating: number | null;
    
    // Financials (Mocked/Inferred)
    financials: StylistFinancials;
}

export interface Appointment {
    time: string; // e.g., "9:00 AM"
    duration: number; // in minutes
    clientName: string;
    service: string;
    isCancelled?: boolean;
}

export interface AtRiskClient {
    name: string;
    lastVisitDate: string | null;
    mentionedServices: string[];
}

export interface ClientHistory {
    name: string;
    lastVisitDate: Date;
}

// Models for Marketing Studio
export interface GeneratedImage {
    id: number;
    url: string;
    prompt: string;
}

// Models for Clients
export interface Client {
  name: string;
  reviews: RawReview[];
  reviewCount: number;
  lastReviewDate: string | null;
  averageRating: number | null;
  source: string;
}