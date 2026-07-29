import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { MessageCircle, X, Send, ChevronDown, Bot, User, Sparkles, Globe, Building2, Loader2, Trash2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface ChatSession {
  id: string;
  title: string;
  mode: string;
  created_at: string;
  updated_at: string;
  last_response: string | null;
}

export const ChatBot: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.roleId === 1;

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'tenant' | 'global'>('tenant');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showSessions, setShowSessions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadSuggestions();
    }
  }, [isOpen]);

  const loadSuggestions = async () => {
    try {
      const data = await api.get<string[]>('/api/chat/suggestions');
      setSuggestions(data);
    } catch {
      setSuggestions([
        'Show all deals',
        'What is the pipeline value?',
        'List my products',
        'Show active workflows',
      ]);
    }
  };

  const loadSessions = async () => {
    try {
      const data = await api.get<ChatSession[]>('/api/chat/sessions');
      setSessions(data);
    } catch {}
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.post<{ sessionId: string; message: string }>('/api/chat', {
        message: text.trim(),
        sessionId,
        mode,
      });

      setSessionId(res.sessionId);

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: res.message,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      setError('Failed to get response');
    }
    setIsLoading(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const handleNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setShowSessions(false);
    loadSuggestions();
    inputRef.current?.focus();
  };

  const handleSessionClick = async (s: ChatSession) => {
    try {
      const history = await api.get<ChatMessage[]>(`/api/chat/history/${s.id}`);
      setMessages(history);
      setSessionId(s.id);
      setShowSessions(false);
    } catch {}
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionIdToDelete: string) => {
    e.stopPropagation();
    try {
      await api.delete(`/api/chat/sessions/${sessionIdToDelete}`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionIdToDelete));
    } catch {}
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      loadSessions();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={toggleOpen}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
        title="AI Assistant"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  const formatMessage = (content: string): React.ReactNode => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: React.ReactNode[] = [];

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`ul-${elements.length}`} className="space-y-1 my-1.5">
            {listItems}
          </ul>
        );
        listItems = [];
      }
    };

    lines.forEach((line, i) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
        const text = trimmed.replace(/^[•\-]\s*/, '');
        listItems.push(
          <li key={`li-${i}`} className="text-xs leading-relaxed flex gap-1.5">
            <span className="text-blue-400 shrink-0 mt-0.5">•</span>
            <span>{renderInlineMarkdown(text)}</span>
          </li>
        );
        return;
      }

      if (trimmed.startsWith('_') && trimmed.endsWith('_')) {
        flushList();
        elements.push(
          <em key={`em-${i}`} className="text-[10px] text-slate-400 block mt-1">{trimmed.slice(1, -1)}</em>
        );
        return;
      }

      if (trimmed === '') {
        flushList();
        return;
      }

      flushList();

      if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        elements.push(
          <p key={`p-${i}`} className="text-xs font-bold text-slate-800 leading-relaxed mb-1">{trimmed.slice(2, -2)}</p>
        );
      } else if (trimmed.startsWith('#')) {
        elements.push(
          <h4 key={`h-${i}`} className="text-xs font-bold text-slate-800 mt-2 mb-1">{trimmed.replace(/^#+\s*/, '')}</h4>
        );
      } else {
        elements.push(
          <p key={`p-${i}`} className="text-xs leading-relaxed">{renderInlineMarkdown(trimmed)}</p>
        );
      }
    });

    flushList();
    return elements;
  };

  const renderInlineMarkdown = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let idx = 0;

    const boldRegex = /\*\*(.+?)\*\*/g;
    let match;
    let lastIndex = 0;

    while ((match = boldRegex.exec(remaining)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={`t-${idx++}`}>{remaining.slice(lastIndex, match.index)}</span>);
      }
      parts.push(<strong key={`b-${idx++}`} className="font-bold text-slate-900">{match[1]}</strong>);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < remaining.length) {
      parts.push(<span key={`t-${idx++}`}>{remaining.slice(lastIndex)}</span>);
    }

    return parts.length > 0 ? <>{parts}</> : text;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden" style={{ height: 'min(600px, 80vh)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Bot className="w-4 h-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 truncate">AI Assistant</h3>
            <p className="text-[10px] text-slate-500 truncate">
              {mode === 'global' ? 'Global View — All Companies' : 'Your Company Data'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isSuperAdmin && (
            <button
              onClick={() => setMode(mode === 'tenant' ? 'global' : 'tenant')}
              className={`p-1.5 rounded-lg transition-colors ${mode === 'global' ? 'bg-white/20 text-white' : 'text-blue-100 hover:bg-white/10'}`}
              title={mode === 'global' ? 'Switch to company mode' : 'Switch to global mode'}
            >
              {mode === 'global' ? <Globe className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
            </button>
          )}
          <button onClick={() => setShowSessions(!showSessions)} className="p-1.5 rounded-lg text-blue-100 hover:bg-white/10 transition-colors" title="Chat history">
            <ChevronDown className="w-4 h-4" />
          </button>
          <button onClick={toggleOpen} className="p-1.5 rounded-lg text-blue-100 hover:bg-white/10 transition-colors" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Session List */}
      {showSessions && (
        <div className="border-b border-slate-100 bg-slate-50/50 max-h-40 overflow-y-auto shrink-0">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chat History</span>
            <button onClick={handleNewChat} className="text-[10px] font-bold text-blue-600 hover:text-blue-800">
              + New Chat
            </button>
          </div>
          {sessions.length === 0 ? (
            <p className="px-4 pb-2 text-[10px] text-slate-400">No previous chats</p>
          ) : (
            sessions.slice(0, 10).map((s) => (
              <div
                key={s.id}
                onClick={() => handleSessionClick(s)}
                className={`flex items-center justify-between px-4 py-1.5 cursor-pointer hover:bg-slate-100 transition-colors ${s.id === sessionId ? 'bg-blue-50' : ''}`}
              >
                <span className="text-xs text-slate-700 truncate flex-1">{s.title}</span>
                <button onClick={(e) => handleDeleteSession(e, s.id)} className="p-0.5 text-slate-300 hover:text-rose-500 shrink-0 ml-2">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-slate-50/30">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Sparkles className="w-8 h-8 text-blue-300 mb-3" />
            <h4 className="text-sm font-bold text-slate-700 mb-1">How can I help you today?</h4>
            <p className="text-[11px] text-slate-400 mb-4">
              {mode === 'global'
                ? 'I can analyze all companies and provide system-wide insights.'
                : 'Ask me about your deals, products, contacts, or workflows.'}
            </p>
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center max-w-xs">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(s)}
                    className="text-[10px] font-medium px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-blue-600" />
                </div>
              )}
              <div
                className={`max-w-[85%] px-3 py-2 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-md'
                    : 'bg-white border border-slate-200/80 text-slate-700 rounded-tl-md shadow-xs'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="text-xs leading-relaxed whitespace-pre-wrap">{formatMessage(msg.content)}</div>
                ) : (
                  <p className="text-xs leading-relaxed">{msg.content}</p>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-md px-3 py-2.5">
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            </div>
          </div>
        )}

        {error && (
          <p className="text-[10px] text-rose-500 text-center">{error}</p>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-100 p-3 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="Ask about your data..."
            className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder:text-slate-400"
            disabled={isLoading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[9px] text-slate-400 text-center mt-1.5">
          {mode === 'global' ? '🌐 Global mode — cross-company analysis' : '🏢 Company data only'}
          {isSuperAdmin && mode === 'tenant' && (
            <button onClick={() => setMode('global')} className="ml-1 text-blue-500 hover:underline">Switch to global</button>
          )}
        </p>
      </div>
    </div>
  );
};