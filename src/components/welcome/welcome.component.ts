import { Component, ChangeDetectionStrategy, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface UrlInput {
  id: number;
  value: string;
}

interface TourStep {
  title: string;
  subtitle: string;
  ownerDescription: string;
  stylistDescription: string;
  icon: string;
}

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  imports: [CommonModule],
})
export class WelcomeComponent {
  search = output<{ query: string; urls: string[] }>();
  isLoading = signal<boolean>(false);

  // Tour State
  isTourActive = signal<boolean>(false);
  currentStepIndex = signal<number>(0);
  tourPersona = signal<'owner' | 'stylist'>('owner');

  private nextId = 1;
  query = signal<string>('');
  urls = signal<UrlInput[]>([{ id: 0, value: '' }]);

  tourSteps: TourStep[] = [
    {
      title: 'The Command Center',
      subtitle: 'Your Unfair Advantage',
      ownerDescription: "This is your mission control. We deliver actionable intelligence, not just data. Instantly see your market position, pinpoint competitor weaknesses, and identify the exact services driving profit. Stop managing your business; start commanding it.",
      stylistDescription: "Imagine knowing exactly what clients in your area *really* want. The Command Center shows you the most profitable trends and services people are raving about, so you can stop being just a service provider and start being a trendsetter who writes their own paycheck.",
      icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>'
    },
    {
      title: 'The Growth Hub',
      subtitle: 'Drive Growth & Performance',
      ownerDescription: "Turn your stylists into revenue-generating partners with a powerful growth toolkit. See exactly who your top performers are and why. Use our AI-driven insights to coach your team, increase average tickets, and turn your salon into a profit machine.",
      stylistDescription: "This is your personal performance coach. See your numbers in black and white: your revenue, your retail-to-service ratio, your rebooking rate. Understand your value, identify where you're leaving money on the table, and use our AI Coach, AURA, to get actionable advice on how to maximize your earnings.",
      icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'
    },
    {
      title: 'AURA: Your AI Partner',
      subtitle: 'From Stylist to Visionary',
      ownerDescription: "Eliminate client uncertainty and empower your team to upsell with confidence. AURA transforms every consultation into a high-ticket experience, visualizing premium styles that clients say 'yes' to. The result? Higher average tickets, happier clients, and a reputation for cutting-edge creativity.",
      stylistDescription: "Stop trying to describe a vision; show it. AURA is your personal creative director. Can't find the perfect reference photo? AURA generates it. Need to convince a client to go for that high-margin color service? AURA visualizes the stunning result for them. This is how you close bigger tickets and become the artist you were meant to be.",
      icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>'
    },
    {
      title: 'The Content Studio',
      subtitle: 'Your 24/7 Marketing Machine',
      ownerDescription: "Your marketing is now automated. Generate endless streams of luxury, on-brand social media content with a single click. No more paying for photographers or social media managers. Keep your brand omnipresent, your chairs full, and your competition wondering how you do it.",
      stylistDescription: "Build your personal brand into a client magnet. The Content Studio creates your social media portfolio for you, generating stunning visuals and captions that showcase your unique talent. Attract your ideal, high-paying clients effortlessly and build a waitlist that gives you total control over your career.",
      icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>'
    }
  ];

  addUrl() {
    this.urls.update(currentUrls => [...currentUrls, { id: this.nextId++, value: '' }]);
  }

  removeUrl(idToRemove: number) {
    this.urls.update(currentUrls => currentUrls.filter(url => url.id !== idToRemove));
  }

  updateUrl(id: number, event: Event) {
    const inputElement = event.target as HTMLInputElement;
    const newValue = inputElement.value;
    this.urls.update(currentUrls =>
      currentUrls.map(url => (url.id === id ? { ...url, value: newValue } : url))
    );
  }

  updateQuery(event: Event) {
    this.query.set((event.target as HTMLInputElement).value);
  }

  onSearch() {
    const urls = this.urls()
      .map(u => u.value)
      .filter(u => u.trim() !== '');
    this.search.emit({ query: this.query(), urls });
  }

  onDemo() {
    this.search.emit({ query: 'El Salon', urls: ['https://www.elsalons.com/'] });
  }

  // Tour Logic
  startTour() {
    this.currentStepIndex.set(0);
    this.isTourActive.set(true);
  }

  nextStep() {
    if (this.currentStepIndex() < this.tourSteps.length - 1) {
      this.currentStepIndex.update(i => i + 1);
    } else {
      this.endTour();
    }
  }

  prevStep() {
    if (this.currentStepIndex() > 0) {
      this.currentStepIndex.update(i => i - 1);
    }
  }
  
  setTourPersona(persona: 'owner' | 'stylist') {
    this.tourPersona.set(persona);
  }

  endTour() {
    this.isTourActive.set(false);
  }
}