import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AdAccount, Campaign, AppTab, DatePeriod, Notification, Rule, SurfLog, User } from './types';
import { fetchMetaAdAccounts, fetchMetaCampaignsForAccount, saveToken } from './services/metaService';
import { sendSurfscaleNotification } from './services/notificationService';
import { evaluateRules } from './services/surfscaleService';
import SurfChart from './components/SurfChart';
import RuleConfig from './components/RuleConfig';
import DashboardStats from './components/DashboardStats';
import SurfClock from './components/SurfClock';

import { Interval } from './types';
import { getSetting, saveSetting } from './services/db';

const DB_KEY = 'metasurf_stable_v12';

const Icons = {
  Dashboard: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1v-5zM14 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM14 13a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1h-4a1 1 0 01-1-1v-5z" /></svg>,
  Campaign: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>,
  Settings: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>,
  Refresh: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
  Warning: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  Check: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>,
  Star: ({ active }: { active: boolean }) => <svg className={`w-4 h-4 transition-colors ${active ? 'fill-orange-400 text-orange-400' : 'text-slate-300'}`} fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
  Chevron: ({ open }: { open: boolean }) => <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M19 9l-7 7-7-7" /></svg>,
  Search: () => <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  Notification: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
};

const NodefyLogo = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-center select-none ${className}`}>
    <img
      src="/logo.png"
      alt="Nodefy Logo"
      className="h-10 w-auto object-contain"
    />
  </div>
);

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);
  const [selectedPeriod, setSelectedPeriod] = useState<DatePeriod>('today');
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);

  // Filters State
  const [filterObjective, setFilterObjective] = useState<string>('ALL');
  const [filterActiveOnly, setFilterActiveOnly] = useState<boolean>(false);
  const [filterMinSpend, setFilterMinSpend] = useState<number>(0);

  // Accounts UI State
  const [showOtherAccounts, setShowOtherAccounts] = useState(false);
  const [accountSearch, setAccountSearch] = useState('');

  // Settings State
  const [apiTokenInput, setApiTokenInput] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [users, setUsers] = useState<User[]>([
    { id: 'u1', name: 'Admin User', email: 'admin@nodefy.com', role: 'ADMIN', lastActive: Date.now() },
    { id: 'u2', name: 'Media Buyer', email: 'buyer@nodefy.com', role: 'EDITOR', lastActive: Date.now() - 86400000 }
  ]);
  const [newUserEmail, setNewUserEmail] = useState('');

  // Notification State
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Scheduling State (Phase 2)
  const [scheduleInterval, setScheduleInterval] = useState<Interval>('1H');
  const [activeHours, setActiveHours] = useState<number[]>(Array.from({ length: 24 }, (_, i) => i)); // Default 1H = all hours

  const updateSchedule = useCallback((interval: Interval) => {
    setScheduleInterval(interval);
    let newHours: number[] = [];
    if (interval === '1H') newHours = Array.from({ length: 24 }, (_, i) => i);
    else if (interval === '3H') newHours = Array.from({ length: 8 }, (_, i) => i * 3);
    else if (interval === '6H') newHours = [0, 6, 12, 18];
    else newHours = activeHours; // Keep current for CUSTOM

    setActiveHours(newHours);
  }, [activeHours]);

  const toggleCustomHour = (hour: number) => {
    if (scheduleInterval !== 'CUSTOM') return;
    setActiveHours(prev => prev.includes(hour) ? prev.filter(h => h !== hour) : [...prev, hour]);
  };

  // Surfscale State
  const [surfLogs, setSurfLogs] = useState<SurfLog[]>([]);
  const [analysisSummary, setAnalysisSummary] = useState<string | null>(null);
  const [rules, setRules] = useState<Rule[]>([
    {
      id: '1',
      name: 'High ROAS Scaler',
      conditions: [{ metric: 'ROAS', operator: '>', value: 4.0, window: '1H' }],
      action: { type: 'INCREASE_BUDGET', value: 20 },
      isEnabled: true
    },
    {
      id: '2',
      name: 'Cost Saver',
      conditions: [{ metric: 'CPA', operator: '>', value: 50, window: '1H' }],
      action: { type: 'DECREASE_BUDGET', value: 10 },
      isEnabled: true
    }
  ]);

  const getDB = useCallback(() => {
    const raw = localStorage.getItem(DB_KEY);
    return raw ? JSON.parse(raw) : { accounts: {}, campaigns: {} };
  }, []);

  const saveToDB = useCallback((type: string, id: string, data: any) => {
    const db = getDB();
    if (!db[type]) db[type] = {};
    db[type][id] = { ...(db[type][id] || {}), ...data };
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }, [getDB]);

  const activeAccount = useMemo(() => accounts.find(a => a.id === selectedAccountId), [accounts, selectedAccountId]);

  const syncAccounts = useCallback(async () => {
    setIsSyncing(true);
    setGlobalError(null);
    try {
      const { data, error } = await fetchMetaAdAccounts();
      if (error) {
        setGlobalError(error);
        setIsSyncing(false);
        return;
      }
      const db = getDB();
      const merged = data.map(a => ({
        ...a,
        isActive: db.accounts[a.id]?.isActive || false,
        isStarred: db.accounts[a.id]?.isStarred || false,
      }));
      setAccounts(merged);
      const lastActive = merged.find(a => a.isActive);
      if (lastActive && !selectedAccountId) setSelectedAccountId(lastActive.id);
      else if (merged.length > 0 && !selectedAccountId) setSelectedAccountId(merged[0].id);
    } catch (e) {
      setGlobalError("Onverwachte fout bij ophalen accounts.");
    } finally {
      setIsSyncing(false);
    }
  }, [getDB, selectedAccountId]);

  const syncCampaigns = useCallback(async (accountId: string, period: DatePeriod) => {
    setIsSyncing(true);
    setAccountError(null);
    setCampaigns([]);

    try {
      const { data, error } = await fetchMetaCampaignsForAccount(accountId, period);
      if (error) {
        setAccountError(error);
      } else {
        const db = getDB();
        setCampaigns(data.map(c => ({
          ...c,
          isSurfScaling: db.campaigns[c.id]?.isSurfScaling || false
        })));
      }
    } catch (e) {
      setAccountError("Fout bij laden account data.");
    } finally {
      setIsSyncing(false);
    }
  }, [getDB]);

  useEffect(() => {
    // Load Settings from DB
    const loadSettings = async () => {
      const token = await getSetting<string>('api_token', '');
      setApiTokenInput(token);
      const webhook = await getSetting<string>('webhook_url', '');
      setWebhookUrl(webhook);
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (isLoggedIn) syncAccounts();
  }, [isLoggedIn, syncAccounts]);

  useEffect(() => {
    if (selectedAccountId) syncCampaigns(selectedAccountId, selectedPeriod);
  }, [selectedAccountId, selectedPeriod, syncCampaigns]);

  const toggleStar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setAccounts(prev => prev.map(a => {
      if (a.id === id) {
        const next = !a.isStarred;
        saveToDB('accounts', id, { isStarred: next });
        return { ...a, isStarred: next };
      }
      return a;
    }));
  };

  const selectAccount = (id: string) => {
    setSelectedAccountId(id);
    setAccounts(prev => prev.map(a => {
      const active = a.id === id;
      const updated = { ...a, isActive: active };
      saveToDB('accounts', a.id, { isActive: active });
      return updated;
    }));
    setActiveTab(AppTab.DASHBOARD);
  };

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      const matchObjective = filterObjective === 'ALL' || c.objective.includes(filterObjective);
      const matchActive = !filterActiveOnly || c.status === 'ACTIVE';
      const matchSpend = Number(c.spend) >= filterMinSpend;
      return matchObjective && matchActive && matchSpend;
    });
  }, [campaigns, filterObjective, filterActiveOnly, filterMinSpend]);

  const handleSurfToggle = async (id: string) => {
    const campaign = campaigns.find(c => c.id === id);
    if (!campaign) return;

    const nextState = !campaign.isSurfScaling;

    setCampaigns(prev => prev.map(c => {
      if (c.id === id) {
        saveToDB('campaigns', id, { isSurfScaling: nextState });
        return { ...c, isSurfScaling: nextState };
      }
      return c;
    }));

    if (nextState) {
      try {
        const notification = await sendSurfscaleNotification(campaign.name);
        setNotifications(prev => [notification, ...prev]);
      } catch (error) {
        console.error("Failed to send notification", error);
      }
    }
  };

  const runSurfAnalysis = () => {
    let newLogs: SurfLog[] = [];
    let affectedCampaignsCount = 0;

    setCampaigns(prev => prev.map(c => {
      if (!c.isSurfScaling) return c;

      const log = evaluateRules(c, rules);
      if (log) {
        newLogs.push(log);
        affectedCampaignsCount++;
        return { ...c, budget: log.newBudget }; // Update budget based on rule
      }
      return c;
    }));

    // Generate Summary
    const activeRulesCount = rules.filter(r => r.isEnabled).length;
    const monitoringCount = campaigns.filter(c => c.isSurfScaling).length;
    const timestamp = new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

    if (newLogs.length > 0) {
      setSurfLogs(prev => [...newLogs, ...prev]);
      const lastAction = newLogs[0];
      setAnalysisSummary(`
        **Surf Rapport (${timestamp}):** De engine monitort **${monitoringCount} campagnes**. 
        Er zijn **${newLogs.length} aanpassingen** gedaan op basis van **${activeRulesCount} actieve regels**. 
        Opvallend: Campagne "${lastAction.action}" triggerde een budget ${lastAction.newBudget > lastAction.oldBudget ? 'verhoging' : 'verlaging'}.
      `);
    } else {
      setAnalysisSummary(`
        **Surf Rapport (${timestamp}):** Alles rustig. De engine heeft **${monitoringCount} campagnes** geanalyseerd tegen **${activeRulesCount} regels**, maar geen afwijkingen gevonden die actie vereisen. De huidige performance valt binnen de gewenste marges.
      `);
    }
  };

  const updateToken = async () => {
    await saveSetting('api_token', apiTokenInput);
    await saveSetting('webhook_url', webhookUrl);
    alert('Instellingen opgeslagen in database!');
    syncAccounts();
  };

  const starredAccountsList = accounts.filter(a => a.isStarred);
  const otherAccountsList = accounts.filter(a => !a.isStarred && (accountSearch === '' || a.name.toLowerCase().includes(accountSearch.toLowerCase())));

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white p-12 rounded-[2.5rem] shadow-2xl text-center">
          <NodefyLogo className="mb-10 justify-center" />
          <div className="mb-8">
            <h2 className="text-xl font-black mb-1 text-slate-800">Surf Scaler <span className="text-orange-500">Pro</span></h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">High Performance Engine</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (password === 'nodefy123') setIsLoggedIn(true); else alert('Onjuist'); }}>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Wachtwoord" className="w-full p-4 bg-slate-100 rounded-2xl mb-4 text-center outline-none focus:ring-2 ring-slate-900 font-bold" autoFocus />
            <button className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-slate-200 active:scale-95 transition-transform">Unlock Dashboard</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:pl-64 bg-[#fcfcfd]">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-100 flex-col fixed inset-y-0 left-0 z-50 p-6">
        <NodefyLogo className="mb-10" />

        <div className="mb-8 px-4 py-4 bg-slate-900 rounded-2xl shadow-lg border border-slate-800">
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Active Engine</p>
          <h3 className="text-sm font-black text-white">Surf Scaler <span className="text-orange-500">Pro</span></h3>
        </div>

        <nav className="space-y-1 flex-1">
          <SidebarItem icon={<Icons.Dashboard />} label="Dashboard" active={activeTab === AppTab.DASHBOARD} onClick={() => setActiveTab(AppTab.DASHBOARD)} />
          <SidebarItem icon={<Icons.Settings />} label="Accounts" active={activeTab === AppTab.ACCOUNTS} onClick={() => setActiveTab(AppTab.ACCOUNTS)} />
          <SidebarItem
            icon={<Icons.Notification />}
            label="Notifications"
            active={activeTab === AppTab.NOTIFICATIONS}
            onClick={() => setActiveTab(AppTab.NOTIFICATIONS)}
            badge={notifications.filter(n => !n.isRead).length}
          />
          <SidebarItem icon={<Icons.Settings />} label="Instellingen" active={activeTab === AppTab.SETTINGS} onClick={() => setActiveTab(AppTab.SETTINGS)} />
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-orange-500 animate-pulse' : (globalError || accountError) ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
            <span className="text-[10px] font-bold uppercase text-slate-400">
              {isSyncing ? 'Updating...' : (globalError || accountError) ? 'System Error' : 'System Healthy'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-10 max-w-6xl mx-auto w-full pb-24">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-800">{activeTab === AppTab.ACCOUNTS ? 'Ad Accounts' : activeTab.replace('_', ' ')}</h1>
              <div className="h-6 w-[2px] bg-slate-200 hidden md:block"></div>
              <span className="text-sm font-black text-slate-900 hidden md:block">Surf Scaler <span className="text-orange-500">Pro</span></span>
            </div>
            <div className="flex items-center gap-2">
              {activeAccount && <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-[9px] font-bold uppercase">{activeAccount.name}</span>}
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedPeriod}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
            <button onClick={() => setSelectedPeriod('today')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors ${selectedPeriod === 'today' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Vandaag</button>
            <button onClick={() => setSelectedPeriod('yesterday')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors ${selectedPeriod === 'yesterday' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Gisteren</button>
            <button onClick={() => syncAccounts()} className="p-2 hover:bg-slate-50 rounded-lg transition-all text-slate-400"><Icons.Refresh /></button>
          </div>
        </header>

        <div className="animate-slide-up">
          {activeTab === AppTab.NOTIFICATIONS && (
            <div className="space-y-6 max-w-4xl">
              {notifications.length === 0 ? (
                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <Icons.Notification />
                  </div>
                  <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Geen notificaties gevonden.</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-start gap-5 transition-all hover:shadow-md">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                      <Icons.Notification />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-black text-sm text-slate-800">{n.message}</h4>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(n.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">{n.details}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === AppTab.DASHBOARD && (
            <div className="animate-slide-up space-y-8">
              {/* Header & Date Filter */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Surf Dashboard</h2>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Real-time Performance & Surf Control</p>
                </div>
                <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
                  {(['today', 'yesterday', 'last_7d'] as DatePeriod[]).map(p => (
                    <button
                      key={p}
                      onClick={() => setSelectedPeriod(p)}
                      className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${selectedPeriod === p ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                      {p.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats Overview */}
              <DashboardStats campaigns={campaigns} period={selectedPeriod} />

              {/* Schedule / Clock Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 w-full text-center">Active Schedule</h3>
                  <SurfClock schedule={activeHours} onToggleHour={toggleCustomHour} interval={scheduleInterval} />
                </div>
                <div className="md:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Schedule Configuration</h3>
                  <div className="flex gap-4 mb-8">
                    {(['1H', '3H', '6H', 'CUSTOM'] as Interval[]).map(int => (
                      <button
                        key={int}
                        onClick={() => updateSchedule(int)}
                        className={`flex-1 py-4 rounded-2xl font-black text-xs transition-all ${scheduleInterval === int
                          ? 'bg-slate-900 text-white shadow-lg scale-105'
                          : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                          }`}
                      >
                        {int === 'CUSTOM' ? 'Custom' : `Every ${int}`}
                      </button>
                    ))}
                  </div>
                  <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center font-bold">!</div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm mb-1">Webhook Simulation</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          De engine checkt automatisch op de geselecteerde uren ({activeHours.length} times/day).
                          Volgende check: <strong>{activeHours.find(h => h > new Date().getHours()) || activeHours[0]}:00</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT COLUMN: Campaign List & Surf Controls */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100">
                    <div className="flex flex-col gap-4 mb-6">
                      <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Campaigns</h3>
                        <button
                          onClick={runSurfAnalysis}
                          className="bg-orange-50 text-orange-500 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-orange-100 transition-colors"
                        >
                          Run Global Analysis
                        </button>
                      </div>

                      {/* Restore Filters */}
                      <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <select
                          value={filterObjective}
                          onChange={(e) => setFilterObjective(e.target.value)}
                          className="bg-white border-none rounded-xl px-3 py-2 text-[10px] font-bold text-slate-700 outline-none focus:ring-2 ring-slate-900 min-w-[120px]"
                        >
                          <option value="ALL">Doel: Alles</option>
                          <option value="SALES">Sales</option>
                          <option value="AWARENESS">Awareness</option>
                          <option value="TRAFFIC">Traffic</option>
                        </select>

                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl">
                          <span className="text-[9px] font-black text-slate-400 uppercase">Min Spend:</span>
                          <input
                            type="number"
                            value={filterMinSpend}
                            onChange={(e) => setFilterMinSpend(Number(e.target.value))}
                            className="w-16 bg-transparent text-[10px] font-bold text-slate-900 outline-none"
                            placeholder="0"
                          />
                        </div>

                        <button
                          onClick={() => setFilterActiveOnly(!filterActiveOnly)}
                          className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filterActiveOnly ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 hover:text-slate-600'}`}
                        >
                          {filterActiveOnly ? 'Alleen Actief' : 'Alle Status'}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {filteredCampaigns.map(campaign => (
                        <div key={campaign.id} className="group bg-slate-50 hover:bg-white p-5 rounded-3xl border border-slate-100 transition-all hover:shadow-lg hover:shadow-slate-200/50 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black ${campaign.isSurfScaling ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-slate-200 text-slate-400'}`}>
                              {campaign.isSurfScaling ? 'S' : 'M'}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800 text-sm">{campaign.name}</h4>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded border border-slate-100">ROAS: {campaign.roas}</span>
                                <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded border border-slate-100">CPA: €{campaign.cpa}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-right hidden sm:block">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Budget</p>
                              <p className="font-black text-slate-800">€{campaign.budget.toFixed(2)}</p>
                            </div>

                            <button
                              onClick={() => handleSurfToggle(campaign.id)}
                              className={`w-14 h-8 rounded-full transition-all relative ${campaign.isSurfScaling ? 'bg-slate-900' : 'bg-slate-300'}`}
                            >
                              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${campaign.isSurfScaling ? 'left-7' : 'left-1'}`} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Analysis Summary Box */}
                  {analysisSummary && (
                    <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl flex gap-4">
                      <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20">
                        <Icons.Check />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-white mb-2">Laatste Analyse</h4>
                        <div className="text-xs text-slate-300 space-y-1 leading-relaxed">
                          {analysisSummary.split('\n').map((line, i) => (
                            <p key={i} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: Tools & Charts */}
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Surf Wave</h3>
                    <SurfChart />
                  </div>

                  <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Rules Engine</h3>
                    <RuleConfig rules={rules} onSave={setRules} />
                  </div>

                  <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Activity Log</h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                      {surfLogs.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">Nog geen acties ondernomen.</p>
                      ) : (
                        surfLogs.map(log => (
                          <div key={log.id} className="text-xs border-l-2 border-orange-500 pl-3 py-1">
                            <p className="font-bold text-slate-800">{log.action}</p>
                            <p className="text-[10px] text-slate-500">
                              Budget: €{log.oldBudget.toFixed(2)} ➔ €{log.newBudget.toFixed(2)}
                            </p>
                            <p className="text-[8px] text-slate-300 uppercase tracking-widest mt-1">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === AppTab.SETTINGS && (
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm max-w-4xl">
              <h3 className="text-xl font-black mb-6 flex items-center gap-2 text-slate-800">
                <Icons.Settings /> Systeem Instellingen
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* API Token Section */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Meta API Token</label>
                    <textarea
                      value={apiTokenInput}
                      onChange={(e) => setApiTokenInput(e.target.value)}
                      className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-2 ring-slate-900 outline-none font-mono text-xs min-h-[150px]"
                      placeholder="Plak hier je Meta API token..."
                    />
                    <p className="text-[10px] text-slate-400 mt-2 italic font-medium leading-relaxed">Let op: Deze token wordt lokaal opgeslagen in je browser. Vernieuw de token als data niet meer laadt.</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Webhook URL</label>
                    <input
                      type="text"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-2 ring-slate-900 outline-none font-mono text-xs"
                      placeholder="https://hooks.slack.com/services/..."
                    />
                    <p className="text-[10px] text-slate-400 mt-2 italic font-medium leading-relaxed">Optioneel: Stuur notificaties naar Slack of Discord.</p>
                  </div>

                  <button
                    onClick={updateToken}
                    className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all w-full sm:w-auto"
                  >
                    Instellingen Opslaan
                  </button>
                </div>

                {/* User Management Section */}
                <div className="space-y-6 border-t md:border-t-0 md:border-l border-slate-100 md:pl-12 pt-6 md:pt-0">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Team Members</h4>

                  <div className="space-y-4">
                    {users.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-xs">{u.name}</p>
                            <p className="text-[9px] text-slate-400">{u.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] font-black bg-white border border-slate-200 px-2 py-1 rounded uppercase tracking-widest text-slate-500">{u.role}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nieuwe Gebruiker</label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        placeholder="E-mailadres..."
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        className="flex-1 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:ring-2 ring-slate-900"
                      />
                      <button
                        onClick={() => {
                          if (!newUserEmail) return;
                          setUsers([...users, { id: crypto.randomUUID(), name: newUserEmail.split('@')[0], email: newUserEmail, role: 'VIEWER', lastActive: Date.now() }]);
                          setNewUserEmail('');
                        }}
                        className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === AppTab.ACCOUNTS && (
            <div className="space-y-8">
              {/* Starred Accounts */}
              {starredAccountsList.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-2">
                    <Icons.Star active={true} /> Gefixeerde Accounts
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {starredAccountsList.map(acc => (
                      <button key={acc.id} onClick={() => selectAccount(acc.id)} className={`relative p-6 rounded-3xl border-2 text-left transition-all group ${acc.isActive ? 'border-slate-900 bg-white shadow-xl scale-[1.02]' : 'border-slate-100 bg-white hover:border-slate-300'}`}>
                        <button onClick={(e) => toggleStar(e, acc.id)} className="absolute top-6 right-6 p-2 hover:bg-slate-50 rounded-full">
                          <Icons.Star active={true} />
                        </button>
                        <div className="flex justify-between items-start mb-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-colors ${acc.isActive ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400'}`}>{acc.name.charAt(0)}</div>
                        </div>
                        <h4 className="font-black text-slate-800 transition-colors pr-8">{acc.name}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{acc.id}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Other Accounts */}
              <div className="space-y-4">
                <div className="flex items-center justify-between ml-2">
                  <button
                    onClick={() => setShowOtherAccounts(!showOtherAccounts)}
                    className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 hover:text-slate-600 transition-colors"
                  >
                    <Icons.Chevron open={showOtherAccounts} />
                    Alle Accounts ({otherAccountsList.length})
                  </button>
                  {showOtherAccounts && (
                    <div className="relative">
                      <Icons.Search />
                      <input
                        type="text"
                        value={accountSearch}
                        onChange={(e) => setAccountSearch(e.target.value)}
                        placeholder="Zoeken..."
                        className="bg-transparent border-b border-slate-200 text-[10px] font-bold uppercase ml-6 outline-none pb-1"
                      />
                    </div>
                  )}
                </div>

                {showOtherAccounts && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {otherAccountsList.map(acc => (
                      <button key={acc.id} onClick={() => selectAccount(acc.id)} className={`relative p-4 rounded-2xl border transition-all group ${acc.isActive ? 'border-slate-900 bg-white shadow-md' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                        <button onClick={(e) => toggleStar(e, acc.id)} className="absolute top-4 right-4 p-1 hover:bg-slate-50 rounded-full">
                          <Icons.Star active={false} />
                        </button>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${acc.isActive ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-300'}`}>{acc.name.charAt(0)}</div>
                          <div>
                            <h4 className="font-bold text-xs text-slate-700 truncate max-w-[150px]">{acc.name}</h4>
                            <p className="text-[8px] text-slate-400 font-bold">{acc.id}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}        </div>
      </main>

      {/* Mobile Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-100 flex justify-around items-center z-50 px-4 glass-header">
        <MobileLink icon={<Icons.Dashboard />} active={activeTab === AppTab.DASHBOARD} onClick={() => setActiveTab(AppTab.DASHBOARD)} />
        <MobileLink icon={<Icons.Settings />} active={activeTab === AppTab.ACCOUNTS} onClick={() => setActiveTab(AppTab.ACCOUNTS)} />
      </nav>
    </div>
  );
};

const SidebarItem = ({ icon, label, active, onClick, badge }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, badge?: number }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-black text-xs transition-all ${active ? 'bg-slate-900 text-white shadow-xl translate-x-1' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}>
    <div className={active ? 'text-orange-500' : ''}>{icon}</div>
    <span>{label}</span>
    {badge !== undefined && badge > 0 && (
      <span className="ml-auto bg-orange-500 text-white text-[9px] px-2 py-0.5 rounded-full shadow-sm">{badge}</span>
    )}
  </button>
);

const MobileLink = ({ icon, active, onClick }: { icon: React.ReactNode, active: boolean, onClick: () => void }) => (
  <button onClick={onClick} className={`p-2 rounded-xl transition-all ${active ? 'text-slate-900 scale-125' : 'text-slate-300'}`}>
    {icon}
  </button>
);

export default App;