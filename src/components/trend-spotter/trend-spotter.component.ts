import { Component, ChangeDetectionStrategy, input, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { type TrendAnalysis } from '../../models/analysis.model';
import { GeminiService } from '../../services/gemini.service';

@Component({
  selector: 'app-trend-spotter',
  templateUrl: './trend-spotter.component.html',
  imports: [CommonModule],
})
export class TrendSpotterComponent implements OnInit {
  businessName = input.required<string>();

  analysis = signal<TrendAnalysis | null>(null);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);
  
  private readonly geminiService = inject(GeminiService);

  ngOnInit(): void {
    this.fetchTrendAnalysis();
  }

  async fetchTrendAnalysis() {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const result = await this.geminiService.getIndustryTrends(this.businessName());
      this.analysis.set(result);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      this.error.set(`Failed to fetch trend analysis. ${errorMessage}`);
    } finally {
      this.isLoading.set(false);
    }
  }
}
