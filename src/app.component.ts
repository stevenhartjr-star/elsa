import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from './services/gemini.service';
import { type AnalysisResult } from './models/analysis.model';
import { WelcomeComponent } from './components/welcome/welcome.component';
import { ShellComponent } from './components/shell/shell.component';
import { TutorialComponent } from './components/tutorial/tutorial.component';

type Screen = 'welcome' | 'loading' | 'dashboard' | 'error';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, WelcomeComponent, ShellComponent, TutorialComponent],
})
export class AppComponent {
  screen = signal<Screen>('welcome');
  analysisResult = signal<AnalysisResult | null>(null);
  error = signal<string | null>(null);
  loadingMessage = signal<string>('Initializing AI Core...');
  showTutorial = signal<boolean>(false);

  private readonly geminiService = inject(GeminiService);
  private loadingInterval: any;
  private readonly loadingMessages = [
    'Aggregating multi-platform review intelligence...',
    'Executing neural sentiment analysis...',
    'Decoding client desires into service keywords...',
    'Mapping your competitive market landscape...',
    'Quantifying stylist impact on revenue & retention...',
    'Architecting data-driven marketing blueprints...',
    'Identifying emergent style trends in your zip code...',
    'Synthesizing insights into an actionable empire plan...',
    'Finalizing your strategic unfair advantage...',
    'Pro Tip: Check out the Tutorial to master your marketing!',
    'Pro Tip: Learn how to use Beauty AI for creative marketing in our new Tutorial.'
  ];

  async handleSearch(searchData: { query: string; urls: string[] }) {
    if (!searchData.query) return;

    // Check for API key before proceeding
    if (!(await (window as any).aistudio?.hasSelectedApiKey())) {
      try {
        await (window as any).aistudio?.openSelectKey();
      } catch (e) {
        console.error("Failed to open API key selection dialog", e);
        this.error.set("Please select an API key to continue.");
        this.screen.set('error');
        return;
      }
    }

    this.screen.set('loading');
    this.analysisResult.set(null);
    this.error.set(null);

    let i = 0;
    this.loadingMessage.set(this.loadingMessages[i]);
    this.loadingInterval = setInterval(() => {
      i = (i + 1) % this.loadingMessages.length;
      this.loadingMessage.set(this.loadingMessages[i]);
    }, 1500);

    try {
      const result = await this.geminiService.getBusinessInsights(searchData.query, searchData.urls);
      this.analysisResult.set(result);
      this.screen.set('dashboard');
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      this.error.set(`Failed to fetch analysis. ${errorMessage}`);
      this.screen.set('error');
    } finally {
      clearInterval(this.loadingInterval);
    }
  }

  handleBackToSearch() {
    this.screen.set('welcome');
    this.analysisResult.set(null);
    this.error.set(null);
    clearInterval(this.loadingInterval);
  }

  async openApiKeyDialog() {
    try {
      await (window as any).aistudio?.openSelectKey();
      this.handleBackToSearch(); // Go back to welcome screen after selection
    } catch (e) {
      console.error("Failed to open API key selection dialog", e);
    }
  }
}