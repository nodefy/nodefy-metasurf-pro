import Dexie, { Table } from 'dexie';
import { Campaign, SurfLog, DatePeriod } from '../types';

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

export class SurfscaleDB extends Dexie {
    campaigns!: Table<DBCampaignCache>;
    settings!: Table<DBSettings>;
    logs!: Table<SurfLog>;

    constructor() {
        super('SurfscaleDB');
        this.version(1).stores({
            campaigns: '++id, [accountId+period], timestamp',
            settings: 'key',
            logs: '++id, timestamp'
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

// Helper for settings
export const getSetting = async <T>(key: string, defaultValue: T): Promise<T> => {
    const setting = await db.settings.get(key);
    return setting ? setting.value : defaultValue;
};

export const saveSetting = async (key: string, value: any) => {
    await db.settings.put({ key, value });
};
