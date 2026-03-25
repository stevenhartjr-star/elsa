
import { Injectable } from '@angular/core';
import { type ReviewAnalysis, type TrendAnalysis } from '../models/analysis.model';

@Injectable({
  providedIn: 'root',
})
export class PrintService {

  public printExecutiveSummary(analysis: ReviewAnalysis, trends: TrendAnalysis | null): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print the report.');
      return;
    }

    const reportHtml = this.generateReportHtml(analysis, trends);
    printWindow.document.write(reportHtml);
    printWindow.document.close();
    printWindow.focus();
    // Delay print to allow content to render
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
  }

  private generateReportHtml(analysis: ReviewAnalysis, trends: TrendAnalysis | null): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Executive Summary: ${analysis.businessName}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none; }
          }
          .content-section {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        </style>
      </head>
      <body class="bg-white text-black font-sans">
        <div class="container mx-auto p-8 max-w-4xl">
          
          <!-- Header -->
          <header class="border-b-2 border-gray-300 pb-4 mb-8 text-center">
            <h1 class="text-4xl font-bold text-gray-900">${analysis.businessName}</h1>
            <p class="text-xl text-gray-600">AI-Powered Executive Summary</p>
            <p class="text-sm text-gray-500 mt-1">Generated on: ${new Date().toLocaleDateString()}</p>
          </header>

          <!-- Topline Metrics -->
          <section class="bg-slate-100 p-6 rounded-lg mb-8 content-section">
             <h2 class="text-2xl font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">Key Metrics</h2>
             <div class="grid grid-cols-3 gap-6 text-center">
                <div>
                    <p class="text-sm text-gray-600 uppercase tracking-wider">Overall Sentiment</p>
                    <p class="text-3xl font-bold text-gray-900">${analysis.overallSentiment}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-600 uppercase tracking-wider">Average Rating</p>
                    <p class="text-3xl font-bold text-gray-900">${analysis.averageRating.toFixed(1)} / 5.0</p>
                </div>
                <div>
                    <p class="text-sm text-gray-600 uppercase tracking-wider">Total Reviews</p>
                    <p class="text-3xl font-bold text-gray-900">${analysis.totalReviewCount}</p>
                </div>
             </div>
          </section>

          <!-- Strategic Analysis -->
          <section class="mb-8 content-section">
             <h2 class="text-2xl font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">Strategic Analysis</h2>
             <div class="bg-gray-50 p-4 rounded-md mb-6">
                <h3 class="font-semibold text-gray-700">Summary</h3>
                <p class="text-gray-600 italic">"${analysis.strategicAnalysis.summary}"</p>
             </div>
             <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <h3 class="text-lg font-semibold text-green-700 mb-2">Strengths</h3>
                    <ul class="list-disc list-inside space-y-1 text-gray-700">${analysis.strategicAnalysis.strengths.map(s => `<li>${s}</li>`).join('')}</ul>
                </div>
                 <div>
                    <h3 class="text-lg font-semibold text-red-700 mb-2">Weaknesses</h3>
                    <ul class="list-disc list-inside space-y-1 text-gray-700">${analysis.strategicAnalysis.weaknesses.map(w => `<li>${w}</li>`).join('')}</ul>
                </div>
                 <div>
                    <h3 class="text-lg font-semibold text-blue-700 mb-2">Opportunities</h3>
                    <ul class="list-disc list-inside space-y-1 text-gray-700">${analysis.strategicAnalysis.opportunities.map(o => `<li>${o}</li>`).join('')}</ul>
                </div>
             </div>
          </section>

          <!-- Top Marketing Campaigns -->
          <section class="mb-8 content-section">
             <h2 class="text-2xl font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">Top Marketing Campaign Ideas</h2>
             <div class="space-y-4">
              ${analysis.strategicAnalysis.marketingCampaigns?.slice(0, 3).map(c => `
                  <div class="bg-slate-100 p-4 rounded-lg">
                    <h3 class="text-lg font-bold text-slate-800">${c.title}</h3>
                    <p class="text-sm text-slate-600">${c.description}</p>
                    <div class="text-xs mt-2">
                        <span class="font-semibold">Target:</span> ${c.targetAudience} | <span class="font-semibold">Channels:</span> ${c.channels.join(', ')}
                    </div>
                  </div>
              `).join('')}
             </div>
          </section>

          <!-- TrendSpotter Insights -->
          ${trends ? `
          <section class="content-section">
             <h2 class="text-2xl font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">TrendSpotter Insights for ${trends.locationAnalyzed}</h2>
             <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 class="text-lg font-semibold text-gray-700 mb-2">Top Local Trends</h3>
                    <div class="space-y-2">
                    ${trends.localMarketTrends.slice(0, 3).map(t => `
                        <div class="bg-gray-50 p-3 rounded">
                            <p class="font-semibold text-gray-800">${t.trend}</p>
                            <p class="text-sm text-gray-600">${t.description}</p>
                        </div>
                    `).join('')}
                    </div>
                </div>
                 <div>
                    <h3 class="text-lg font-semibold text-gray-700 mb-2">Top Service Expansion Ideas</h3>
                    <div class="space-y-2">
                    ${trends.serviceExpansionIdeas.slice(0, 3).map(s => `
                        <div class="bg-gray-50 p-3 rounded">
                            <p class="font-semibold text-gray-800">${s.service}</p>
                            <p class="text-sm text-gray-600">${s.description}</p>
                        </div>
                    `).join('')}
                    </div>
                </div>
             </div>
          </section>
          ` : ''}

          <footer class="text-center text-xs text-gray-400 mt-12 pt-4 border-t">
            Report generated by Review Insights AI
          </footer>
        </div>
      </body>
      </html>
    `;
  }
}
