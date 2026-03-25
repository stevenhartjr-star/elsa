import { Component, ChangeDetectionStrategy, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { type AnalysisResult } from '../../models/analysis.model';
import { StrategicAnalysisComponent } from '../strategic-analysis/strategic-analysis.component';
import { SourceBreakdownComponent } from '../source-breakdown/source-breakdown.component';
import { PrintService } from '../../services/print.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  imports: [CommonModule, StrategicAnalysisComponent, SourceBreakdownComponent],
})
export class DashboardComponent {
  analysisResult = input.required<AnalysisResult>();

  private readonly printService = inject(PrintService);

  async exportReport() {
    // In a real app, you might fetch related data here first.
    // For now, we'll just use the data we have.
    this.printService.printExecutiveSummary(this.analysisResult().analysis, null);
  }
}
