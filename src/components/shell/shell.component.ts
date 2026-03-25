import { Component, ChangeDetectionStrategy, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { type AnalysisResult } from '../../models/analysis.model';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { RawReviewsComponent } from '../raw-reviews/raw-reviews.component';
import { TrendSpotterComponent } from '../trend-spotter/trend-spotter.component';
import { StyleConsultantComponent } from '../style-consultant/style-consultant.component';
import { StylistHubComponent } from '../stylist-hub/stylist-hub.component';
import { MarketingStudioComponent } from '../marketing-studio/marketing-studio.component';
import { RetailComponent } from '../retail/retail.component';
import { ClientsComponent } from '../clients/clients.component';
import { TutorialComponent } from '../tutorial/tutorial.component';

export type ActiveModule = 'dashboard' | 'retail' | 'employees' | 'clients' | 'marketing' | 'reports' | 'advisor';

@Component({
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  imports: [
    CommonModule, 
    SidebarComponent, 
    DashboardComponent, 
    RawReviewsComponent,
    TrendSpotterComponent,
    StyleConsultantComponent,
    StylistHubComponent,
    MarketingStudioComponent,
    RetailComponent,
    ClientsComponent,
    TutorialComponent
  ],
})
export class ShellComponent {
  analysisResult = input.required<AnalysisResult>();
  activeModule = signal<ActiveModule>('dashboard');
  showTutorial = signal<boolean>(false);

  handleModuleSelected(module: ActiveModule) {
    this.activeModule.set(module);
  }
}