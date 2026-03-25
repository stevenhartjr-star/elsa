import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { type ReviewAnalysis } from '../../models/analysis.model';

@Component({
  selector: 'app-retail',
  templateUrl: './retail.component.html',
  imports: [CommonModule],
})
export class RetailComponent {
  analysis = input.required<ReviewAnalysis>();
}
