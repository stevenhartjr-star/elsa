
import { Component, ChangeDetectionStrategy, input, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';

interface BreakdownItem {
  source: string;
  count: number;
  percentage: number;
}

@Component({
  selector: 'app-source-breakdown',
  templateUrl: './source-breakdown.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class SourceBreakdownComponent {
  breakdown = input.required<{ [source: string]: number }>();
  total = input.required<number>();
  sourceSelected = output<string>();

  colors = ['bg-blue-500', 'bg-sky-500', 'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500'];

  sourceData = computed<BreakdownItem[]>(() => {
    const breakdownData = this.breakdown();
    const totalReviews = this.total();

    if (!breakdownData || totalReviews === 0) {
      return [];
    }

    return Object.entries(breakdownData)
      .map(([source, count]) => {
        // Explicitly cast count to number to satisfy TypeScript arithmetic checks
        const numericCount = Number(count);
        return {
          source,
          count: numericCount,
          percentage: (numericCount / totalReviews) * 100,
        };
      })
      .sort((a, b) => b.count - a.count);
  });

  onSourceClick(source: string): void {
    this.sourceSelected.emit(source);
  }
}
