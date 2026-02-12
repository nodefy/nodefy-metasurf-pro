
export type DatePeriod = 'today' | 'yesterday' | 'last_7d';

export interface AccountSettings {
  minRoas: number;
  scalePercentage: number;
  autoScale: boolean;
  alertThreshold: number;
}

// Data Source Configuration
export interface MetaDataSource {
  enabled: boolean;
  adAccountId: string;
  accessToken: string;
}

export interface TripleWhaleDataSource {
  enabled: boolean;
  apiKey: string;
  storeId?: string;
}

export interface DataSources {
  meta?: MetaDataSource;
  tripleWhale?: TripleWhaleDataSource;
}

export interface AdAccount {
  id: string;
  name: string;
  isActive: boolean;
  isStarred?: boolean;
  currency: string;
  settings?: AccountSettings;
  // Multi-source data configuration
  dataSources?: DataSources;
  // Legacy support: if dataSources is not set, assume only Meta
  // Old accounts will have adAccountId directly on the account
  adAccountId?: string; // Legacy field for backwards compatibility
}

export interface Campaign {
  id: string;
  accountId: string;
  name: string;
  budget: number;
  spend: number;
  roas: number;
  cpc: number;
  ctr: number;
  cpa: number;
  conversions: number;
  status: 'ACTIVE' | 'PAUSED';
  isSurfScaling: boolean;
  isStarred?: boolean;
  minRoas: number;
  objective: string;
  // Source tracking for aggregated campaigns
  sourceIds?: {
    meta?: string;
    tripleWhale?: string;
  };
  revenue?: number; // Revenue from Triple Whale (more accurate)
}

// Added ScalingRule interface to fix import error in constants.tsx
export interface ScalingRule {
  id: string;
  metric: string;
  operator: string;
  value: number;
  increasePercentage: number;
}

// Added ScalingPhase interface for strategy components
export interface ScalingPhase {
  name: string;
  action: string;
  expectedOutcome: string;
}

export type Interval = '1H' | '3H' | '6H' | 'CUSTOM';

export interface SurfSchedule {
  id?: string; // Standard key for singleton or grouped schedules
  enabled: boolean;
  interval: Interval;
  specificHours: number[]; // e.g., [9, 12, 15]
  lastCheck: number;
  nextCheck: number;
}

// Added ScalingStrategy interface to fix import error in services/geminiService.ts
export interface ScalingStrategy {
  title: string;
  summary: string;
  riskLevel: string;
  phases: ScalingPhase[];
  generatedAt?: string;
}

export interface User {
  id: string;
  username: string;
  role: 'ADMIN' | 'USER';
  lastLogin: number;
}

export interface Notification {
  id: string;
  message: string;
  details: string;
  timestamp: number;
  isRead: boolean;
  type?: 'SURF_ACTION' | 'SCHEDULE_CHECK' | 'SYSTEM';
}

export enum AppTab {
  ACCOUNTS = 'ACCOUNTS',
  DASHBOARD = 'DASHBOARD', // Merged Dashboard & Surf Center
  SETTINGS = 'SETTINGS',
  NOTIFICATIONS = 'NOTIFICATIONS',
  SCALESURFING = 'SCALESURFING'
}

export type MetricType = 'ROAS' | 'CPA' | 'SPEND' | 'CTR';
export type Operator = '>' | '<' | '>=' | '<=';
export type TimeWindow = '1H' | '3H' | '12H' | '24H';
export type ActionType = 'INCREASE_BUDGET' | 'DECREASE_BUDGET' | 'PAUSE_CAMPAIGN';

export interface RuleCondition {
  metric: MetricType;
  operator: Operator;
  value: number;
  window?: TimeWindow;
}

export interface RuleAction {
  type: ActionType;
  value: number; // percentage or absolute value
}

export interface Rule {
  id: string;
  name: string;
  conditions: RuleCondition[];
  action: RuleAction;
  isEnabled: boolean;
}

export interface SurfLog {
  id: string;
  timestamp: number;
  campaignId: string;
  campaignName: string;
  ruleId: string;
  action: string;
  oldBudget: number;
  newBudget: number;
  metricValue: number;
}

// Triple Whale specific types
export interface TripleWhaleCampaign {
  campaignId: string;
  campaignName: string;
  spend: number;
  revenue: number;
  roas: number;
  orders: number; // Conversions in Triple Whale
  cpc?: number;
  ctr?: number;
  status?: string;
}

export interface TripleWhaleInsights {
  campaigns: TripleWhaleCampaign[];
  period: DatePeriod;
  timestamp: number;
}

// Aggregated campaign data from multiple sources
export interface AggregatedCampaignData {
  meta?: {
    id: string;
    name: string;
    spend: number;
    roas: number;
    conversions: number;
    cpc: number;
    ctr: number;
    cpa: number;
    status: 'ACTIVE' | 'PAUSED';
    budget: number;
    objective: string;
  };
  tripleWhale?: {
    campaignId: string;
    campaignName: string;
    spend: number;
    revenue: number;
    roas: number;
    orders: number;
    cpc?: number;
    ctr?: number;
    status?: string;
  };
}
