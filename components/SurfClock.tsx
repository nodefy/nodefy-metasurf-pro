import React from 'react';

interface SurfClockProps {
    schedule: number[]; // Array of hours (0-23)
    onToggleHour: (hour: number) => void;
    interval?: '1H' | '3H' | '6H' | 'CUSTOM';
}

const SurfClock: React.FC<SurfClockProps> = ({ schedule, onToggleHour, interval = 'CUSTOM' }) => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const radius = 100;
    const center = 120;

    const getPosition = (hour: number, offset: number = 0) => {
        const angle = (hour / 24) * 2 * Math.PI - Math.PI / 2; // Start at 12 o'clock (top)
        const x = center + (radius - offset) * Math.cos(angle);
        const y = center + (radius - offset) * Math.sin(angle);
        return { x, y };
    };

    return (
        <div className="relative w-60 h-60 mx-auto select-none">
            {/* Clock Face */}
            <svg width="240" height="240" className="absolute top-0 left-0">
                {/* Outer Ring */}
                <circle cx={center} cy={center} r={radius + 10} fill="none" stroke="#f1f5f9" strokeWidth="2" />

                {/* Hours */}
                {hours.map(hour => {
                    const isActive = schedule.includes(hour);
                    const { x, y } = getPosition(hour);

                    return (
                        <g key={hour} onClick={() => interval === 'CUSTOM' && onToggleHour(hour)} style={{ cursor: interval === 'CUSTOM' ? 'pointer' : 'default' }}>
                            {/* Connector Line */}
                            {isActive && (
                                <line
                                    x1={center} y1={center}
                                    x2={x} y2={y}
                                    stroke={isActive ? '#fce7f3' : 'transparent'}
                                    strokeWidth="1"
                                />
                            )}

                            {/* Hour Dot */}
                            <circle
                                cx={x} cy={y}
                                r={isActive ? 8 : 4}
                                fill={isActive ? '#ec4899' : '#cbd5e1'}
                                className="transition-all duration-300"
                            />

                            {/* Hour Text (Only show e.g. every 3 hours or active ones to reduce clutter) */}
                            {(hour % 3 === 0 || isActive) && (
                                <text
                                    x={x} y={y}
                                    dx={isActive ? 14 : 10}
                                    dy={4}
                                    className={`text-[8px] font-bold ${isActive ? 'fill-slate-900' : 'fill-slate-400'}`}
                                >
                                    {hour}:00
                                </text>
                            )}
                        </g>
                    );
                })}

                {/* Center Hub */}
                <circle cx={center} cy={center} r="12" fill="white" stroke="#e2e8f0" strokeWidth="2" />
                <circle cx={center} cy={center} r="4" fill="#ec4899" />
            </svg>

            {/* Center Label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center mt-12 bg-white/80 backdrop-blur-sm p-2 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Next Check</p>
                    <p className="text-lg font-black text-slate-800">14:00</p>
                </div>
            </div>
        </div>
    );
};

export default SurfClock;
