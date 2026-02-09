import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { SurfLog } from '../types';

interface SurfChartProps {
    logs?: SurfLog[];
}

const SurfChart: React.FC<SurfChartProps> = ({ logs = [] }) => {
    // Process logs to create chart data (last 24 hours)
    const chartData = useMemo(() => {
        const now = Date.now();
        const hours = 24;
        const data = [];
        
        // Group logs by hour
        for (let i = hours - 1; i >= 0; i--) {
            const hourTimestamp = now - (i * 60 * 60 * 1000);
            const hourStart = new Date(hourTimestamp);
            const hourEnd = new Date(hourTimestamp + 60 * 60 * 1000);
            
            const logsInHour = logs.filter(log => {
                const logTime = new Date(log.timestamp);
                return logTime >= hourStart && logTime < hourEnd;
            });
            
            const totalBudgetChange = logsInHour.reduce((sum, log) => {
                return sum + (log.newBudget - log.oldBudget);
            }, 0);
            
            const avgBudget = logsInHour.length > 0 
                ? logsInHour.reduce((sum, log) => sum + log.newBudget, 0) / logsInHour.length
                : 0;
            
            data.push({
                time: hourStart.getHours().toString().padStart(2, '0') + ':00',
                hour: hourStart.getHours(),
                budget: avgBudget,
                changes: logsInHour.length,
                change: totalBudgetChange
            });
        }
        
        // If no logs, create mock data for visualization
        if (logs.length === 0) {
            return Array.from({ length: 24 }, (_, i) => ({
                time: String(i).padStart(2, '0') + ':00',
                hour: i,
                budget: 100 + Math.sin(i / 4) * 20,
                changes: 0,
                change: 0
            }));
        }
        
        return data;
    }, [logs]);

    const maxBudget = Math.max(...chartData.map(d => d.budget), 100);
    const minBudget = Math.min(...chartData.map(d => d.budget), 0);

    return (
        <div className="w-full h-48 bg-slate-50 rounded-2xl relative overflow-hidden border border-slate-100">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <defs>
                        <linearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f97316" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 8, fill: '#94a3b8' }}
                        interval={3}
                    />
                    <YAxis 
                        hide
                        domain={[minBudget * 0.9, maxBudget * 1.1]}
                    />
                    <Tooltip 
                        contentStyle={{ 
                            backgroundColor: '#1e293b', 
                            border: 'none', 
                            borderRadius: '8px',
                            fontSize: '10px',
                            padding: '8px'
                        }}
                        formatter={(value: any) => [`€${Number(value).toFixed(2)}`, 'Budget']}
                    />
                    <Area
                        type="monotone"
                        dataKey="budget"
                        stroke="#f97316"
                        strokeWidth={2}
                        fill="url(#waveGradient)"
                    />
                </AreaChart>
            </ResponsiveContainer>
            {logs.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Geen data beschikbaar</p>
                </div>
            )}
        </div>
    );
};

export default SurfChart;
