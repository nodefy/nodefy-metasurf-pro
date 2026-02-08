import React from 'react';
import { Campaign } from '@/types';

interface DashboardStatsProps {
    campaigns: Campaign[];
    period: string;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ campaigns, period }) => {
    // Calculate aggregated stats
    const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
    const totalRevenue = campaigns.reduce((sum, c) => sum + (c.spend * c.roas), 0);
    const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE').length;
    const surfCampaigns = campaigns.filter(c => c.isSurfScaling).length;

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-900 text-white p-6 rounded-3xl relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Total Spend</p>
                    <h3 className="text-2xl font-black">€{totalSpend.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                </div>
                <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-slate-800 rounded-full blur-xl opacity-50"></div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Avg. ROAS</p>
                    <h3 className={`text-2xl font-black ${avgRoas >= 4 ? 'text-emerald-500' : 'text-slate-800'}`}>
                        {avgRoas.toFixed(2)}x
                    </h3>
                </div>
                {avgRoas >= 4 && (
                    <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl"></div>
                )}
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Revenue</p>
                <h3 className="text-2xl font-black text-slate-800">€{totalRevenue.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</h3>
            </div>

            <div className="bg-orange-500 text-white p-6 rounded-3xl shadow-lg shadow-orange-500/20 relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Active Surfers</p>
                    <h3 className="text-2xl font-black">{surfCampaigns} <span className="text-sm font-medium text-white/60">/ {activeCampaigns} Active</span></h3>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
            </div>
        </div>
    );
};

export default DashboardStats;
