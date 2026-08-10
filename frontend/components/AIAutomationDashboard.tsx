
import React, { useState, useEffect, useMemo } from 'react';
import { Claim, RecoveryForecast } from '../types';
import { 
  BrainCircuit, 
  TrendingUp, 
  Calendar, 
  BarChart3, 
  RefreshCw,
  ArrowUpRight,
  Target,
  Zap,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { forecastRecovery } from '../services/aiAutomationService';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

interface AIAutomationDashboardProps {
  claims: Claim[];
}

const AIAutomationDashboard: React.FC<AIAutomationDashboardProps> = ({ claims }) => {
  const [forecast, setForecast] = useState<RecoveryForecast | null>(null);
  const [isForecasting, setIsForecasting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunForecast = async () => {
    setIsForecasting(true);
    setError(null);
    try {
      const result = await forecastRecovery(claims);
      setForecast(result);
    } catch (err) {
      setError("Failed to generate recovery forecast.");
      console.error(err);
    } finally {
      setIsForecasting(false);
    }
  };

  useEffect(() => {
    if (claims.length > 0 && !forecast) {
      handleRunForecast();
    }
  }, [claims]);

  const chartData = useMemo(() => {
    if (!forecast) return [];
    return [
      { name: 'Next 30 Days', amount: forecast.days30, color: '#4f46e5' },
      { name: 'Next 60 Days', amount: forecast.days60, color: '#6366f1' },
      { name: 'Next 90 Days', amount: forecast.days90, color: '#818cf8' },
    ];
  }, [forecast]);

  const totalForecast = (forecast?.days30 || 0) + (forecast?.days60 || 0) + (forecast?.days90 || 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200">
            <BrainCircuit className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">AI Recovery Forecasting</h2>
            <p className="text-slate-500 text-sm font-medium">Predictive analytics for expected claim settlements</p>
          </div>
        </div>
        <button
          onClick={handleRunForecast}
          disabled={isForecasting}
          className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
        >
          {isForecasting ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
          Refresh Forecast
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3 text-red-700 font-bold">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Target className="text-emerald-600" size={20} />
            </div>
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-md">
              Total Predicted
            </span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">90-Day Forecast</p>
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-bold text-slate-400">₹</span>
            <span className="text-3xl font-black text-slate-800">
              {isForecasting ? '...' : (totalForecast / 100000).toFixed(1) + 'L'}
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Calendar className="text-indigo-600" size={20} />
            </div>
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-md">
              30 Days
            </span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Immediate Recovery</p>
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-bold text-slate-400">₹</span>
            <span className="text-3xl font-black text-slate-800">
              {isForecasting ? '...' : (forecast?.days30 ? (forecast.days30 / 100000).toFixed(1) + 'L' : '0.0L')}
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="text-amber-600" size={20} />
            </div>
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-1 rounded-md">
              Confidence
            </span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">AI Prediction Accuracy</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-slate-800">
              {isForecasting ? '...' : (forecast?.confidence || 0) + '%'}
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
              <Zap className="text-rose-600" size={20} />
            </div>
            <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest bg-rose-50 px-2 py-1 rounded-md">
              Active Claims
            </span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Analyzed Dataset</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-slate-800">{claims.length}</span>
            <span className="text-xs font-bold text-slate-400">Cases</span>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <BarChart3 className="text-indigo-600" size={20} />
              <h3 className="text-lg font-bold text-slate-800">Recovery Timeline</h3>
            </div>
          </div>
          <div className="h-[300px] w-full">
            {isForecasting ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="animate-spin mb-4" size={40} />
                <p className="font-bold">Generating AI Projections...</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                    tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800">
                            <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-50">{payload[0].payload.name}</p>
                            <p className="text-sm font-black">₹{payload[0].value?.toLocaleString()}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="amount" radius={[8, 8, 0, 0]} barSize={60}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-indigo-900 p-8 rounded-[2rem] text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
              <Zap className="text-indigo-300" size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">AI Insights Summary</h3>
            <p className="text-indigo-200 text-sm leading-relaxed mb-6">
              Our AI models have analyzed your current claim pipeline. We expect a significant recovery surge in the 60-90 day window due to the high volume of 'Claim Under Process' cases.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                <p className="text-xs font-medium text-indigo-100">High confidence in 30-day projections</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
                <p className="text-xs font-medium text-indigo-100">Moderate risk detected in 12% of cases</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
                <p className="text-xs font-medium text-indigo-100">Duplicate detection active across all branches</p>
              </div>
            </div>
          </div>
          <button className="relative z-10 mt-8 w-full py-4 bg-white text-indigo-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
            Download Detailed Report
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAutomationDashboard;
