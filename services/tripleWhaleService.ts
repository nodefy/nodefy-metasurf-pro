import { TripleWhaleCampaign, TripleWhaleInsights, DatePeriod, Campaign } from '../types';
import { getCachedCampaigns, cacheCampaigns } from './db';

const API_BASE_URL = 'https://api.triplewhale.com/api/v1'; // Adjust based on actual Triple Whale API

// Rate limiting helper
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 100; // 100ms between requests

const rateLimitDelay = async () => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();
};

// Exponential backoff retry helper
const fetchWithRetry = async (
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<Response> => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await rateLimitDelay();
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        // Rate limited - wait longer
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      if (response.ok || attempt === maxRetries - 1) {
        return response;
      }
      
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
    }
  }
  throw new Error('Max retries exceeded');
};

/**
 * Fetch campaigns from Triple Whale API
 * Note: This is a template implementation. Adjust endpoints and data mapping based on actual Triple Whale API documentation.
 */
export const fetchTripleWhaleCampaigns = async (
  apiKey: string,
  storeId: string | undefined,
  period: DatePeriod
): Promise<{ data: TripleWhaleCampaign[], error: string | null }> => {
  try {
    // Map period to Triple Whale date format
    const periodMap: Record<DatePeriod, { start: string, end: string }> = {
      'today': {
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      },
      'yesterday': {
        start: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        end: new Date(Date.now() - 86400000).toISOString().split('T')[0]
      },
      'last_7d': {
        start: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      }
    };

    const dateRange = periodMap[period];
    
    // Construct API endpoint - adjust based on actual Triple Whale API
    // Common patterns: /campaigns, /insights, /analytics/campaigns
    let url = `${API_BASE_URL}/campaigns`;
    if (storeId) {
      url += `?store_id=${storeId}`;
    }
    url += `${storeId ? '&' : '?'}start_date=${dateRange.start}&end_date=${dateRange.end}`;

    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        data: [], 
        error: `Triple Whale API Error: ${errorData.message || `HTTP ${response.status}`}` 
      };
    }

    const data = await response.json();
    
    // Map Triple Whale response to our format
    // Adjust mapping based on actual API response structure
    const campaigns: TripleWhaleCampaign[] = (data.data || data.campaigns || []).map((item: any) => ({
      campaignId: item.campaign_id || item.id || item.campaignId,
      campaignName: item.campaign_name || item.name || item.campaignName,
      spend: Number(item.spend || item.cost || 0),
      revenue: Number(item.revenue || item.total_revenue || 0),
      roas: Number(item.roas || item.roas_value || (item.revenue && item.spend ? item.revenue / item.spend : 0)),
      orders: Number(item.orders || item.conversions || item.purchases || 0),
      cpc: item.cpc ? Number(item.cpc) : undefined,
      ctr: item.ctr ? Number(item.ctr) : undefined,
      status: item.status || 'ACTIVE',
    }));

    return { data: campaigns, error: null };
  } catch (error: any) {
    console.error('Triple Whale fetch error:', error);
    return { 
      data: [], 
      error: `Triple Whale Error: ${error.message || 'Netwerkfout bij ophalen Triple Whale data'}` 
    };
  }
};

/**
 * Fetch Triple Whale campaigns for an account and convert to Campaign format
 * This integrates with the existing campaign fetching flow
 */
export const fetchTripleWhaleCampaignsForAccount = async (
  accountId: string,
  apiKey: string,
  storeId: string | undefined,
  period: DatePeriod
): Promise<{ data: Campaign[], error: string | null }> => {
  try {
    // Check cache (using same cache structure as Meta)
    const cacheKey = `tw_${accountId}_${period}`;
    // Note: We could extend the cache to support Triple Whale separately
    // For now, we'll use a simple approach and cache in the aggregator

    const { data: tripleWhaleCampaigns, error } = await fetchTripleWhaleCampaigns(apiKey, storeId, period);
    
    if (error) {
      return { data: [], error };
    }

    // Convert Triple Whale campaigns to our Campaign format
    const campaigns: Campaign[] = tripleWhaleCampaigns.map((tw: TripleWhaleCampaign) => ({
      id: `tw_${tw.campaignId}`, // Prefix to avoid conflicts with Meta IDs
      accountId: accountId,
      name: tw.campaignName,
      budget: 0, // Triple Whale doesn't always provide budget
      spend: tw.spend,
      roas: tw.roas,
      cpc: tw.cpc || 0,
      ctr: tw.ctr || 0,
      cpa: tw.orders > 0 ? tw.spend / tw.orders : 0,
      conversions: tw.orders,
      status: (tw.status === 'ACTIVE' || tw.status === 'active') ? 'ACTIVE' : 'PAUSED',
      isSurfScaling: false,
      minRoas: 2.5, // Default
      objective: 'OUTCOME_SALES', // Default for Triple Whale
      sourceIds: {
        tripleWhale: tw.campaignId
      },
      revenue: tw.revenue,
    }));

    return { data: campaigns, error: null };
  } catch (error: any) {
    return { 
      data: [], 
      error: `Triple Whale Error: ${error.message || 'Onbekende fout'}` 
    };
  }
};

/**
 * Test Triple Whale API connection
 */
export const testTripleWhaleConnection = async (
  apiKey: string,
  storeId?: string
): Promise<{ success: boolean, error: string | null }> => {
  try {
    const url = storeId 
      ? `${API_BASE_URL}/stores/${storeId}`
      : `${API_BASE_URL}/me`;
    
    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }, 1); // Only 1 retry for test

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: errorData.message || `HTTP ${response.status}` 
      };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Kan Triple Whale API niet bereiken' 
    };
  }
};
