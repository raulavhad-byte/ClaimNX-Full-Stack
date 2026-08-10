import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, X, Send, Loader2, User, Bot, RefreshCw, Zap, 
  ShieldAlert, AlertTriangle, FileText, CheckCircle2, ChevronRight, 
  Star, Clock, Ticket, AlertCircle, Maximize2, Minimize2, ExternalLink
} from 'lucide-react';
import { chatbotService, ChatMessage } from '../services/chatbotService';
import { Claim } from '../types';
import { toast } from 'sonner';

interface ChatBotProps {
  claims: Claim[];
  currentUser?: any;
}

const QUICK_ACTIONS = [
  { id: 'status', label: 'Check Claim Status', icon: Zap, text: 'Check status for my recent active claims' },
  { id: 'pending_docs', label: 'Pending Documents', icon: FileText, text: 'Which documents are pending for my claim?' },
  { id: 'deduction', label: 'Explain Deductions', icon: AlertCircle, text: 'Why was an amount deducted from my claim?' },
  { id: 'rejection', label: 'Rejection Clarification', icon: ShieldAlert, text: 'Explain the reason for claim rejection' },
  { id: 'payment', label: 'Payment & Settlement', icon: CheckCircle2, text: 'What is the payment settlement status?' },
];

const ChatBot: React.FC<ChatBotProps> = ({ claims = [], currentUser }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);

  // Filter claims strictly by user's assigned hospital / identity
  const userFilteredClaims = useMemo(() => {
    if (!claims || claims.length === 0) return [];
    if (!currentUser) return claims;

    const roleUpper = currentUser.role?.toUpperCase() || '';
    if (roleUpper === 'SUPER ADMIN') {
      return claims;
    }

    const userHospId = currentUser.hospitalId || currentUser.id;
    const userHospName = currentUser.hospitalName || currentUser.displayName || currentUser.name;
    const assignedIds = currentUser.assignedHospitalIds || currentUser.assignedHospitals || [];

    return claims.filter(c => {
      const claimHospId = c.formData?.hospitalId || (c as any).hospitalId;
      const claimHospName = c.formData?.hospitalName || c.formData?.hospital || (c as any).hospitalName || (c as any).hospital;
      
      if (userHospId && claimHospId && claimHospId === userHospId) return true;
      if (assignedIds.length > 0 && claimHospId && assignedIds.includes(claimHospId)) return true;
      if (userHospName && claimHospName && String(claimHospName).toLowerCase() === String(userHospName).toLowerCase()) return true;
      
      if (roleUpper.includes('HOSPITAL') || currentUser.hospitalId) {
        return false;
      }
      return true;
    });
  }, [claims, currentUser]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: `Hello! I'm **ClaimAssist AI**, your intelligent ClaimNX assistant. I can help you check cashless status, understand deductions, or verify pending documents for your hospital.\n\nHow can I assist you today?`,
      timestamp: new Date(),
      suggestedActions: ["Check Claim Status", "Which documents are pending?", "Explain my deduction"]
    }
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Feedback state
  const [showFeedbackWidget, setShowFeedbackWidget] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackResolved, setFeedbackResolved] = useState<boolean | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  // Set default selected claim if user has 1 claim in their scope
  useEffect(() => {
    if (userFilteredClaims && userFilteredClaims.length === 1 && !selectedClaimId) {
      setSelectedClaimId(userFilteredClaims[0].id);
    }
  }, [userFilteredClaims, selectedClaimId]);

  const handleSend = async (textToSend: string = inputValue) => {
    const text = textToSend.trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      text: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const historyFormatted = messages.map(m => ({
        role: m.role,
        text: m.text
      }));

      const userContext = {
        userId: currentUser?.id,
        displayName: currentUser?.displayName || currentUser?.name,
        role: currentUser?.role || 'Hospital Staff',
        hospitalId: currentUser?.hospitalId,
        hospitalName: currentUser?.hospitalName || currentUser?.displayName,
        assignedHospitalIds: currentUser?.assignedHospitalIds || currentUser?.assignedHospitals || []
      };

      const response = await chatbotService.sendMessage({
        userMessage: text,
        history: historyFormatted,
        userContext,
        claims: userFilteredClaims,
        selectedClaimId: selectedClaimId || undefined
      });

      // Filter out any agent handoff action suggestions
      const cleanedSuggestedActions = (response.suggestedActions || []).filter(
        (a: string) => !a.toLowerCase().includes('agent') && !a.toLowerCase().includes('support desk')
      );

      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        role: 'model',
        text: response.reply || "I have processed your request.",
        timestamp: new Date(),
        intent: response.intent,
        category: response.category,
        selectedClaim: response.selectedClaim,
        citation: response.citation,
        isEmergency: response.isEmergency,
        suggestedActions: cleanedSuggestedActions.length > 0 ? cleanedSuggestedActions : undefined
      };

      if (response.selectedClaim?.id) {
        setSelectedClaimId(response.selectedClaim.id);
      }

      setMessages(prev => [...prev, botMsg]);

    } catch (error) {
      console.error("Chatbot processing error:", error);
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'model',
        text: "I experienced a temporary communication glitch. You can check claims in your directory or try again shortly.",
        timestamp: new Date(),
        suggestedActions: ["Check Claim Status", "Which documents are pending?"]
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleNavigateToPatient = (patientName: string, claimId?: string) => {
    if (!patientName) return;
    const targetUrl = claimId ? `/process-claim/${claimId}?source=chatbot` : `/process-claim/CPC-101?source=chatbot`;
    setIsOpen(false);
    navigate(targetUrl);
  };

  const handleQuickAction = (actionText: string) => {
    if (actionText.toLowerCase().includes('open') && actionText.toLowerCase().includes('dashboard')) {
      const matchClaim = userFilteredClaims.find(c => c.patientName && actionText.toLowerCase().includes(c.patientName.toLowerCase()));
      if (matchClaim) {
        handleNavigateToPatient(matchClaim.patientName, matchClaim.id);
        return;
      }
      if (selectedClaimObject) {
        handleNavigateToPatient(selectedClaimObject.patientName, selectedClaimObject.id);
        return;
      }
    }
    handleSend(actionText);
  };

  const renderFormattedText = (text: string) => {
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-blue-700 px-1.5 py-0.5 rounded font-mono text-[11px]">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" data-nav="$2" class="text-blue-700 font-black underline hover:text-blue-900 cursor-pointer">$1 ↗</a>')
      .replace(/\n/g, '<br/>');

    // Automatically transform patient names into clickable hyperlinks for active hospital claims
    userFilteredClaims.forEach(c => {
      if (c.patientName && c.patientName.trim().length > 2) {
        const pName = c.patientName.trim();
        const safePName = pName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        // Look for occurrences of patient name not already inside an <a> tag
        const regex = new RegExp(`(?<!<[^>]*)\\b(${safePName})\\b(?![^<]*>)`, 'gi');
        const targetUrl = `/process-claim/${c.id}?source=chatbot`;
        formatted = formatted.replace(regex, `<a href="${targetUrl}" data-nav="${targetUrl}" class="text-blue-700 font-black underline hover:text-blue-900 cursor-pointer inline-flex items-center gap-0.5">$1 ↗</a>`);
      }
    });

    return (
      <div 
        className="prose prose-sm prose-p:my-1.5 prose-strong:text-slate-900 prose-strong:font-black prose-ul:my-1 prose-li:my-0.5 max-w-none text-[13px]" 
        onClick={(e) => {
          const target = e.target as HTMLElement;
          const anchor = target.closest('a');
          const navUrl = anchor?.getAttribute('data-nav') || anchor?.getAttribute('href') || target.getAttribute('data-nav') || target.getAttribute('href');
          if (navUrl && (navUrl.startsWith('/patient-dashboard/') || navUrl.startsWith('/process-claim/'))) {
            e.preventDefault();
            setIsOpen(false);
            navigate(navUrl);
          }
        }}
        dangerouslySetInnerHTML={{ __html: formatted }} 
      />
    );
  };

  const submitFeedback = async () => {
    try {
      await chatbotService.submitFeedback({
        rating: feedbackRating,
        wasResolved: feedbackResolved !== false,
        comment: feedbackComment,
        userRole: currentUser?.role
      });
      setFeedbackSubmitted(true);
      toast.success("Thank you for your feedback!");
    } catch (e) {
      toast.error("Failed to submit feedback.");
    }
  };

  const selectedClaimObject = userFilteredClaims.find(c => c.id === selectedClaimId);

  return (
    <>
      {/* Floating Toggle Launcher */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-[60] p-4 rounded-full shadow-2xl transition-all duration-300 ${
          isOpen ? 'bg-slate-900 rotate-90 scale-95' : 'bg-[#000080] hover:bg-blue-900 hover:scale-110 ring-4 ring-blue-900/20'
        } text-white flex items-center justify-center`}
        title="Open ClaimAssist AI Chatbot"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
          </span>
        )}
      </button>

      {/* Main Chat Window */}
      {isOpen && (
        <div 
          className={`fixed z-[60] bg-white rounded-[2rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 ${
            isMaximized 
              ? 'inset-4 md:inset-10 w-auto h-auto rounded-[2rem]' 
              : 'bottom-24 right-6 w-[92vw] md:w-[440px] h-[640px] max-h-[82vh]'
          }`}
        >
          {/* Header */}
          <div className="bg-[#000080] p-5 flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 shadow-inner">
                <Bot className="text-emerald-400" size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-black text-base tracking-tight">ClaimAssist AI</h3>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-[9px] font-black uppercase tracking-wider">
                    v2.5 Enterprise
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                  <span className="text-blue-100 text-[10px] font-bold">
                    {currentUser?.hospitalName || currentUser?.displayName ? `${currentUser.hospitalName || currentUser.displayName}` : 'Hospital Assistant'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsMaximized(!isMaximized)}
                className="p-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                title={isMaximized ? "Restore size" : "Maximize"}
              >
                {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button 
                onClick={() => {
                  setMessages([{
                    id: `rst_${Date.now()}`,
                    role: 'model',
                    text: "Conversation context cleared. How can I assist you with your claims?",
                    timestamp: new Date(),
                    suggestedActions: ["Check Claim Status", "Which documents are pending?", "Explain my deduction"]
                  }]);
                  setShowFeedbackWidget(false);
                }}
                className="p-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                title="Clear Conversation"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {/* Active Claim Selector Bar */}
          {userFilteredClaims && userFilteredClaims.length > 0 && (
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs shrink-0 overflow-x-auto">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 shrink-0 mr-2">
                Active Context:
              </span>
              <select
                value={selectedClaimId || ''}
                onChange={(e) => setSelectedClaimId(e.target.value || null)}
                className="bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 max-w-[260px] truncate"
              >
                <option value="">-- All Hospital Claims --</option>
                {userFilteredClaims.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.patientName} ({c.caseReferenceId || c.id}) - {c.status}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Emergency Alert Banner if detected */}
          {messages.some(m => m.isEmergency) && (
            <div className="bg-rose-600 text-white p-3 px-4 flex items-start space-x-3 text-xs shrink-0 animate-pulse">
              <AlertTriangle size={20} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-black uppercase tracking-wider text-[10px]">Critical Medical Emergency Disclaimer</p>
                <p className="text-[11px] leading-tight font-medium opacity-95">
                  If this is a life-threatening medical emergency, call <strong>108 / 112</strong> or seek immediate hospital care first. Pre-auth paperwork can be submitted within 24 hrs.
                </p>
              </div>
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 custom-scrollbar">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div 
                  className={`max-w-[88%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-[#000080] text-white rounded-tr-none' 
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none space-y-3'
                  }`}
                >
                  {/* Message Body */}
                  {msg.role === 'model' ? (
                    renderFormattedText(msg.text)
                  ) : (
                    <div>{msg.text}</div>
                  )}

                  {/* Selected Claim Card if attached */}
                  {msg.selectedClaim && (
                    <div className="mt-3 p-3 bg-blue-50/90 rounded-xl border border-blue-200 text-xs text-slate-700 space-y-1.5 shadow-2xs">
                      <div className="flex justify-between items-center font-black text-blue-950">
                        <button
                          type="button"
                          onClick={() => handleNavigateToPatient(msg.selectedClaim.patientName, msg.selectedClaim.id)}
                          className="font-black text-blue-700 hover:text-blue-900 underline flex items-center gap-1 text-xs cursor-pointer text-left"
                        >
                          <span>Patient: {msg.selectedClaim.patientName}</span>
                          <ExternalLink size={12} className="shrink-0 text-blue-600" />
                        </button>
                        <span className="px-2 py-0.5 bg-blue-600 text-white rounded-md text-[10px] font-bold">
                          {msg.selectedClaim.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                        <div>Ref: <strong className="font-bold">{msg.selectedClaim.refNo}</strong></div>
                        <div>Insurer: <strong className="font-bold">{msg.selectedClaim.insuranceProvider}</strong></div>
                        <div>Estimate: <strong className="font-bold">₹{msg.selectedClaim.estimatedCost?.toLocaleString('en-IN') || '0'}</strong></div>
                        {msg.selectedClaim.paidAmount !== undefined && (
                          <div>Settled: <strong className="font-bold text-emerald-700">₹{msg.selectedClaim.paidAmount?.toLocaleString('en-IN')}</strong></div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleNavigateToPatient(msg.selectedClaim.patientName, msg.selectedClaim.id)}
                        className="w-full mt-2 py-2 px-3 bg-[#000080] hover:bg-blue-900 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                      >
                        <FileText size={13} /> Open Patient Dashboard & Documents
                      </button>
                    </div>
                  )}

                  {/* Citation Tag */}
                  {msg.citation && (
                    <div className="mt-2 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md inline-flex items-center gap-1 border border-slate-200">
                      <FileText size={12} className="text-blue-600" />
                      Source: {msg.citation}
                    </div>
                  )}

                  <p className={`text-[9px] mt-1.5 font-bold text-right opacity-60 ${msg.role === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* Suggested Action Chips below message */}
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 max-w-[90%]">
                    {msg.suggestedActions.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickAction(action)}
                        className="px-3 py-1 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-blue-900 rounded-full text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1 active:scale-95"
                      >
                        {action} <ChevronRight size={12} className="text-blue-500" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 p-3 px-4 rounded-2xl rounded-tl-none shadow-sm flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-500 mr-1">ClaimAssist is typing</span>
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}

            {/* Post-Resolution Feedback Widget */}
            {showFeedbackWidget && !feedbackSubmitted && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl space-y-3 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-blue-950 uppercase tracking-wider">Was your query resolved?</h4>
                  <button onClick={() => setShowFeedbackWidget(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={14} />
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setFeedbackResolved(true)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      feedbackResolved === true ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Yes, Resolved
                  </button>
                  <button
                    onClick={() => setFeedbackResolved(false)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      feedbackResolved === false ? 'bg-rose-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    No, Need Help
                  </button>
                </div>

                <div className="flex items-center justify-center gap-1 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setFeedbackRating(star)}
                      className="p-1 hover:scale-125 transition-transform"
                    >
                      <Star
                        size={20}
                        className={star <= feedbackRating ? "text-amber-400 fill-amber-400" : "text-slate-300"}
                      />
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder="Optional feedback..."
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={submitFeedback}
                    className="px-4 py-1.5 bg-[#000080] text-white rounded-xl text-xs font-bold hover:bg-blue-900 transition-all"
                  >
                    Submit
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Prompt Pills */}
          {!isTyping && messages.length <= 4 && (
            <div className="px-4 py-2 bg-slate-100/80 border-t border-slate-200 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
              {QUICK_ACTIONS.map(action => (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action.text)}
                  className="whitespace-nowrap px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-slate-700 hover:text-blue-900 rounded-full text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1.5 shrink-0"
                >
                  <action.icon size={13} className="text-blue-600" />
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <div className="p-4 bg-white border-t border-slate-200 shrink-0">
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask claim status, deductions, or required documents..."
                className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-300 rounded-full text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-inner"
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isTyping}
                className="absolute right-1.5 p-2 bg-[#000080] text-white rounded-full hover:bg-blue-900 transition-all disabled:opacity-40 shadow-md"
                title="Send message"
              >
                {isTyping ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>

            <div className="flex justify-between items-center mt-2 px-1 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
              <span>ClaimNX Intelligent Assistant</span>
              <span className="text-slate-400 font-bold">Secured & Isolated</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
