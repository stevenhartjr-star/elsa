
import { Component, ChangeDetectionStrategy, input, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { type RawReview } from '../../models/analysis.model';

type SentimentFilter = 'All' | 'Positive' | 'Neutral' | 'Negative';

@Component({
  selector: 'app-raw-reviews',
  templateUrl: './raw-reviews.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class RawReviewsComponent {
  reviews = input.required<RawReview[]>();
  initialSourceFilter = input<string | null>(null);

  // Filter state
  activeSourceFilter = signal<string>('All');
  activeSentimentFilter = signal<SentimentFilter>('All');
  searchQuery = signal<string>('');

  // Pagination state
  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(10);

  constructor() {
    effect(() => {
      const newFilter = this.initialSourceFilter();
      // Check if sources are populated to avoid race condition on init
      if (newFilter && this.sources().length > 1 && this.sources().includes(newFilter)) {
        this.activeSourceFilter.set(newFilter);
      }
    }, { allowSignalWrites: true });
  }

  // Derived state
  sources = computed(() => {
    const allSources = this.reviews().map(r => r.source);
    return ['All', ...new Set(allSources)];
  });

  filteredReviews = computed(() => {
    const allReviews = this.reviews();
    const sourceFilter = this.activeSourceFilter();
    const sentimentFilter = this.activeSentimentFilter();
    const query = this.searchQuery().toLowerCase().trim();

    return allReviews.filter(review => {
      const sourceMatch = sourceFilter === 'All' || review.source === sourceFilter;
      const sentimentMatch = sentimentFilter === 'All' || review.sentiment === sentimentFilter;
      const searchMatch = !query || review.quote.toLowerCase().includes(query);
      
      return sourceMatch && sentimentMatch && searchMatch;
    });
  });

  paginatedReviews = computed(() => {
    const reviews = this.filteredReviews();
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return reviews.slice(start, start + this.itemsPerPage());
  });

  totalPages = computed(() => Math.ceil(this.filteredReviews().length / this.itemsPerPage()));

  pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  startIndex = computed(() => {
    if (this.filteredReviews().length === 0) return 0;
    return (this.currentPage() - 1) * this.itemsPerPage() + 1;
  });

  endIndex = computed(() => {
    return Math.min(this.currentPage() * this.itemsPerPage(), this.filteredReviews().length);
  });

  // Actions
  setSourceFilter(source: string) {
    this.activeSourceFilter.set(source);
    this.currentPage.set(1);
  }

  setSentimentFilter(sentiment: SentimentFilter) {
    this.activeSentimentFilter.set(sentiment);
    this.currentPage.set(1);
  }

  updateSearchQuery(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.currentPage.set(1);
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  exportToCsv() {
    const reviewsToExport = this.filteredReviews();
    if (reviewsToExport.length === 0) {
      return;
    }

    const headers = [
      'quote', 
      'rating', 
      'source', 
      'sentiment',
      'authorName',
      'authorUrl',
      'reviewUrl',
      'date',
      'photos',
      'likes',
      'stylistMentioned'
    ];
    const csvRows = [headers.join(',')];

    const escapeCsvField = (field: string | null | undefined): string => {
        if (field === null || field === undefined) {
            return '';
        }
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
            return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
    };

    reviewsToExport.forEach(review => {
      const row = [
        escapeCsvField(review.quote),
        review.rating !== null ? review.rating.toFixed(1) : '',
        escapeCsvField(review.source),
        escapeCsvField(review.sentiment),
        escapeCsvField(review.authorName),
        escapeCsvField(review.authorUrl),
        escapeCsvField(review.reviewUrl),
        escapeCsvField(review.date),
        escapeCsvField(review.photos?.join(' ')),
        review.likes !== null ? String(review.likes) : '',
        escapeCsvField(review.stylistMentioned)
      ].join(',');
      csvRows.push(row);
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.href) {
      URL.revokeObjectURL(link.href);
    }
    link.href = URL.createObjectURL(blob);
    link.download = 'reviews.csv';
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
