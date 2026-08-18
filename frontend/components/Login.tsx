
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Mail, Loader2, Hospital, Zap, ShieldAlert, ChevronRight, HeartPulse, ShieldPlus, CheckCircle, X, Send, Key, RefreshCw, Check } from 'lucide-react';
import { toast } from 'sonner';
import { auditService } from '../services/auditService';
import { claimnxSessionService } from '../services/claimnx-session-service';

interface LoginProps {
  onLogin: (username: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState(() => localStorage.getItem('claimnx_remember_email') || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('claimnx_remember_email') !== null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  // Forgot Password States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [sentOtp, setSentOtp] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');

  // Handle open forgot modal with prefilled email
  const handleOpenForgotModal = () => {
    setResetEmail(email.trim());
    setNewPassword('');
    setConfirmPassword('');
    setOtpCode('');
    setSentOtp(null);
    setResetDone(false);
    setResetSuccessMsg('');
    setShowForgotModal(true);
  };

  // Sync rememberMe to localStorage whenever email or rememberMe changes
  useEffect(() => {
    try {
      if (rememberMe && email.trim()) {
        localStorage.setItem('claimnx_remember_email', email.trim());
      } else if (!rememberMe) {
        localStorage.removeItem('claimnx_remember_email');
      }
    } catch (e) {
      console.warn("Storage error on remember facility", e);
    }
  }, [email, rememberMe]);

  useEffect(() => {
    const markOnline = () => setIsOnline(true);
    const markOffline = () => setIsOnline(false);
    window.addEventListener('online', markOnline);
    window.addEventListener('offline', markOffline);
    return () => {
      window.removeEventListener('online', markOnline);
      window.removeEventListener('offline', markOffline);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Ensure Remember Facility state is saved immediately
    try {
      if (rememberMe && email.trim()) {
        localStorage.setItem('claimnx_remember_email', email.trim());
      } else {
        localStorage.removeItem('claimnx_remember_email');
      }
    } catch (e) {
      console.warn("Storage quota error on Login", e);
    }

    try {
      // The NestJS API is the source of truth for production authentication.
      await claimnxSessionService.login(email.trim(), password);

      auditService.log({
        userId: email.trim(),
        action: 'USER_LOGIN',
        resourceType: 'Auth',
        resourceId: email.trim(),
        newValues: { email: email.trim(), loginTime: new Date().toISOString() },
      });

      onLogin(email.trim());
      return;
    } catch (backendAuthError: unknown) {
      claimnxSessionService.clear();
      localStorage.removeItem('claimnx_manual_auth');
      setError(
        backendAuthError instanceof Error
          ? backendAuthError.message
          : 'Unable to sign in. Please try again.',
      );
      return;
    }
    finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast.error("Please enter a valid registered email address.");
      return;
    }
    // Password reset must be delivered and verified by a backend identity
    // provider. Never generate OTPs or mutate passwords in browser storage.
    setError('Password reset is not available in this build. Contact your system administrator.');
  };

  const handleVerifyOtpAndReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sentOtp || otpCode.trim() !== sentOtp) {
      toast.error("Invalid OTP verification code. Please check and try again.");
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      toast.error("New password must be at least 4 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match. Please re-enter.");
      return;
    }

    setError('Password reset must be completed through the backend identity service.');
  };


  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 lg:p-8 font-sans relative overflow-hidden">
      {/* Decorative medical background elements */}
      <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none hidden lg:block">
        <HeartPulse size={400} className="text-[#000080]" />
      </div>
      <div className="absolute bottom-0 left-0 p-12 opacity-5 pointer-events-none hidden lg:block">
        <ShieldPlus size={300} className="text-[#000080]" />
      </div>

      <div className="max-w-[1400px] w-full grid grid-cols-1 lg:grid-cols-12 bg-white rounded-[2.5rem] lg:rounded-[3.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,128,0.1)] overflow-hidden border border-slate-100 min-h-[700px] lg:min-h-[800px] relative z-10">
        
        {/* Left Side: Branding */}
        <div className="lg:col-span-5 bg-[#000040] p-12 lg:p-20 text-white flex flex-col justify-between relative overflow-hidden hidden lg:flex">
          
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Hospital size={350} className="rotate-12 translate-x-24 translate-y-[-60px] text-white" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center space-x-4 mb-20">
              <div>
                <h1 className="text-4xl lg:text-5xl font-black tracking-tighter uppercase leading-none text-white drop-shadow-sm">
                    Claim<span className="text-teal-400">NX</span>
                </h1>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-200 mt-2">The Next Generation of Claims</p>
              </div>
            </div>
            
            <h2 className="text-4xl lg:text-6xl font-black leading-tight mb-8 uppercase tracking-tighter text-white drop-shadow-md">
              Automating the <br /> <span className="text-blue-400">Cashless</span> <br /> Lifecycle.
            </h2>
            
            <p className="text-blue-50 text-base lg:text-lg font-medium leading-relaxed max-w-md mb-12 opacity-90">
              A unified platform for hospitals to manage pre-authorization, enhancements, and final settlements with AI-driven efficiency.
            </p>

            <div className="space-y-8">
              <div className="flex items-center space-x-5">
                <div className="p-4 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-md shadow-inner">
                  <ShieldCheck size={28} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-blue-300">Authorized Access</p>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">256-bit AES Payer-Grade Encryption</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-8 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">
                {isOnline ? 'Network Connected' : 'Network Unavailable'}
              </p>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/50">V 2.5.0-PRO</p>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="lg:col-span-7 p-10 lg:p-24 flex flex-col justify-center bg-white relative">
          <div className="max-w-md mx-auto w-full">
            <div className="mb-12">
              <div className="inline-flex lg:hidden items-center space-x-3 mb-10 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-10 h-10 bg-[#000040] rounded-xl flex items-center justify-center text-white">
                  <Zap size={20} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-blue-950 uppercase tracking-tighter leading-none">Claim<span className="text-teal-600">NX</span></h1>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Institutional Portal</p>
                </div>
              </div>
              <h3 className="text-3xl lg:text-4xl font-black text-slate-800 uppercase tracking-tighter mb-4">Institutional Sign-In</h3>
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest leading-relaxed">Enter your credentials to access ClaimNX.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {error && (
                <div className="p-5 bg-rose-50 border border-rose-100 text-rose-600 rounded-3xl text-[11px] font-bold flex items-center animate-in slide-in-from-top-2">
                  <ShieldAlert size={18} className="mr-3 shrink-0" /> {error}
                </div>
              )}

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Log-in ID (Official Email)</label>
                <div className="relative group">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#000080] transition-colors" size={20} />
                  <input 
                    type="email" 
                    required
                    placeholder="admin@medicity-hospital.com"
                    value={email}
                    onChange={(e) => {
                      const newEmail = e.target.value;
                      setEmail(newEmail);
                      if (rememberMe) {
                        localStorage.setItem('claimnx_remember_email', newEmail);
                      }
                    }}
                    className="w-full pl-16 pr-8 py-6 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm font-bold text-slate-700 outline-none focus:ring-8 focus:ring-blue-50/50 focus:border-[#000080] focus:bg-white transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Access Key</label>
                  <button 
                    type="button" 
                    onClick={handleOpenForgotModal} 
                    className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest cursor-pointer transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#000080] transition-colors" size={20} />
                  <input 
                    type="password" 
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-16 pr-8 py-6 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm font-bold text-slate-700 outline-none focus:ring-8 focus:ring-blue-50/50 focus:border-[#000080] focus:bg-white transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 py-2 px-1">
                <div className="relative flex items-center">
                  <input 
                    type="checkbox" 
                    id="remember" 
                    checked={rememberMe}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setRememberMe(isChecked);
                      if (isChecked && email.trim()) {
                        localStorage.setItem('claimnx_remember_email', email.trim());
                      } else {
                        localStorage.removeItem('claimnx_remember_email');
                      }
                    }}
                    className="peer w-6 h-6 opacity-0 absolute cursor-pointer z-10" 
                  />
                  <div className="w-6 h-6 bg-slate-100 border border-slate-200 rounded-xl peer-checked:bg-[#000080] peer-checked:border-[#000080] transition-all flex items-center justify-center shadow-xs">
                    <CheckCircle size={14} className="text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                </div>
                <label htmlFor="remember" className="text-[10px] font-black text-slate-600 uppercase tracking-widest cursor-pointer select-none hover:text-[#000080] transition-colors">Remember this Facility</label>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-6 bg-[#000080] text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.25em] shadow-[0_25px_50px_-15px_rgba(0,0,128,0.4)] hover:bg-blue-700 transition-all flex items-center justify-center group active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin mr-3" size={22} />
                  ) : (
                    <>Enter Portal Hub <ChevronRight className="ml-3 group-hover:translate-x-1.5 transition-transform" size={20} /></>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-16 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-relaxed">
                ©2026 ClaimNX. All Rights Reserved.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
            <div className="p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <Key size={20} className="text-[#000080]" /> Account Recovery
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Reset your institutional access key</p>
              </div>
              <button onClick={() => setShowForgotModal(false)} className="p-2 text-slate-400 hover:bg-white hover:text-slate-700 rounded-2xl transition-all cursor-pointer"><X size={20} /></button>
            </div>

            <div className="p-8 space-y-6">
              {!resetDone ? (
                <>
                  {sentOtp ? (
                    <form onSubmit={handleVerifyOtpAndReset} className="space-y-4 animate-in fade-in duration-200">
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold leading-relaxed">
                        <p className="flex items-center gap-2 text-emerald-900 font-black mb-1">
                          <CheckCircle size={16} /> OTP Sent Successfully
                        </p>
                        A 6-digit OTP code has been dispatched to <span className="underline font-black">{resetEmail}</span>.
                        <div className="mt-2 pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px]">
                          <span>Verification Code:</span>
                          <span className="font-mono bg-emerald-100 px-2.5 py-1 rounded-lg text-emerald-950 font-black tracking-widest text-xs">{sentOtp}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">6-Digit OTP Code</label>
                        <input 
                          type="text" 
                          required
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          className="w-full px-6 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-center font-mono font-black tracking-[0.5em] text-lg outline-none focus:ring-4 focus:ring-blue-50 focus:border-[#000080]"
                          placeholder="••••••"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">New Password</label>
                        <input 
                          type="password" 
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-6 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-50 focus:border-[#000080]"
                          placeholder="••••••••••••"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Confirm New Password</label>
                        <input 
                          type="password" 
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-6 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-50 focus:border-[#000080]"
                          placeholder="••••••••••••"
                        />
                      </div>

                      <div className="pt-2 space-y-2">
                        <button 
                          type="submit" 
                          disabled={isResetting}
                          className="w-full py-4 bg-[#000080] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center disabled:opacity-50 cursor-pointer hover:bg-blue-800 transition-all"
                        >
                          {isResetting ? <Loader2 className="animate-spin mr-2" size={18} /> : <Check size={18} className="mr-2" />}
                          Verify OTP & Reset Password
                        </button>

                        <button 
                          type="button"
                          onClick={() => setSentOtp(null)}
                          className="w-full py-2.5 text-slate-500 hover:text-slate-800 font-extrabold text-[10px] uppercase tracking-wider cursor-pointer"
                        >
                          ← Change Email or Resend OTP
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleSendOtp} className="space-y-5 animate-in fade-in duration-200">
                      <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                        Enter your registered hospital user email address. We will send an OTP code to reset your password.
                      </p>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Registered Hospital User Email</label>
                        <input 
                          type="email" 
                          required
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-50 focus:border-[#000080]"
                          placeholder="billing@yourhospital.com"
                        />
                      </div>
                      <button 
                        type="submit" 
                        disabled={isResetting}
                        className="w-full py-5 bg-[#000080] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center disabled:opacity-50 cursor-pointer hover:bg-blue-800 transition-all"
                      >
                        {isResetting ? <Loader2 className="animate-spin mr-2" size={18} /> : <Send size={18} className="mr-2" />}
                        Send OTP
                      </button>
                    </form>
                  )}
                </>
              ) : (
                <div className="text-center py-6 animate-in zoom-in-95">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <CheckCircle size={40} />
                  </div>
                  <h4 className="text-xl font-black text-slate-800 uppercase mb-2">Access Key Reset Complete</h4>
                  <p className="text-slate-500 text-xs font-semibold leading-relaxed max-w-sm mx-auto mb-6">
                    {resetSuccessMsg || `Your Access Key has been updated for ${resetEmail}.`}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-8 py-4 bg-[#000080] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-800 transition-all cursor-pointer"
                  >
                    Return to Sign-In
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
