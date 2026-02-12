import { Campaign, AggregatedCampaignData, DatePeriod } from '../types';

/**
 * Match campaigns from different sources by ID or name
 */
const matchCampaigns = (
  metaCampaign: Campaign,
  tripleWhaleCampaigns: Campaign[]
): Campaign | null => {
  // First try to match by ID (if Triple Whale campaign has matching Meta ID)
  const byId = tripleWhaleCampaigns.find(tw => 
    tw.sourceIds?.meta === metaCampaign.id || 
    tw.id === metaCampaign.id
  );
  if (byId) return byId;

  // Fallback: match by campaign name (case-insensitive, trimmed)
  const metaName = metaCampaign.name.trim().toLowerCase();
  const byName = tripleWhaleCampaigns.find(tw => 
    tw.name.trim().toLowerCase() === metaName
  );
  if (byName) return byName;

  return null;
};

/**
 * Aggregate campaign data from Meta and Triple Whale sources
 * Strategy:
 * - Conversions: max of both (prevent double counting)
 * - ROAS: best (highest) of both
 * - Spend: max (Triple Whale often more accurate for e-commerce)
 * - Revenue: max (Triple Whale has better tracking)
 * - Other metrics: prefer Triple Whale if available, else Meta
 */
export const aggregateCampaignData = (
  metaCampaigns: Campaign[],
  tripleWhaleCampaigns: Campaign[]
): Campaign[] => {
  const aggregated: Campaign[] = [];
  const usedTripleWhaleIds = new Set<string>();

  // Process Meta campaigns and try to match with Triple Whale
  for (const metaCampaign of metaCampaigns) {
    const matchedTW = matchCampaigns(metaCampaign, tripleWhaleCampaigns);
    
    if (matchedTW) {
      // Combine data from both sources
      usedTripleWhaleIds.add(matchedTW.id);
      
      const aggregatedCampaign: Campaign = {
        ...metaCampaign, // Start with Meta as base
        // Use best metrics from both sources
        conversions: Math.max(metaCampaign.conversions, matchedTW.conversions),
        roas: Math.max(metaCampaign.roas, matchedTW.roas),
        spend: Math.max(metaCampaign.spend, matchedTW.spend),
        revenue: matchedTW.revenue || metaCampaign.revenue || 0,
        // Prefer Triple Whale for e-commerce metrics if available
        cpc: matchedTW.cpc > 0 ? matchedTW.cpc : metaCampaign.cpc,
        ctr: matchedTW.ctr > 0 ? matchedTW.ctr : metaCampaign.ctr,
        cpa: matchedTW.conversions > 0 
          ? (matchedTW.spend / matchedTW.conversions)
          : metaCampaign.cpa,
        // Track source IDs
        sourceIds: {
          meta: metaCampaign.id,
          tripleWhale: matchedTW.sourceIds?.tripleWhale || matchedTW.id.replace('tw_', '')
        }
      };
      
      aggregated.push(aggregatedCampaign);
    } else {
      // Only Meta data available
      aggregated.push({
        ...metaCampaign,
        sourceIds: {
          meta: metaCampaign.id
        }
      });
    }
  }

  // Add Triple Whale campaigns that weren't matched (only Triple Whale)
  for (const twCampaign of tripleWhaleCampaigns) {
    if (!usedTripleWhaleIds.has(twCampaign.id)) {
      aggregated.push({
        ...twCampaign,
        sourceIds: {
          tripleWhale: twCampaign.sourceIds?.tripleWhale || twCampaign.id.replace('tw_', '')
        }
      });
    }
  }

  return aggregated;
};

/**
 * Fetch and aggregate campaigns from multiple data sources
 */
