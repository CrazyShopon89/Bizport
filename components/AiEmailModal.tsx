import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Copy, Send, Eye, PenTool, Grip, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Client, DomainClient } from '../types';
import { generateRenewalEmail, generateDomainRenewalEmail } from '../services/geminiService';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { EmailService } from '../services/emailService';
import SuccessAnimation from './SuccessAnimation';

interface AiEmailModalProps {
  client: Client | DomainClient;
  type?: 'hosting' | 'domain';
  onClose: () => void;
  isOpen: boolean;
}

const AiEmailModal: React.FC<AiEmailModalProps> = ({ client, type = 'hosting', onClose, isOpen }) => {
  const [generatedText, setGeneratedText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [emailSent, setEmailSent] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('preview');
  const { formatCurrency } = useAuth();
  const { addNotification } = useNotification();
  
  // Resize logic
  const modalRef = useRef<HTMLDivElement>(null);
  
  // State for modal dimensions
  const [modalSize, setModalSize] = useState<{ width: string | number; height: string | number }>({ 
      width: '100%', 
      height: 'auto' 
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check screen size on mount and resize
    const checkMobile = () => {
        setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen) {
      handleGenerate();
      // Reset states
      setEmailSent(false);
      setSending(false);
      setErrorMsg(null);
      
      // Responsive Initial Size
      if (window.innerWidth < 768) {
          setModalSize({ width: '100%', height: '100%' }); // Full screen on mobile
      } else {
          setModalSize({ width: 650, height: 600 }); // Fixed size on desktop
      }
    }
  }, [isOpen]);

  // Handle Resize (Desktop Only)
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (isMobile) return;
    
    setIsResizing(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    
    const startWidth = modalRef.current?.offsetWidth || 0;
    const startHeight = modalRef.current?.offsetHeight || 0;

    const doDrag = (dragEvent: MouseEvent) => {
      if (modalRef.current) {
        const newWidth = startWidth + dragEvent.clientX - startX;
        const newHeight = startHeight + dragEvent.clientY - startY;
        
        setModalSize({
          width: Math.max(400, newWidth),
          height: Math.max(500, newHeight)
        });
      }
    };

    const stopDrag = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  }, [isMobile]);

  const handleGenerate = async () => {
    setLoading(true);
    setGeneratedText('');
    setActiveTab('preview');
    let text = '';
    
    try {
      if (type === 'domain') {
         text = await generateDomainRenewalEmail(client as DomainClient, formatCurrency(client.amount));
      } else {
         text = await generateRenewalEmail(client as Client, formatCurrency(client.amount));
      }
      setGeneratedText(text);
    } catch (e) {
      setGeneratedText("Error generating email.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
      if (!generatedText) return;
      setSending(true);
      setErrorMsg(null);

      try {
          // Extract Subject (Heuristic: First line usually starts with Subject:)
          let subject = `Renewal Notice for ${client.clientName}`;
          const lines = generatedText.split('\n');
          const subjectLine = lines.find(l => l.toLowerCase().startsWith('subject:'));
          if (subjectLine) {
              subject = subjectLine.replace(/^subject:\s*/i, '').trim();
          }

          // Use Real Email Service
          await EmailService.sendClientEmail(
              client.email,
              client.clientName,
              subject,
              generatedText
          );

          setEmailSent(true);
          addNotification('Email Sent', `Renewal notification sent to ${client.clientName}`, 'system');
          setTimeout(() => {
              onClose();
              setEmailSent(false);
          }, 2500);
      } catch (err: any) {
          console.error("Failed to send email:", err);
          setErrorMsg(err.message || "Failed to send email. Check settings.");
      } finally {
          setSending(false);
      }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedText);
    addNotification('Copied', 'Email content copied to clipboard', 'system');
  };

  const renderMarkdown = (text: string) => {
    if (!text) return <p className="text-slate-400 italic">No content generated.</p>;
    
    let html = text
      .replace(/^### (.*$)/gim, '<h3 class="font-bold text-lg mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="font-bold text-xl mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="font-bold text-2xl mt-4 mb-2">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^\s*\*\s+(.*)$/gm, '<li class="ml-4">$1</li>');

    if (html.includes('<li')) {
        html = html.replace(/(<li.*<\/li>)/s, '<ul class="list-disc pl-5 my-2">$1</ul>');
    }
    
    html = html.replace(/\n/g, '<br/>');

    return <div className="prose prose-sm prose-slate max-w-none text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-0 md:p-4 backdrop-blur-sm">
      <div 
        ref={modalRef}
        className={`bg-white md:rounded-2xl shadow-2xl flex flex-col overflow-hidden relative animate-fade-in-up transition-all ease-out duration-75 ${isMobile ? 'h-full w-full' : ''}`}
        style={{ 
            width: isMobile ? '100%' : typeof modalSize.width === 'number' ? `${modalSize.width}px` : modalSize.width,
            height: isMobile ? '100%' : typeof modalSize.height === 'number' ? `${modalSize.height}px` : modalSize.height,
            maxWidth: isMobile ? '100%' : '95vw',
            maxHeight: isMobile ? '100%' : '95vh',
            minHeight: isMobile ? '100%' : '400px',
            minWidth: isMobile ? '100%' : '350px'
        }}
      >
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-white shrink-0 cursor-move">
          <div className="flex items-center gap-2.5 text-indigo-700">
            <div className="p-1.5 bg-indigo-100 rounded-lg">
                <Sparkles size={18} />
            </div>
            <div>
                <h3 className="font-bold text-lg leading-tight">AI Email Assistant</h3>
                <p className="text-xs text-indigo-500 font-medium">Powered by Gemini</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        {emailSent ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-fade-in bg-white h-full">
                <div className="mb-6">
                    <SuccessAnimation size={80} />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Email Sent Successfully!</h3>
                <p className="text-slate-500 mb-8 max-w-xs mx-auto">The renewal notification has been delivered to <span className="font-semibold text-slate-700">{client.clientName}</span>.</p>
                <div className="text-sm text-slate-400">Closing automatically...</div>
            </div>
        ) : (
            <>
                {/* Info Bar */}
                <div className="bg-slate-50 px-4 sm:px-6 py-2 border-b border-slate-100 flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between sm:items-center shrink-0">
                    <p className="text-xs text-slate-500 truncate max-w-full">
                    Drafting for: <span className="font-semibold text-slate-800">{client.clientName}</span> ({client.email})
                    </p>
                    <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm self-start sm:self-auto">
                        <button 
                            onClick={() => setActiveTab('write')}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${activeTab === 'write' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            <PenTool size={12} /> Write
                        </button>
                        <button 
                            onClick={() => setActiveTab('preview')}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${activeTab === 'preview' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            <Eye size={12} /> Preview
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 relative bg-slate-50 min-h-0">
                {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-4 bg-white/80 backdrop-blur-sm z-10">
                        <div className="relative">
                            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                            <Sparkles size={16} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 animate-pulse" />
                        </div>
                        <p className="text-sm font-medium animate-pulse text-indigo-600">Generating polished email...</p>
                    </div>
                ) : (
                    <>
                        {activeTab === 'write' ? (
                            <textarea
                                className="w-full h-full p-6 resize-none focus:ring-0 border-none outline-none text-slate-700 font-mono text-sm leading-relaxed bg-white"
                                value={generatedText}
                                onChange={(e) => setGeneratedText(e.target.value)}
                                placeholder="AI output will appear here..."
                            />
                        ) : (
                            <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-6">
                                <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-8 min-h-full">
                                    {renderMarkdown(generatedText)}
                                </div>
                            </div>
                        )}
                    </>
                )}
                </div>

                {/* Error Bar */}
                {errorMsg && (
                    <div className="bg-red-50 text-red-600 px-4 py-2 text-xs flex items-center gap-2 border-t border-red-100">
                        <AlertCircle size={14} />
                        {errorMsg}
                    </div>
                )}

                {/* Footer */}
                <div className="px-4 sm:px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between bg-white shrink-0 z-20 gap-3">
                    <button
                        onClick={handleGenerate}
                        disabled={loading || sending}
                        className="text-indigo-600 text-sm font-medium hover:text-indigo-800 disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors order-2 sm:order-1"
                    >
                        <Sparkles size={16} />
                        Regenerate
                    </button>
                    <div className="flex gap-3 order-1 sm:order-2">
                        <button
                        onClick={copyToClipboard}
                        disabled={loading || sending}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors shadow-sm"
                        >
                        <Copy size={16} />
                        Copy
                        </button>
                        <button
                        onClick={handleSendEmail}
                        disabled={loading || sending || !client.email}
                        title={!client.email ? "Client email is missing" : "Send Email"}
                        className="flex-[2] sm:flex-none flex items-center justify-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                        {sending ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <Send size={16} />
                                Send Email
                            </>
                        )}
                        </button>
                    </div>
                </div>

                {/* Resize Handle - Hidden on Mobile */}
                {!isMobile && (
                    <div 
                        className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-center justify-center z-30 group"
                        onMouseDown={startResize}
                    >
                        <Grip size={16} className={`text-slate-300 group-hover:text-indigo-500 transition-colors ${isResizing ? 'text-indigo-600' : ''}`} />
                    </div>
                )}
            </>
        )}
      </div>
    </div>,
    document.body
  );
};

export default AiEmailModal;