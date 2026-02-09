import Dexie, { Table } from 'dexie';
import { Campaign, SurfLog, DatePeriod, SurfSchedule } from '../types';

export interface DBCampaignCache {
    id?: number;
    accountId: string;
    period: DatePeriod;
    timestamp: number;
    data: Campaign[];
}

export interface DBSettings {
    key: string;
    value: any;
}

export interface DBStarredCampaign {
    id?: number;
    campaignId: string;
    accountId: string;
    timestamp: number;
}

export class SurfscaleDB extends Dexie {
    campaigns!: Table<DBCampaignCache>;
    settings!: Table<DBSettings>;
    logs!: Table<SurfLog>;
    schedules!: Table<SurfSchedule>;
    starredCampaigns!: Table<DBStarredCampaign>;

    constructor() {
        super('SurfscaleDB');
        this.version(3).stores({
            campaigns: '++id, [accountId+period], timestamp',
            settings: 'key',
            logs: '++id, timestamp',
            schedules: 'id',
            starredCampaigns: '++id, campaignId, accountId, timestamp'
        });
    }
}

export const db = new SurfscaleDB();

// Helper to get cached campaigns
export const getCachedCampaigns = async (accountId: string, period: DatePeriod): Promise<Campaign[] | null> => {
    const cache = await db.campaigns.where({ accountId, period }).first();
    // Valid for 5 minutes (300000ms) or until manually refreshed
    if (cache && Date.now() - cache.timestamp < 300000) {
        return cache.data;
    }
    return null;
};

// Helper to save campaigns to cache
export const cacheCampaigns = async (accountId: string, period: DatePeriod, data: Campaign[]) => {
    // Clear old cache for this key
    await db.campaigns.where({ accountId, period }).delete();
    await db.campaigns.add({
        accountId,
        period,
        timestamp: Date.now(),
        data
    });
};

// Helper for schedules
export const getSchedule = async (id: string = 'default'): Promise<SurfSchedule | null> => {
    return await db.schedules.get(id);
};

export const saveSchedule = async (schedule: SurfSchedule) => {
    await db.schedules.put({ ...schedule, id: schedule.id || 'default' });
};

// Helper for settings
export const getSetting = async <T>(key: string, defaultValue: T): Promise<T> => {
    const setting = await db.settings.get(key);
    return setting ? setting.value : defaultValue;
};

export const saveSetting = async (key: string, value: any) => {
    await db.settings.put({ key, value });
};

// Helper for starred campaigns
export const getStarredCampaigns = async (accountId?: string): Promise<string[]> => {
    let query: any = db.starredCampaigns;
    if (accountId) {
        query = query.where('accountId').equals(accountId);
    }
    const starred = await query.toArray();
    return starred.map(s => s.campaignId);
};

export const toggleStarCampaign = async (campaignId: string, accountId: string): Promise<boolean> => {
    const existing = await db.starredCampaigns.where({ campaignId, accountId }).first();
    if (existing) {
        await db.starredCampaigns.delete(existing.id!);
        return false;
    } else {
        await db.starredCampaigns.add({
            campaignId,
            accountId,
            timestamp: Date.now()
        });
        return true;
    }
};

export const isCampaignStarred = async (campaignId: string, accountId: string): Promise<boolean> => {
    const existing = await db.starredCampaigns.where({ campaignId, accountId }).first();
    return !!existing;
};
