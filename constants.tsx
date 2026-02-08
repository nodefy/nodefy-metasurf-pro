
import { AdAccount, Campaign, ScalingRule } from './types';

export const INITIAL_ACCOUNTS: AdAccount[] = [
  { id: 'act_123456789', name: 'E-com Brand Alpha', isActive: false, currency: 'EUR' },
  { id: 'act_987654321', name: 'Global Fashion Store', isActive: false, currency: 'USD' },
  { id: 'act_112233445', name: 'Tech Gadgets NL', isActive: false, currency: 'EUR' },
];

export const INITIAL_CAMPAIGNS: Campaign[] = [
  // Fix: Added missing 'ctr' and 'cpa' properties to meet Campaign interface requirements
  { id: '1', accountId: 'act_123456789', name: 'Winter Collection - NL - Prospecting', budget: 500, spend: 120, roas: 4.2, cpc: 0.45, ctr: 1.8, cpa: 4.28, conversions: 28, status: 'ACTIVE', isSurfScaling: true, minRoas: 4.0, objective: 'OUTCOME_SALES' },
  { id: '2', accountId: 'act_123456789', name: 'Advantage+ Shopping - WW', budget: 1200, spend: 450, roas: 3.8, cpc: 0.65, ctr: 1.2, cpa: 8.33, conversions: 54, status: 'ACTIVE', isSurfScaling: false, minRoas: 3.5, objective: 'OUTCOME_SALES' },
  { id: '3', accountId: 'act_987654321', name: 'Retargeting - Cart Abandoners', budget: 200, spend: 45, roas: 5.5, cpc: 0.30, ctr: 2.5, cpa: 3.75, conversions: 12, status: 'ACTIVE', isSurfScaling: true, minRoas: 5.0, objective: 'OUTCOME_SALES' },
  { id: '4', accountId: 'act_112233445', name: 'Brand Awareness - NL', budget: 300, spend: 150, roas: 1.2, cpc: 0.15, ctr: 0.8, cpa: 75.0, conversions: 2, status: 'PAUSED', isSurfScaling: false, minRoas: 2.0, objective: 'OUTCOME_AWARENESS' },
];

export const INITIAL_RULES: ScalingRule[] = [
  { id: 'r1', metric: 'ROAS', operator: 'GREATER_THAN', value: 4.0, increasePercentage: 20 },
];