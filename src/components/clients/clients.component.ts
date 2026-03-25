import { Component, ChangeDetectionStrategy, input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { type RawReview, type Client } from '../../models/analysis.model';
import { RawReviewsComponent } from '../raw-reviews/raw-reviews.component';

@Component({
  selector: 'app-clients',
  templateUrl: './clients.component.html',
  imports: [CommonModule, RawReviewsComponent],
})
export class ClientsComponent {
  reviews = input.required<RawReview[]>();
  selectedClient = signal<Client | null>(null);

  clients = computed<Client[]>(() => {
    const reviewsByAuthor = new Map<string, RawReview[]>();

    for (const review of (this.reviews() || [])) {
      const author = review.authorName || 'Anonymous';
      if (!reviewsByAuthor.has(author)) {
        reviewsByAuthor.set(author, []);
      }
      reviewsByAuthor.get(author)!.push(review);
    }

    const clientList: Client[] = [];
    for (const [name, authorReviews] of reviewsByAuthor.entries()) {
      if (name === 'Anonymous') continue; // Skip anonymous reviewers for the client list

      const sortedReviews = authorReviews.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      const ratings = sortedReviews.map(r => r.rating).filter((r): r is number => r !== null);
      
      clientList.push({
        name,
        reviews: sortedReviews,
        reviewCount: sortedReviews.length,
        lastReviewDate: sortedReviews[0]?.date || null,
        averageRating: ratings.length > 0 ? ratings.reduce((acc, r) => acc + r, 0) / ratings.length : null,
        source: sortedReviews[0]?.source || 'N/A',
      });
    }

    return clientList.sort((a,b) => b.reviewCount - a.reviewCount);
  });

  selectClient(client: Client | null) {
    this.selectedClient.set(client);
  }
}