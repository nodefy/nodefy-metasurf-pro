import React from 'react';

// A mock visualization using SVG
// In a real app we'd use Recharts or Chart.js
const SurfChart = () => {
    return (
        <div className="w-full h-48 bg-slate-50 rounded-2xl relative overflow-hidden border border-slate-100 flex items-end">
            {/* Grid lines */}
            <div className="absolute inset-x-0 bottom-1/4 h-px bg-slate-200 border-t border-dashed border-slate-300"></div>
            <div className="absolute inset-x-0 bottom-1/2 h-px bg-slate-200 border-t border-dashed border-slate-300"></div>
            <div className="absolute inset-x-0 bottom-3/4 h-px bg-slate-200 border-t border-dashed border-slate-300"></div>

            {/* The Wave (Budget Trend) */}
            <svg className="w-full h-full absolute inset-0" preserveAspectRatio="none">
                <path
                    d="M0,100 C50,100 50,80 100,80 C150,80 150,120 200,120 C250,120 250,60 300,60 C350,60 350,90 400,90 C450,90 450,40 500,40 L500,150 L0,150 Z"
                    fill="url(#waveGradient)"
                    opacity="0.2"
                />
                <path
                    d="M0,100 C50,100 50,80 100,80 C150,80 150,120 200,120 C250,120 250,60 300,60 C350,60 350,90 400,90 C450,90 450,40 500,40"
                    className="stroke-orange-500 stroke-2 fill-none"
                />
                <defs>
                    <linearGradient id="waveGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" />
                        <stop offset="100%" stopColor="#fff" />
                    </linearGradient>
                </defs>
            </svg>

            {/* Time Labels */}
            <div className="absolute bottom-2 left-4 text-[8px] font-bold text-slate-400">00:00</div>
            <div className="absolute bottom-2 left-1/4 text-[8px] font-bold text-slate-400">06:00</div>
            <div className="absolute bottom-2 left-1/2 text-[8px] font-bold text-slate-400">12:00</div>
            <div className="absolute bottom-2 left-3/4 text-[8px] font-bold text-slate-400">18:00</div>
        </div>
    );
};

export default SurfChart;
