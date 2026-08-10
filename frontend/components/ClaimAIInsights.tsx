
import React, { useState, useEffect } from 'react';
import { Claim, ClaimAIInsights } from '../types';
import { 
  BrainCircuit, 
  TrendingUp, 
  AlertTriangle, 
  Copy, 
  ShieldAlert, 
  RefreshCw,
  CheckCircle2,
  XCircle,
  Info
} from 'lucide-react';
import { performFullAIAnalysis } from '../services/aiAutomationService';

interface ClaimAIInsightsProps {
  claim: Claim;
  allClaims: Claim[];
  onUpdate: (updatedClaim: Claim) => void;
}

const ClaimAIInsightsPanel: React.FC<ClaimAIInsightsProps> = ({ claim, allClaims, onUpdate }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const insights = await performFullAIAnalysis(claim, allClaims);
      onUpdate({
        ...claim,
        aiInsights: insights
      });
    } catch (err) {
      setError("Failed to perform AI analysis. Please try again.");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const insights = claim.aiInsights;

  if (!insights && !isAnalyzing) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <BrainCircuit className="text-indigo-600" size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">AI Automation Insights</h3>
        <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
          Run AI analysis to predict recovery likelihood, detect duplicates, and identify potential fraud patterns for this claim.
        </p>
        <button
          onClick={handleRunAnalysis}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all flex items-center gap-2 mx-auto"
        >
          <Sparkles size={18} />
          Run AI Analysis
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <BrainCircuit className="text-white" size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">AI Automation Insights</h3>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              Last analyzed: {insights?.lastAnalyzedAt ? new Date(insights.lastAnalyzedAt).toLocaleString() : 'Never'}
            </p>
          </div>
        </div>
        <button
          onClick={handleRunAnalysis}
          disabled={isAnalyzing}
          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-50"
          title="Refresh Analysis"
        >
          <RefreshCw size={18} className={isAnalyzing ? 'animate-spin' : ''} />
        </button>
      </div>

      {isAnalyzing && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-8 text-center animate-pulse">
          <Loader2 className="animate-spin text-indigo-600 mx-auto mb-4" size={32} />
          <p className="text-indigo-900 font-bold">AI is analyzing claim patterns...</p>
          <p className="text-indigo-600 text-xs mt-1">Checking risk, duplicates, and fraud indicators</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3 text-red-700 text-sm">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {!isAnalyzing && insights && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recovery Risk Score */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="text-emerald-500" size={18} />
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Recovery Risk Score</h4>
              </div>
              <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                insights.riskScore?.likelihood === 'High' ? 'bg-emerald-100 text-emerald-700' :
                insights.riskScore?.likelihood === 'Medium' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                {insights.riskScore?.likelihood} Likelihood
              </div>
            </div>
            <div className="flex items-end gap-2 mb-4">
              <span className="text-4xl font-black text-slate-800 leading-none">{insights.riskScore?.score}</span>
              <span className="text-slate-400 font-bold text-sm pb-1">/ 100</span>
            </div>
            <div className="space-y-3">
              <div className="text-xs text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-800">Recommendation:</span> {insights.riskScore?.recommendation}
              </div>
              <div className="flex flex-wrap gap-2">
                {insights.riskScore?.factors.map((factor, idx) => (
                  <span key={idx} className="px-2 py-1 bg-slate-50 text-slate-500 text-[10px] font-bold rounded-md border border-slate-100">
                    {factor}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Fraud Risk Detection */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="text-rose-500" size={18} />
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Fraud Risk Detection</h4>
              </div>
              <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                insights.fraudRisk?.riskLevel === 'None' ? 'bg-emerald-100 text-emerald-700' :
                insights.fraudRisk?.riskLevel === 'Low' ? 'bg-blue-100 text-blue-700' :
                insights.fraudRisk?.riskLevel === 'Medium' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                {insights.fraudRisk?.riskLevel} Risk
              </div>
            </div>
            <div className="flex items-end gap-2 mb-4">
              <span className="text-4xl font-black text-slate-800 leading-none">{insights.fraudRisk?.score}</span>
              <span className="text-slate-400 font-bold text-sm pb-1">/ 100</span>
            </div>
            <div className="space-y-2">
              {insights.fraudRisk?.suspiciousPatterns.length === 0 ? (
                <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold">
                  <CheckCircle2 size={14} />
                  No suspicious patterns detected
                </div>
              ) : (
                insights.fraudRisk?.suspiciousPatterns.map((pattern, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-slate-600 text-xs">
                    <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={14} />
                    <span>{pattern}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Duplicate Detection */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Copy className="text-indigo-500" size={18} />
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Duplicate Claim Detection</h4>
              </div>
              {insights.duplicateDetection?.isPotentialDuplicate ? (
                <div className="flex items-center gap-1 text-rose-600 text-[10px] font-black uppercase tracking-widest">
                  <XCircle size={14} />
                  Potential Duplicate
                </div>
              ) : (
                <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                  <CheckCircle2 size={14} />
                  Unique Claim
                </div>
              )}
            </div>
            
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-2 font-medium">AI Analysis Result:</p>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed italic">
                  "{insights.duplicateDetection?.reason}"
                </div>
              </div>
              
              {insights.duplicateDetection?.isPotentialDuplicate && (
                <div className="w-full md:w-64">
                  <p className="text-xs text-slate-500 mb-2 font-medium">Matching Claims:</p>
                  <div className="space-y-2">
                    {insights.duplicateDetection?.matchingClaimIds.map(id => (
                      <div key={id} className="flex items-center justify-between p-2 bg-rose-50 border border-rose-100 rounded-lg">
                        <span className="text-[10px] font-bold text-rose-700">{id}</span>
                        <span className="text-[10px] font-black text-rose-400">{insights.duplicateDetection?.matchConfidence}% Match</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaimAIInsightsPanel;

const Sparkles = ({ size = 24, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);

const Loader2 = ({ size = 24, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);
