import { Campaign, Rule, SurfLog, RuleCondition } from '../types';

// Mock function to simulate "last hour" metrics based on daily averages
// In a real app, this would fetch hourly breakdowns from Meta API
const getSimulatedHourlyMetrics = (campaign: Campaign) => {
    // Add some variance to simulate real-time fluctuations
    const variance = (Math.random() * 0.4) - 0.2; // +/- 20% variance

    return {
        roas: Math.max(0, (campaign.roas || 0) * (1 + variance)),
        cpa: Math.max(0, (campaign.cpa || 0) * (1 - variance)), // Inverse correlation often
        spend: (campaign.daily_budget || 100) / 24 // Assume average hourly spend
    };
};

const evaluateCondition = (condition: RuleCondition, metrics: { roas: number, cpa: number, spend: number }): boolean => {
    let metricValue = 0;
    switch (condition.metric) {
        case 'ROAS': metricValue = metrics.roas; break;
        case 'CPA': metricValue = metrics.cpa; break;
        case 'SPEND': metricValue = metrics.spend; break;
    }

    switch (condition.operator) {
        case '>': return metricValue > condition.value;
        case '<': return metricValue < condition.value;
        case '>=': return metricValue >= condition.value;
        case '<=': return metricValue <= condition.value;
        default: return false;
    }
};

export const evaluateRules = (campaign: Campaign, rules: Rule[]): SurfLog | null => {
    if (!campaign.isSurfScaling) return null;

    const hourlyMetrics = getSimulatedHourlyMetrics(campaign);
    const activeRules = rules.filter(r => r.isEnabled);

    for (const rule of activeRules) {
        // All conditions in a rule must be met (AND logic)
        const allMet = rule.conditions.every(condition => evaluateCondition(condition, hourlyMetrics));

        if (allMet) {
            const oldBudget = campaign.budget;
            let newBudget = oldBudget;

            if (rule.action.type === 'INCREASE_BUDGET') {
                newBudget = oldBudget * (1 + (rule.action.value / 100));
            } else if (rule.action.type === 'DECREASE_BUDGET') {
                newBudget = oldBudget * (1 - (rule.action.value / 100));
            } else if (rule.action.type === 'PAUSE') {
                newBudget = 0; // Or handle status change separately
            }

            // Return log of the action taken
            return {
                id: crypto.randomUUID(),
                campaignId: campaign.id,
                campaignName: campaign.name,
                ruleId: rule.id,
                timestamp: Date.now(),
                action: rule.name, // e.g. "Rule: High ROAS applied"
                oldBudget,
                newBudget,
                metricValue: hourlyMetrics.roas || hourlyMetrics.cpa || hourlyMetrics.spend
            };
        }
    }

    return null;
};
