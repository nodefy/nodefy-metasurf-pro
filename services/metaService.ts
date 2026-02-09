import { AdAccount, Campaign, DatePeriod } from "../types";
import { getCachedCampaigns, cacheCampaigns, saveSetting } from './db';

const API_VERSION = "v21.0";
const TOKEN_KEY = 'metasurf_api_token';

const getStoredToken = () => {
  return import.meta.env.VITE_META_ACCESS_TOKEN || localStorage.getItem(TOKEN_KEY) || '';
};

export const saveToken = async (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
  await saveSetting('api_token', token);
};

export const fetchMetaAdAccounts = async (): Promise<{ data: AdAccount[], error: string | null }> => {
  const token = getStoredToken();
  if (!token) return { data: [], error: "Geen toegangstoken gevonden. Voeg deze toe in Instellingen." };

  try {
    const url = `https://graph.facebook.com/${API_VERSION}/me/adaccounts?fields=id,name,currency,account_status&access_token=${token}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return { data: [], error: `Meta Error: ${data.error.message}` };
    }

    if (!data.data || data.data.length === 0) {
      return { data: [], error: "Geen Ad Accounts gevonden onder dit profiel." };
    }

    const accounts = data.data.map((acc: any) => ({
      id: acc.id,
      name: acc.name || acc.id,
      isActive: false,
      isStarred: false, // Default, will be merged with DB in App.tsx
      currency: acc.currency,
    }));

    return { data: accounts, error: null };
  } catch (error) {
    return { data: [], error: "Netwerkfout: Kan Meta API niet bereiken." };
  }
};

export const fetchMetaCampaignsForAccount = async (accountId: string, period: DatePeriod): Promise<{ data: Campaign[], error: string | null }> => {
  const token = getStoredToken();
  if (!token) return { data: [], error: "Token ontbreekt." };

  try {
    // 1. Check Cache
    const cached = await getCachedCampaigns(accountId, period);
    if (cached) {
      console.log('Serving from cache:', accountId, period);
      return { data: cached, error: null };
    }

    // 2. Fetch from Server
    console.log('Fetching from server:', accountId, period);

    // Fetch Campaigns
    const campaignsUrl = `https://graph.facebook.com/${API_VERSION}/${accountId}/campaigns?fields=id,name,status,daily_budget,lifetime_budget,objective&limit=100&access_token=${token}`;
    const campaignsResponse = await fetch(campaignsUrl);
    const campaignsData = await campaignsResponse.json();

    if (campaignsData.error) {
      return { data: [], error: campaignsData.error.message };
    }

    // Fetch Insights - Map period to Meta API format
    const periodMap: Record<DatePeriod, string> = {
      'today': 'today',
      'yesterday': 'yesterday',
      'last_7d': 'last_7d'
    };
    const metaPeriod = periodMap[period] || 'today';
    
    const insightsUrl = `https://graph.facebook.com/${API_VERSION}/${accountId}/insights?fields=campaign_id,spend,purchase_roas,conversions,actions,cpc,inline_link_click_ctr&level=campaign&date_preset=${metaPeriod}&access_token=${token}`;
    const insightsResponse = await fetch(insightsUrl);
    const insightsData = await insightsResponse.json();

    if (insightsData.error) {
      // Warn but try to proceed with 0 stats if insights fail? Or error out. 
      // Better to error out or show empty stats.
      return { data: [], error: `Insights Error: ${insightsData.error.message}` };
    }

    // Map Insights
    const statsMap = new Map();
    (insightsData.data || []).forEach((item: any) => {
      const purchaseActions = item.purchase_roas?.find((r: any) =>
        r.action_type === 'purchase' ||
        r.action_type === 'offsite_conversion.fb_pixel_purchase' ||
        r.action_type === 'onsite_conversion.messaging_purchase_roas' // Corrected typo from previous versions?
      );

      // Conversions count
      let convCount = 0;
      if (item.actions) {
        const act = item.actions.find((a: any) => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase');
        convCount = act ? Number(act.value) : 0;
      }

      statsMap.set(item.campaign_id, {
        spend: Number(item.spend) || 0,
        roas: Number(purchaseActions ? purchaseActions.value : (item.purchase_roas?.[0]?.value || 0)) || 0,
        conversions: convCount,
        cpc: Number(item.cpc) || 0,
        ctr: Number(item.inline_link_click_ctr) || 0,
        cpa: convCount > 0 ? (Number(item.spend) / convCount) : 0
      });
    });

    // Merge Data
    const campaigns: Campaign[] = (campaignsData.data || []).map((c: any) => {
      const stats = statsMap.get(c.id) || { spend: 0, roas: 0, conversions: 0, cpc: 0, ctr: 0, cpa: 0 };
      const rawBudget = (Number(c.daily_budget) || Number(c.lifetime_budget) || 0) / 100;

      return {
        id: c.id,
        accountId: accountId,
        name: c.name,
        budget: rawBudget,
        spend: stats.spend,
        roas: stats.roas,
        cpc: stats.cpc,
        ctr: stats.ctr,
        cpa: stats.cpa,
        conversions: stats.conversions,
        status: c.status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED',
        isSurfScaling: false,
        minRoas: 2.5, // Default
        objective: c.objective || 'OUTCOME_SALES' // Fallback
      };
    }).sort((a: Campaign, b: Campaign) => b.spend - a.spend);

    // 3. Cache Result
    await cacheCampaigns(accountId, period, campaigns);

    return { data: campaigns, error: null };
  } catch (error) {
    console.error("Fetch error", error);
    return { data: [], error: "Oeps! Iets ging verkeerd bij het ophalen van data. Check je token en internet." };
  }
};