export const fetchAggregatedCampaigns = async (
  accountId: string,
  dataSources: {
    meta?: {
      enabled: boolean;
      adAccountId: string;
      accessToken: string;
    };
    tripleWhale?: {
      enabled: boolean;
      apiKey: string;
      storeId?: string;
    };
  },
  period: DatePeriod
): Promise<{ data: Campaign[], error: string | null }> => {
  const metaCampaigns: Campaign[] = [];
  const tripleWhaleCampaigns: Campaign[] = [];
  const errors: string[] = [];

  // Fetch from Meta if enabled
  if (dataSources.meta?.enabled) {
    try {
      const { fetchMetaCampaignsForAccount } = await import('./metaService');
      const { data, error } = await fetchMetaCampaignsForAccount(
        dataSources.meta.adAccountId,
        period
      );
      if (error) {
        errors.push(`Meta: ${error}`);
      } else {
        metaCampaigns.push(...data);
      }
    } catch (error: any) {
      errors.push(`Meta: ${error.message || 'Onbekende fout'}`);
    }
  }

  // Fetch from Triple Whale if enabled
  if (dataSources.tripleWhale?.enabled) {
    try {
      const { fetchTripleWhaleCampaignsForAccount } = await import('./tripleWhaleService');
      const { data, error } = await fetchTripleWhaleCampaignsForAccount(
        accountId,
        dataSources.tripleWhale.apiKey,
        dataSources.tripleWhale.storeId,
        period
      );
      if (error) {
        errors.push(`Triple Whale: ${error}`);
      } else {
        tripleWhaleCampaigns.push(...data);
      }
    } catch (error: any) {
      errors.push(`Triple Whale: ${error.message || 'Onbekende fout'}`);
    }
  }

  // If no data sources enabled, return error
  if (!dataSources.meta?.enabled && !dataSources.tripleWhale?.enabled) {
    return {
      data: [],
      error: 'Geen data sources ingeschakeld. Schakel Meta of Triple Whale in.'
    };
  }

  // If we have errors but no data, return error
  if (errors.length > 0 && metaCampaigns.length === 0 && tripleWhaleCampaigns.length === 0) {
    return {
      data: [],
      error: errors.join('; ')
    };
  }

  // Aggregate data
  let aggregated: Campaign[] = [];
  
  if (metaCampaigns.length > 0 && tripleWhaleCampaigns.length > 0) {
    // Both sources: aggregate
    aggregated = aggregateCampaignData(metaCampaigns, tripleWhaleCampaigns);
  } else if (metaCampaigns.length > 0) {
    // Only Meta
    aggregated = metaCampaigns.map(c => ({
      ...c,
      sourceIds: { meta: c.id }
    }));
  } else if (tripleWhaleCampaigns.length > 0) {
    // Only Triple Whale
    aggregated = tripleWhaleCampaigns.map(c => ({
      ...c,
      sourceIds: { tripleWhale: c.sourceIds?.tripleWhale || c.id.replace('tw_', '') }
    }));
  }

  // Return aggregated data with warnings if there were partial errors
  return {
    data: aggregated,
    error: errors.length > 0 ? errors.join('; ') : null
  };
};

/**
 * Migrate legacy account config to new multi-source format
 */
export const migrateAccountConfig = (account: {
  id: string;
  adAccountId?: string;
  dataSources?: {
    meta?: {
      enabled: boolean;
      adAccountId: string;
      accessToken: string;
    };
    tripleWhale?: {
      enabled: boolean;
      apiKey: string;
      storeId?: string;
    };
  };
  [key: string]: any;
}): {
  id: string;
  dataSources?: {
    meta?: {
      enabled: boolean;
      adAccountId: string;
      accessToken: string;
    };
    tripleWhale?: {
      enabled: boolean;
      apiKey: string;
      storeId?: string;
    };
  };
  [key: string]: any;
} => {
  // If account already has dataSources, return as-is
  if (account.dataSources) {
    return account as any;
  }

  // If account has legacy adAccountId, migrate to new format
  if (account.adAccountId) {
    return {
      ...account,
      dataSources: {
        meta: {
          enabled: true,
          adAccountId: account.adAccountId,
          accessToken: '' // Will need to be set from stored token
        }
      }
    };
  }

  // No migration needed
  return account as any;
};
