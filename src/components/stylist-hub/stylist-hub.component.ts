
import { Component, ChangeDetectionStrategy, input, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from '../../services/gemini.service';
import { SalonDataService } from '../../services/salon-data.service';
import { 
    type ReviewAnalysis, 
    type StylistProfile, 
    type RawReview, 
    type Appointment,
    type AtRiskClient
} from '../../models/analysis.model';

type ActiveHubTab = 'performance' | 'retention' | 'schedule' | 'brand' | 'reviews';

@Component({
  selector: 'app-stylist-hub',
  templateUrl: './stylist-hub.component.html',
  imports: [CommonModule],
})
export class StylistHubComponent implements OnInit {
  analysis = input.required<ReviewAnalysis>();

  private readonly geminiService = inject(GeminiService);
  private readonly salonDataService = inject(SalonDataService);

  // State
  stylistProfiles = signal<StylistProfile[]>([]);
  selectedStylist = signal<StylistProfile | null>(null);
  activeTab = signal<ActiveHubTab>('performance');

  // AI-generated content cache & loading states
  isGeneratingTip = signal<boolean>(false);
  tipCache = signal<Map<string, string>>(new Map());

  isGeneratingBrandStatement = signal<boolean>(false);
  brandStatementCache = signal<Map<string, string>>(new Map());

  isGeneratingMessage = signal<boolean>(false);
  retentionMessage = signal<string>('');

  // UI state
  showCancellationModal = signal<boolean>(false);
  cancellationPost = signal<string>('');

  ngOnInit() {
    this.stylistProfiles.set(this.buildStylistProfiles());
  }
  
  // Computed values based on selected stylist
  atRiskClients = computed<AtRiskClient[]>(() => {
    const stylist = this.selectedStylist();
    if (!stylist) return [];

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const clientHistory = this.salonDataService.getMockClientHistory(stylist.name);
    return clientHistory
        .filter(client => client.lastVisitDate < ninetyDaysAgo)
        .slice(0, 3)
        .map(client => ({
            name: client.name,
            lastVisitDate: client.lastVisitDate.toLocaleDateString(),
            mentionedServices: []
        }));
  });

  appointments = computed<Appointment[]>(() => {
    const stylist = this.selectedStylist();
    if (!stylist) return [];
    return this.salonDataService.getMockAppointments(stylist.name);
  });
  
  // Methods
  selectStylist(stylist: StylistProfile | null) {
    this.selectedStylist.set(stylist);
    if (stylist) {
        this.activeTab.set('performance');
        this.generatePerformanceTip(stylist);
        this.generateBrandStatement(stylist);
    }
  }

  setActiveTab(tab: ActiveHubTab) {
    this.activeTab.set(tab);
  }

  async generatePerformanceTip(stylist: StylistProfile) {
      if (this.tipCache().has(stylist.id) || this.isGeneratingTip()) return;
      this.isGeneratingTip.set(true);
      try {
          const tip = await this.geminiService.generateStylistPerformanceTip(stylist);
          this.tipCache.update(cache => cache.set(stylist.id, tip));
      } catch (e) {
          console.error('Failed to generate performance tip', e);
      } finally {
          this.isGeneratingTip.set(false);
      }
  }

  async generateBrandStatement(stylist: StylistProfile) {
      if (this.brandStatementCache().has(stylist.id) || this.isGeneratingBrandStatement()) return;
      this.isGeneratingBrandStatement.set(true);
      try {
          const statement = await this.geminiService.generateStylistBrandStatement(stylist);
          this.brandStatementCache.update(cache => cache.set(stylist.id, statement));
      } catch (e) {
          console.error('Failed to generate brand statement', e);
          this.brandStatementCache.update(cache => cache.set(stylist.id, "Could not generate statement."));
      } finally {
          this.isGeneratingBrandStatement.set(false);
      }
  }

  async generateRetentionMessage(client: AtRiskClient) {
      const stylist = this.selectedStylist();
      if (!stylist || this.isGeneratingMessage()) return;
      
      this.isGeneratingMessage.set(true);
      this.retentionMessage.set('');
      try {
          const message = await this.geminiService.generateReEngagementMessage(client.name, stylist.name, client.mentionedServices);
          this.retentionMessage.set(message);
      } catch (e) {
          console.error("Failed to generate retention message", e);
          this.retentionMessage.set("Sorry, couldn't generate a message right now.");
      } finally {
          this.isGeneratingMessage.set(false);
      }
  }

  simulateCancellation(appointment: Appointment) {
      const stylistName = this.selectedStylist()?.name.split(' ')[0];
      const post = `Last minute opening! An appointment for a ${appointment.service.toLowerCase()} just became available today at ${appointment.time} with ${stylistName}. Be the first to claim it! Link in bio to book. #wrenthamsalon #lastminuteappointment #bostonstylist`;
      this.cancellationPost.set(post);
      this.showCancellationModal.set(true);
  }

  copyMessage(message: string) {
      navigator.clipboard.writeText(message).catch(err => console.error('Failed to copy text: ', err));
  }

  private buildStylistProfiles(): StylistProfile[] {
    const allReviews = this.analysis().rawReviews;
    const basicProfiles = this.salonDataService.getStylistBasics();
    
    console.log('Total reviews available:', allReviews.length);
    if (allReviews.length > 0) {
        console.log('Sample review:', allReviews[0]);
    }

    return basicProfiles.map(p => {
        const stylistReviews = allReviews.filter(r => {
            const mentioned = r.stylistMentioned?.toLowerCase() || '';
            const quote = r.quote.toLowerCase();
            const stylistName = p.name.toLowerCase();
            const firstName = stylistName.split(' ')[0].toLowerCase();
            
            // Try matching first name, full name, and last name if available
            const match = mentioned.includes(firstName) || 
                          quote.includes(firstName) ||
                          mentioned.includes(stylistName) ||
                          quote.includes(stylistName);
            
            if (match) {
                console.log(`Matched review for ${p.name}:`, r.quote.substring(0, 50) + '...');
            } else {
                // Log some non-matches to understand why
                if (Math.random() < 0.1) { // Log 10% of non-matches
                    console.log(`No match for ${p.name} in review:`, r.quote.substring(0, 50) + '...', 'Mentioned:', mentioned);
                }
            }
            return match;
        });
        
        console.log(`Reviews found for ${p.name}:`, stylistReviews.length);
        
        const ratings = stylistReviews.map(r => r.rating).filter((r): r is number => r !== null);
        const avgRating = ratings.length > 0 ? ratings.reduce((sum, val) => sum + val, 0) / ratings.length : null;

        const themeCounts = new Map<string, number>();
        this.analysis().keyThemes.forEach(themeObj => {
            const stylistMentionsTheme = stylistReviews.some(r => r.quote.toLowerCase().includes(themeObj.theme.toLowerCase().split(' ')[0]));
            if (stylistMentionsTheme) {
                 themeCounts.set(themeObj.theme, (themeCounts.get(themeObj.theme) || 0) + 1);
            }
        });

        const keyThemes = Array.from(themeCounts.entries()).map(([theme, count]) => ({ theme, count })).sort((a,b) => b.count - a.count);

        return {
            ...p,
            reviews: stylistReviews,
            positiveMentions: stylistReviews.filter(r => r.sentiment === 'Positive').length,
            negativeMentions: stylistReviews.filter(r => r.sentiment === 'Negative').length,
            neutralMentions: stylistReviews.filter(r => r.sentiment === 'Neutral').length,
            averageClientRating: avgRating,
            keyThemes: keyThemes,
            financials: this.salonDataService.getMockFinancials(p.level),
        };
    });
  }
}
