import { Component, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tutorial',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" (click)="close.emit()">
      <div class="bg-zinc-900 border border-white/10 max-w-4xl w-full rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="p-8 border-b border-white/10 flex justify-between items-center bg-zinc-950">
          <div>
            <h2 class="text-3xl font-display font-bold text-white tracking-tight">Beauty AI Masterclass</h2>
            <p class="text-zinc-400 mt-2 font-medium">Unlock the full potential of your salon's intelligence platform.</p>
          </div>
          <button (click)="close.emit()" class="text-zinc-500 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Tabs -->
        <div class="flex border-b border-white/10 bg-zinc-900">
          <button (click)="activeTab.set('owner')" 
                  [class]="activeTab() === 'owner' ? 'border-b-2 border-purple-500 text-purple-400 bg-zinc-800' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'" 
                  class="flex-1 py-4 text-sm font-bold uppercase tracking-widest transition-all">
            Salon Owner POV
          </button>
          <button (click)="activeTab.set('stylist')" 
                  [class]="activeTab() === 'stylist' ? 'border-b-2 border-purple-500 text-purple-400 bg-zinc-800' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'" 
                  class="flex-1 py-4 text-sm font-bold uppercase tracking-widest transition-all">
            Stylist POV
          </button>
        </div>

        <!-- Content -->
        <div class="p-8 overflow-y-auto custom-scrollbar flex-1 bg-zinc-900">
          @if (activeTab() === 'owner') {
            <div class="space-y-8 animate-fade-in">
              <div class="flex items-start gap-6">
                <div class="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 border border-purple-500/30">
                  <span class="text-2xl">📈</span>
                </div>
                <div>
                  <h3 class="text-xl font-bold text-white mb-2">Automated Growth Engine</h3>
                  <p class="text-zinc-400 leading-relaxed">Stop guessing what your clients want. Beauty AI aggregates every review, analyzes sentiment, and tells you exactly where your salon excels and where it's losing money. Use the <strong class="text-purple-400">Dashboard</strong> to spot trends before they become problems.</p>
                </div>
              </div>

              <div class="flex items-start gap-6">
                <div class="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 border border-emerald-500/30">
                  <span class="text-2xl">💰</span>
                </div>
                <div>
                  <h3 class="text-xl font-bold text-white mb-2">Maximize Stylist Revenue</h3>
                  <p class="text-zinc-400 leading-relaxed">The <strong class="text-emerald-400">Stylist Hub</strong> isn't just for tracking; it's for coaching. See real-time financial KPIs (RTS%, Retention) alongside AI-generated performance tips. Instantly generate re-engagement texts for clients who haven't visited in 90+ days to fill empty chairs.</p>
                </div>
              </div>

              <div class="flex items-start gap-6">
                <div class="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0 border border-pink-500/30">
                  <span class="text-2xl">📸</span>
                </div>
                <div>
                  <h3 class="text-xl font-bold text-white mb-2">Agency-Level Marketing</h3>
                  <p class="text-zinc-400 leading-relaxed">Ditch expensive photoshoots. The <strong class="text-pink-400">Marketing Studio</strong> uses Gemini 3.1 Pro to generate hyper-realistic, high-fashion imagery for your campaigns. Add text overlays, choose aspect ratios, and instantly generate captivating Instagram captions tailored to your brand.</p>
                </div>
              </div>
            </div>
          } @else {
            <div class="space-y-8 animate-fade-in">
              <div class="flex items-start gap-6">
                <div class="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 border border-blue-500/30">
                  <span class="text-2xl">✨</span>
                </div>
                <div>
                  <h3 class="text-xl font-bold text-white mb-2">Your Personal Brand Builder</h3>
                  <p class="text-zinc-400 leading-relaxed">You are an artist, not a copywriter. The <strong class="text-blue-400">Stylist Hub</strong> takes your real client reviews and instantly synthesizes them into a powerful, professional bio. Use this on your Instagram or the salon website to attract high-ticket clients.</p>
                </div>
              </div>

              <div class="flex items-start gap-6">
                <div class="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 border border-amber-500/30">
                  <span class="text-2xl">📱</span>
                </div>
                <div>
                  <h3 class="text-xl font-bold text-white mb-2">Effortless Social Media</h3>
                  <p class="text-zinc-400 leading-relaxed">Struggling with what to post? Use the <strong class="text-amber-400">Marketing Studio</strong> to visualize your concepts. Upload a reference photo, and let the AI enhance it into a stunning 4K editorial shot. It even writes the captions and hashtags for you.</p>
                </div>
              </div>

              <div class="flex items-start gap-6">
                <div class="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center flex-shrink-0 border border-rose-500/30">
                  <span class="text-2xl">🗓️</span>
                </div>
                <div>
                  <h3 class="text-xl font-bold text-white mb-2">Fill Last-Minute Cancellations</h3>
                  <p class="text-zinc-400 leading-relaxed">Cancellations cost you money. In your <strong class="text-rose-400">Schedule</strong> tab, click "Cancel" on an appointment, and Beauty AI instantly generates an urgent, engaging social media post to fill that spot immediately. Copy, paste, and get booked.</p>
                </div>
              </div>
            </div>
          }
        </div>
        
        <!-- Footer -->
        <div class="p-6 bg-zinc-950 border-t border-white/10 text-center">
          <button (click)="close.emit()" class="px-8 py-3 bg-white text-black font-bold uppercase tracking-widest rounded-xl hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10">
            Start Dominating
          </button>
        </div>
      </div>
    </div>
  `
})
export class TutorialComponent {
  activeTab = signal<'owner' | 'stylist'>('owner');
  close = output<void>();
}
