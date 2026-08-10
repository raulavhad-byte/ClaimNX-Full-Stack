
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Claim, ClaimStatus } from '../types';
import { Briefcase, Activity, Calendar, User, MoreVertical, Stethoscope, LayoutGrid, List, PlayCircle, Clock } from 'lucide-react';
import { formatDate } from '../utils';

interface ManageCasesProps {
  claims: Claim[];
}

const ManageCases: React.FC<ManageCasesProps> = ({ claims }) => {
  const [viewType, setViewType] = useState<'grid' | 'list'>('list');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Manage Cases</h1>
          <p className="text-slate-500 text-sm">Clinical overview of ongoing medical cases and admissions.</p>
        </div>
        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
           <button 
            onClick={() => setViewType('grid')}
            className={`p-1.5 rounded-lg transition-all ${viewType === 'grid' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
           >
             <LayoutGrid size={18} />
           </button>
           <button 
            onClick={() => setViewType('list')}
            className={`p-1.5 rounded-lg transition-all ${viewType === 'list' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
           >
             <List size={18} />
           </button>
        </div>
      </div>

      {viewType === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {claims.map((claim) => (
            <div key={claim.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all group">
              <div className="p-5 border-b border-slate-50 flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <User size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 truncate max-w-[150px]">{claim.patientName}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Case ID: {claim.patientId}</p>
                  </div>
                </div>
                <button className="text-slate-300 hover:text-slate-600 transition-colors"><MoreVertical size={18} /></button>
              </div>
              
              <div className="p-5 space-y-4">
                <div className="flex items-center text-xs text-slate-600">
                  <Stethoscope size={14} className="mr-2 text-indigo-400" />
                  <span className="font-semibold truncate">{claim.diagnosis || 'Provisional Diagnosis Pending'}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Admission</p>
                    <div className="flex items-center text-xs font-bold text-slate-700">
                      <Calendar size={12} className="mr-1 text-slate-400" /> {formatDate(claim.admissionDate)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Est. Stay</p>
                    <div className="flex items-center text-xs font-bold text-slate-700">
                      <Activity size={12} className="mr-1 text-slate-400" /> 3-4 Days
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 bg-slate-50 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  claim.status === ClaimStatus.PRE_AUTH_INITIATED ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-600'
                }`}>
                  {claim.status}
                </span>
              </div>
              
              <div className="px-5 py-3 border-t border-slate-50 bg-white">
                <Link 
                  to={`/process-claim/${claim.id}`}
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                >
                  <PlayCircle size={14} className="mr-1.5" /> Process Case
                </Link>
              </div>
            </div>
          ))}

          <Link to="/new-claim" className="border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-8 text-slate-400 hover:border-blue-400 hover:text-blue-400 transition-all cursor-pointer">
             <Briefcase size={32} className="mb-2 opacity-50" />
             <p className="text-sm font-bold">New Admission</p>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Case Details</th>
                  <th className="px-6 py-4">Diagnosis</th>
                  <th className="px-6 py-4">Admission Date</th>
                  <th className="px-6 py-4">Insurance Status</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {claims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <User size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{claim.patientName}</p>
                          <p className="text-[9px] font-mono text-slate-400 uppercase">UID: {claim.patientId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-xs text-slate-600">
                        <Stethoscope size={14} className="mr-2 text-indigo-300" />
                        <span className="max-w-[200px] truncate">{claim.diagnosis || 'Pending Clinical Diagnosis'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-xs text-slate-600">
                        <Calendar size={14} className="mr-2 text-slate-300" />
                        {formatDate(claim.admissionDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-lg border text-[10px] font-bold uppercase ${
                        claim.status === ClaimStatus.PRE_AUTH_INITIATED 
                          ? 'bg-amber-50 text-amber-700 border-amber-100' 
                          : 'bg-blue-50 text-blue-600 border-blue-100'
                      }`}>
                        <Clock size={12} className="mr-1" /> {claim.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link 
                        to={`/process-claim/${claim.id}`}
                        className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                      >
                        <PlayCircle size={14} className="mr-1.5" /> Process
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageCases;
