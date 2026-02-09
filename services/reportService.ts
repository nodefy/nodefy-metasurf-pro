import { Campaign } from '../types';
import { generateScalingStrategy } from './geminiService';
import { sendWebhookEmail } from './emailService';
import jsPDF from 'jspdf';

export interface ReportData {
  accountName: string;
  period: string;
  campaigns: Campaign[];
  summary: string;
  recommendations: string[];
  topPerformers: Campaign[];
  opportunities: Campaign[];
  risks: Campaign[];
}

export const generateAdviceReport = async (
  accountName: string,
  period: string,
  campaigns: Campaign[]
): Promise<ReportData> => {
  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE');
  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
  const totalRevenue = campaigns.reduce((sum, c) => sum + (c.spend * c.roas), 0);
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  // Top performers (ROAS > 4)
  const topPerformers = activeCampaigns
    .filter(c => c.roas >= 4)
    .sort((a, b) => b.roas - a.roas)
    .slice(0, 5);

  // Opportunities (ROAS 2-4, good spend)
  const opportunities = activeCampaigns
    .filter(c => c.roas >= 2 && c.roas < 4 && c.spend > 50)
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 5);

  // Risks (ROAS < 2 or high CPA)
  const risks = activeCampaigns
    .filter(c => c.roas < 2 || (c.cpa > 50 && c.cpa > 0))
    .sort((a, b) => a.roas - b.roas)
    .slice(0, 5);

  // Generate AI summary
  const strategy = await generateScalingStrategy(activeCampaigns);
  
  const summary = strategy 
    ? `${strategy.title}\n\n${strategy.summary}\n\nRisk Level: ${strategy.riskLevel}`
    : `Account Analyse voor ${accountName}\n\nTotale spend: €${totalSpend.toFixed(2)}\nGemiddelde ROAS: ${avgRoas.toFixed(2)}x\nActieve campagnes: ${activeCampaigns.length}`;

  const recommendations: string[] = [];
  
  if (topPerformers.length > 0) {
    recommendations.push(`Verhoog budget voor top performers: ${topPerformers.map(c => c.name).join(', ')}`);
  }
  
  if (opportunities.length > 0) {
    recommendations.push(`Test scaling voor: ${opportunities.map(c => c.name).join(', ')}`);
  }
  
  if (risks.length > 0) {
    recommendations.push(`Heroverweeg of pauzeer: ${risks.map(c => c.name).join(', ')}`);
  }

  if (strategy?.phases) {
    strategy.phases.forEach(phase => {
      recommendations.push(`${phase.name}: ${phase.action}`);
    });
  }

  return {
    accountName,
    period,
    campaigns,
    summary,
    recommendations,
    topPerformers,
    opportunities,
    risks
  };
};

