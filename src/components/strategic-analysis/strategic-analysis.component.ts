
import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { type StrategicAnalysis } from '../../models/analysis.model';

@Component({
  selector: 'app-strategic-analysis',
  templateUrl: './strategic-analysis.component.html',
  imports: [CommonModule],
})
export class StrategicAnalysisComponent {
  analysis = input.required<StrategicAnalysis>();
}
