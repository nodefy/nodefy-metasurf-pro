
export type DatePeriod = 'today' | 'yesterday';

export interface AccountSettings {
  minRoas: number;
  scalePercentage: number;
  autoScale: boolean;
  alertThreshold: number;
}

export interface AdAccount {
  id: string;
  name: string;
  isActive: boolean;
  isStarred?: boolean;
  currency: string;
  settings?: AccountSettings;
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
  minRoas: number;
  objective: string;
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
  NOTIFICATIONS = 'NOTIFICATIONS'
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