export const generatePDFReport = (reportData: ReportData): void => {
  const doc = new jsPDF();
  let yPos = 20;

  // Title
  doc.setFontSize(20);
  doc.setTextColor(249, 115, 22); // Orange
  doc.text('Surf Scaler Pro - Adviesrapport', 20, yPos);
  yPos += 10;

  // Account info
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Account: ${reportData.accountName}`, 20, yPos);
  yPos += 7;
  doc.text(`Periode: ${reportData.period}`, 20, yPos);
  yPos += 7;
  doc.text(`Datum: ${new Date().toLocaleDateString('nl-NL')}`, 20, yPos);
  yPos += 15;

  // Summary
  doc.setFontSize(14);
  doc.text('Executive Summary', 20, yPos);
  yPos += 7;
  doc.setFontSize(10);
  const summaryLines = doc.splitTextToSize(reportData.summary, 170);
  doc.text(summaryLines, 20, yPos);
  yPos += summaryLines.length * 7 + 10;

  // Top Performers
  if (reportData.topPerformers.length > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.text('Top Performers', 20, yPos);
    yPos += 7;
    doc.setFontSize(10);
    reportData.topPerformers.forEach(c => {
      doc.text(`• ${c.name}: ROAS ${c.roas.toFixed(2)}x, Spend €${c.spend.toFixed(2)}`, 25, yPos);
      yPos += 6;
    });
    yPos += 5;
  }

  // Opportunities
  if (reportData.opportunities.length > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.text('Scaling Opportunities', 20, yPos);
    yPos += 7;
    doc.setFontSize(10);
    reportData.opportunities.forEach(c => {
      doc.text(`• ${c.name}: ROAS ${c.roas.toFixed(2)}x, Spend €${c.spend.toFixed(2)}`, 25, yPos);
      yPos += 6;
    });
    yPos += 5;
  }

  // Risks
  if (reportData.risks.length > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.text('Risico\'s & Aandachtspunten', 20, yPos);
    yPos += 7;
    doc.setFontSize(10);
    reportData.risks.forEach(c => {
      doc.text(`• ${c.name}: ROAS ${c.roas.toFixed(2)}x${c.cpa > 0 ? `, CPA €${c.cpa.toFixed(2)}` : ''}`, 25, yPos);
      yPos += 6;
    });
    yPos += 5;
  }

  // Recommendations
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }
  doc.setFontSize(14);
  doc.text('Aanbevelingen', 20, yPos);
  yPos += 7;
  doc.setFontSize(10);
  reportData.recommendations.forEach(rec => {
    const lines = doc.splitTextToSize(rec, 170);
    doc.text(lines, 25, yPos);
    yPos += lines.length * 6;
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `Gegenereerd door Surf Scaler Pro op ${new Date().toLocaleString('nl-NL')}`,
    20,
    280
  );

  // Save PDF
  doc.save(`SurfScaler-Report-${reportData.accountName}-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const sendReportEmail = async (reportData: ReportData): Promise<boolean> => {
  const subject = `Surf Scaler Pro - Adviesrapport ${reportData.accountName}`;
  
  const summary = `
    <h3 style="color: #f97316; margin-top: 0;">Adviesrapport - ${reportData.accountName}</h3>
    <p><strong>Periode:</strong> ${reportData.period}</p>
    <p><strong>Datum:</strong> ${new Date().toLocaleDateString('nl-NL')}</p>
  `;

  let body = `
    <h3>Executive Summary</h3>
    <p style="white-space: pre-wrap;">${reportData.summary}</p>
  `;

  if (reportData.topPerformers.length > 0) {
    body += '<h3>Top Performers</h3><ul>';
    reportData.topPerformers.forEach(c => {
      body += `<li><strong>${c.name}</strong>: ROAS ${c.roas.toFixed(2)}x, Spend €${c.spend.toFixed(2)}</li>`;
    });
    body += '</ul>';
  }

  if (reportData.opportunities.length > 0) {
    body += '<h3>Scaling Opportunities</h3><ul>';
    reportData.opportunities.forEach(c => {
      body += `<li><strong>${c.name}</strong>: ROAS ${c.roas.toFixed(2)}x, Spend €${c.spend.toFixed(2)}</li>`;
    });
    body += '</ul>';
  }

  if (reportData.risks.length > 0) {
    body += '<h3>Risico\'s & Aandachtspunten</h3><ul>';
    reportData.risks.forEach(c => {
      body += `<li><strong>${c.name}</strong>: ROAS ${c.roas.toFixed(2)}x${c.cpa > 0 ? `, CPA €${c.cpa.toFixed(2)}` : ''}</li>`;
    });
    body += '</ul>';
  }

  body += '<h3>Aanbevelingen</h3><ul>';
  reportData.recommendations.forEach(rec => {
    body += `<li>${rec}</li>`;
  });
  body += '</ul>';

  body += '<p style="margin-top: 30px; color: #666; font-size: 12px;">Het volledige PDF rapport is als bijlage toegevoegd.</p>';

  return await sendWebhookEmail({ subject, body, summary });
};
