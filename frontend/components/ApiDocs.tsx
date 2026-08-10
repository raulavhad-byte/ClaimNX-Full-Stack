import React from 'react';
import { ApiEndpoint } from '../types';
import { Terminal, CheckCircle2, AlertCircle } from 'lucide-react';

interface ApiDocsProps {
  endpoints: ApiEndpoint[];
}

export const ApiDocs: React.FC<ApiDocsProps> = ({ endpoints }) => {
  return (
    <div className="space-y-8">
      {endpoints.map((endpoint, idx) => (
        <div key={idx} className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950 shadow-xl">
          <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border-b border-zinc-800">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              endpoint.method === 'GET' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
              endpoint.method === 'POST' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
              'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {endpoint.method}
            </span>
            <code className="text-sm font-mono text-zinc-300">{endpoint.path}</code>
          </div>
          
          <div className="p-4 space-y-6">
            <div>
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">Description</h4>
              <p className="text-sm text-zinc-400 leading-relaxed">{endpoint.description}</p>
            </div>

            {endpoint.requestBody && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Terminal size={12} /> Request Body
                </h4>
                <pre className="p-3 bg-black rounded border border-zinc-800 text-xs font-mono text-zinc-400 overflow-x-auto">
                  {endpoint.requestBody}
                </pre>
              </div>
            )}

            <div>
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <CheckCircle2 size={12} /> Validation Rules
              </h4>
              <div className="grid gap-2">
                {endpoint.validationRules.map((rule, rIdx) => (
                  <div key={rIdx} className="flex items-start gap-3 p-2 rounded bg-zinc-900/50 border border-zinc-800/50">
                    <div className="mt-1">
                      <AlertCircle size={14} className="text-zinc-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <code className="text-[11px] font-mono text-zinc-300">{rule.field}</code>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-mono uppercase">
                          {rule.rule}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5">{rule.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
