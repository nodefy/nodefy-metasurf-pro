import { Campaign, SurfLog } from '../types';
import { getSetting } from './db';

export interface EmailData {
  subject: string;
  body: string;
  summary: string;
}

export const sendWebhookEmail = async (data: EmailData): Promise<boolean> => {
  // Use Make.com webhook URL - can be overridden in settings
  const customWebhookUrl = await getSetting<string>('webhook_url', '');
  const webhookUrl = customWebhookUrl || 'https://hook.eu1.make.com/6g8jta9799el82t7rg0i3enx8rh2ey62';
  
  if (!webhookUrl) {
    console.warn('No webhook URL configured');
    return false;
  }

  // Build HTML email content
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .summary-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316; }
          .footer { background: #f8f9fa; padding: 15px; border-radius: 0 0 10px 10px; text-align: center; font-size: 12px; color: #666; }
          h2 { color: #f97316; margin-top: 0; }
          h3 { color: #1e293b; margin-top: 25px; }
          ul { padding-left: 20px; }
          li { margin: 8px 0; }
          .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
          .badge-success { background: #d1fae5; color: #065f46; }
          .badge-warning { background: #fef3c7; color: #92400e; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">🌊 Surf Scaler Pro</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">${data.subject}</p>
        </div>
        <div class="content">
          <div class="summary-box">
            ${data.summary}
          </div>
          <div style="margin-top: 30px;">
            ${data.body}
          </div>
        </div>
        <div class="footer">
          <p style="margin: 0;">
            Automatisch verzonden door Surf Scaler Pro<br>
            ${new Date().toLocaleString('nl-NL', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric',
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </p>
        </div>
      </body>
    </html>
  `;

  // Make.com webhook expects specific structure
  // Common fields: to, subject, html, text
  const webhookPayload = {
    to: 'Benjamin@nodefy.nl',
    subject: data.subject,
    html: htmlContent,
    text: data.body.replace(/<[^>]*>/g, ''), // Strip HTML for plain text version
    // Additional metadata for Make.com
    timestamp: new Date().toISOString(),
    source: 'Surf Scaler Pro',
    type: 'automated_email'
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Webhook error response:', errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Webhook email error:', error);
    return false;
  }
};

export const generateScheduleEmail = async (
  campaigns: Campaign[],
  logs: SurfLog[],
  activeHours: number[]
): Promise<EmailData> => {
  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE');
  const surfCampaigns = campaigns.filter(c => c.isSurfScaling);
  const recentLogs = logs.slice(0, 10);
  
  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
  const totalRevenue = campaigns.reduce((sum, c) => sum + (c.spend * c.roas), 0);
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  const subject = `Surf Scaler Pro - Automatische Check (${new Date().toLocaleDateString('nl-NL')})`;
  
  const summary = `
    <h3 style="color: #f97316; margin-top: 0;">Dashboard Overzicht</h3>
    <ul style="list-style: none; padding: 0;">
      <li style="margin: 8px 0;"><strong>Actieve Campagnes:</strong> ${activeCampaigns.length}</li>
      <li style="margin: 8px 0;"><strong>Surf Scaling Actief:</strong> ${surfCampaigns.length}</li>
      <li style="margin: 8px 0;"><strong>Totale Spend:</strong> €${totalSpend.toFixed(2)}</li>
      <li style="margin: 8px 0;"><strong>Gemiddelde ROAS:</strong> ${avgRoas.toFixed(2)}x</li>
      <li style="margin: 8px 0;"><strong>Recente Acties:</strong> ${recentLogs.length}</li>
    </ul>
  `;

  let body = '<h3>Recente Surf Acties</h3>';
  if (recentLogs.length === 0) {
    body += '<p>Geen acties ondernomen in deze periode.</p>';
  } else {
    body += '<ul>';
    recentLogs.forEach(log => {
      const change = log.newBudget > log.oldBudget ? '↑' : '↓';
      body += `
        <li style="margin: 10px 0;">
          <strong>${log.campaignName}</strong><br>
          ${log.action} - Budget: €${log.oldBudget.toFixed(2)} ${change} €${log.newBudget.toFixed(2)}
        </li>
      `;
    });
    body += '</ul>';
  }

  body += `
    <h3>Volgende Checks</h3>
    <p>De engine checkt automatisch op de volgende tijden:</p>
    <ul>
      ${activeHours.map(h => `<li>${String(h).padStart(2, '0')}:00</li>`).join('')}
    </ul>
  `;

  return { subject, body, summary };
};
