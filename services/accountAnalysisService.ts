import { AdAccount, Campaign } from '../types';
import { fetchMetaAdAccounts } from './metaService';

export interface AccountAnalysis {
  accountId: string;
  accountName: string;
  permissions: {
    hasCampaignAccess: boolean;
    hasInsightsAccess: boolean;
    hasBudgetAccess: boolean;
    hasEditAccess: boolean;
  };
  limits: {
    maxDailyBudget: number | null;
    maxLifetimeBudget: number | null;
    availableObjectives: string[];
  };
  opportunities: {
    scalingPotential: 'HIGH' | 'MEDIUM' | 'LOW';
    topCampaigns: Campaign[];
    bottlenecks: string[];
    recommendations: string[];
  };
  performance: {
    totalSpend: number;
    avgRoas: number;
    activeCampaigns: number;
    pausedCampaigns: number;
  };
}

export const analyzeAccount = async (
  accountId: string,
  campaigns: Campaign[]
): Promise<AccountAnalysis> => {
  const account = await fetchAccountDetails(accountId);
  
  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE');
  const pausedCampaigns = campaigns.filter(c => c.status === 'PAUSED');
  
  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
  const totalRevenue = campaigns.reduce((sum, c) => sum + (c.spend * c.roas), 0);
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  // Top campaigns (ROAS > 3)
  const topCampaigns = activeCampaigns
    .filter(c => c.roas >= 3)
    .sort((a, b) => b.roas - a.roas)
    .slice(0, 5);

  // Determine scaling potential
  let scalingPotential: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  const highRoasCount = activeCampaigns.filter(c => c.roas >= 4).length;
  const mediumRoasCount = activeCampaigns.filter(c => c.roas >= 2 && c.roas < 4).length;
  
  if (highRoasCount >= 3 || (highRoasCount >= 1 && mediumRoasCount >= 5)) {
    scalingPotential = 'HIGH';
  } else if (highRoasCount >= 1 || mediumRoasCount >= 3) {
    scalingPotential = 'MEDIUM';
  }

  // Identify bottlenecks
  const bottlenecks: string[] = [];
  if (activeCampaigns.length < 5) {
    bottlenecks.push('Weinig actieve campagnes - overweeg meer testen');
  }
  if (avgRoas < 2) {
    bottlenecks.push('Lage gemiddelde ROAS - optimaliseer targeting en creatives');
  }
  const lowCtrCampaigns = activeCampaigns.filter(c => c.ctr < 1).length;
  if (lowCtrCampaigns > activeCampaigns.length * 0.5) {
    bottlenecks.push('Veel campagnes met lage CTR - creative fatigue mogelijk');
  }
  if (pausedCampaigns.length > activeCampaigns.length) {
    bottlenecks.push('Meer gepauzeerde dan actieve campagnes - herbeoordeel strategie');
  }

  // Generate recommendations
  const recommendations: string[] = [];
  if (topCampaigns.length > 0) {
    recommendations.push(`Verhoog budget voor top performers: ${topCampaigns.map(c => c.name).join(', ')}`);
  }
  if (scalingPotential === 'HIGH') {
    recommendations.push('Account heeft hoge scaling potentie - overweeg aggressive budget verhogingen');
  }
  if (bottlenecks.length > 0) {
    recommendations.push('Adresseer bottlenecks voor betere performance');
  }
  recommendations.push('Monitor ROAS trends dagelijks voor early warning signals');
  recommendations.push('Test nieuwe creatives voor campagnes met lage CTR');

  return {
    accountId,
    accountName: account?.name || 'Unknown Account',
    permissions: {
      hasCampaignAccess: true, // Assume true if we can fetch campaigns
      hasInsightsAccess: true,
      hasBudgetAccess: true,
      hasEditAccess: false // Would need to check actual permissions
    },
    limits: {
      maxDailyBudget: null, // Would need to fetch from API
      maxLifetimeBudget: null,
      availableObjectives: ['OUTCOME_SALES', 'OUTCOME_TRAFFIC', 'OUTCOME_ENGAGEMENT', 'OUTCOME_LEADS']
    },
    opportunities: {
      scalingPotential,
      topCampaigns,
      bottlenecks,
      recommendations
    },
    performance: {
      totalSpend,
      avgRoas,
      activeCampaigns: activeCampaigns.length,
      pausedCampaigns: pausedCampaigns.length
    }
  };
};

const fetchAccountDetails = async (accountId: string): Promise<AdAccount | null> => {
  try {
    const { data } = await fetchMetaAdAccounts();
    return data.find(a => a.id === accountId) || null;
  } catch {
    return null;
  }
};
