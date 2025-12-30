import React, { useState, useEffect } from 'react';
import { X, Sparkles, Copy, Send } from 'lucide-react';
import { Client, DomainClient } from '../types';
import { generateRenewalEmail, generateDomainRenewalEmail } from '../services/geminiService';
import { useAuth } from '../context/AuthContext';

interface AiEmailModalProps {
  client: Client | DomainClient;
  type?: 'hosting' | 'domain';
  onClose: () => void;
  isOpen: boolean;
}

const AiEmailModal: React.FC<AiEmailModalProps> = ({ client, type = 'hosting', onClose, isOpen }) => {
  const [generatedText, setGeneratedText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const { formatCurrency } = useAuth();

  useEffect(() => {
    if (isOpen) {
      handleGenerate();
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    setLoading(true);
    setGeneratedText('');
    let text = '';
    
    if (type === 'domain') {
       text = await generateDomainRenewalEmail(client as DomainClient, formatCurrency(client.amount));
    } else {
       text = await generateRenewalEmail(client as Client, formatCurrency(client.amount));
    }
    
    setGeneratedText(text);
    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedText);
    alert('Copied to clipboard!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-center gap-2 text-indigo-700">
            <Sparkles size={20} />
            <h3 className="font-bold text-lg">AI Email Generator</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-slate-500">
              Generating {type === 'domain' ? 'domain' : 'hosting'} renewal reminder for <span className="font-semibold text-slate-800">{client.clientName}</span>.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 min-h-[300px] relative">
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-3">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-sm animate-pulse">Consulting Gemini...</p>
              </div>
            ) : (
              <textarea
                className="w-full h-full bg-transparent border-none resize-none focus:ring-0 text-slate-700 font-mono text-sm"
                value={generatedText}
                onChange={(e) => setGeneratedText(e.target.value)}
                rows={12}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between bg-slate-50">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="text-indigo-600 text-sm font-medium hover:text-indigo-800 disabled:opacity-50"
          >
            Regenerate
          </button>
          <div className="flex gap-3">
            <button
              onClick={copyToClipboard}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors"
            >
              <Copy size={16} />
              Copy Text
            </button>
            <button
              onClick={() => { alert('In a real app, this would send via SMTP/Laravel Backend.'); onClose(); }}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors shadow-sm"
            >
              <Send size={16} />
              Send Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiEmailModal;