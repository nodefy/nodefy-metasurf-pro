import React from 'react';
import { Rule, MetricType, Operator, ActionType } from '@/types';

interface RuleConfigProps {
    rules: Rule[];
    onSave: (rules: Rule[]) => void;
}

const RuleConfig: React.FC<RuleConfigProps> = ({ rules, onSave }) => {
    const toggleRule = (id: string) => {
        onSave(rules.map(r => r.id === id ? { ...r, isEnabled: !r.isEnabled } : r));
    };

    const updateConditionValue = (id: string, value: number) => {
        onSave(rules.map(r => r.id === id ? { ...r, conditions: [{ ...r.conditions[0], value }] } : r));
    };

    const updateActionValue = (id: string, value: number) => {
        onSave(rules.map(r => r.id === id ? { ...r, action: { ...r.action, value } } : r));
    };

    return (
        <div className="space-y-4">
            {rules.map(rule => (
                <div key={rule.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-bold text-slate-800 text-xs">{rule.name}</h4>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {/* Condition Input */}
                            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200">
                                <span className="text-[10px] font-bold text-slate-400">{rule.conditions[0].metric}</span>
                                <span className="text-[10px] font-bold text-slate-400">{rule.conditions[0].operator}</span>
                                <input
                                    type="number"
                                    value={rule.conditions[0].value}
                                    onChange={(e) => updateConditionValue(rule.id, Number(e.target.value))}
                                    className="w-12 text-[10px] font-bold text-slate-800 outline-none text-right bg-transparent border-b border-dashed border-slate-300 focus:border-slate-800"
                                />
                            </div>

                            <span className="text-[10px] text-slate-300">➔</span>

                            {/* Action Input */}
                            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200">
                                <span className={`text-[10px] font-bold ${rule.action.type === 'INCREASE_BUDGET' ? 'text-emerald-500' : 'text-orange-500'}`}>
                                    {rule.action.type === 'INCREASE_BUDGET' ? 'Boost Budget' : 'Cut Budget'}
                                </span>
                                <input
                                    type="number"
                                    value={rule.action.value}
                                    onChange={(e) => updateActionValue(rule.id, Number(e.target.value))}
                                    className="w-8 text-[10px] font-bold text-slate-800 outline-none text-right bg-transparent border-b border-dashed border-slate-300 focus:border-slate-800"
                                />
                                <span className="text-[10px] font-bold text-slate-400">%</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => toggleRule(rule.id)}
                        className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${rule.isEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${rule.isEnabled ? 'left-5' : 'left-1'}`} />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default RuleConfig;
