'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { MessageCircle, X, Send, Loader2, Paperclip } from 'lucide-react'
import type { ChatMessage, QuestionnaireUpload } from '@/types'
import { cn } from '@/lib/utils'
import { MAX_CHAT_ATTACHMENT_SIZE_MB, MAX_CHAT_ATTACHMENTS, isUploadSizeAllowed, toUploadPayload } from '@/lib/uploads'

const SESSION_KEY = 'eworklife-mon-site-session'

export function ChatWidget() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [attachments, setAttachments] = useState<QuestionnaireUpload[]>([])
  const [clientEmail, setClientEmail] = useState('')
  const [clientName, setClientName] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Check session on mount ──
  useEffect(() => {
    const check = () => {
      const raw = window.localStorage.getItem(SESSION_KEY)
      if (!raw) {
        setVisible(false)
        return
      }
      try {
        const parsed = JSON.parse(raw)
        if (parsed?.email) {
          setClientEmail(parsed.email)
          setClientName(parsed.name || parsed.email.split('@')[0])
          setVisible(true)
        } else {
          setVisible(false)
        }
      } catch {
        setVisible(false)
      }
    }
    check()
    const interval = setInterval(check, 30_000)
    return () => clearInterval(interval)
  }, [])

  // ── Auto-scroll ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send message via /api/chat → Discord ──
  const handleSend = useCallback(async () => {
    if ((!input.trim() && attachments.length === 0) || sending) return
    const msg = input.trim()
    setInput('')
    const files = attachments
    setAttachments([])
    setSending(true)

    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      clientEmail,
      clientName,
      author: 'client',
      message: msg,
      timestamp: new Date().toISOString(),
      read: false,
      attachments: files.map((file) => ({ name: file.name })),
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmail,
          clientName,
          message: msg,
        }),
      })
    } catch {
      /* keep optimistic message */
    } finally {
      setSending(false)
    }
  }, [input, attachments, sending, clientEmail, clientName])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleAttachmentChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
      .slice(0, MAX_CHAT_ATTACHMENTS)
      .filter((file) => isUploadSizeAllowed(file, MAX_CHAT_ATTACHMENT_SIZE_MB))

    if (!files.length) {
      setAttachments([])
      return
    }

    try {
      const payloads = await Promise.all(files.map(toUploadPayload))
      setAttachments(payloads)
    } catch {
      setAttachments([])
    } finally {
      event.target.value = ''
    }
  }

  if (!visible || pathname === '/mon-site') return null

  const unread = messages.filter((m) => m.author === 'admin' && !m.read).length

  return (
    <>
      {/* ── Floating button ── */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-28 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-neutral-800 to-neutral-950 text-white shadow-[0_4px_24px_rgba(0,0,0,0.25)] hover:shadow-[0_6px_32px_rgba(0,0,0,0.35)] transition-shadow duration-300 flex items-center justify-center md:bottom-24"
            aria-label="Ouvrir la messagerie"
          >
            <MessageCircle size={22} />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unread}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Chat panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-28 right-6 z-50 h-[520px] max-h-[calc(100vh-8rem)] w-[380px] max-w-[calc(100vw-3rem)] overflow-hidden rounded-3xl border border-white/80 bg-white/95 shadow-[0_20px_60px_rgba(0,0,0,0.12)] backdrop-blur-2xl flex flex-col md:bottom-24"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-neutral-950 flex items-center justify-center">
                  <MessageCircle size={15} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900">Messagerie</p>
                  <p className="text-[11px] text-neutral-400">My Digital Career</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mb-3">
                    <MessageCircle size={20} className="text-neutral-400" />
                  </div>
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    Aucun message pour le moment.
                    <br />
                    Envoyez votre premier message !
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex flex-col max-w-[85%]',
                      msg.author === 'client' ? 'ml-auto items-end' : 'mr-auto items-start'
                    )}
                  >
                    <div
                      className={cn(
                        'rounded-2xl px-4 py-2.5 text-sm leading-relaxed space-y-2',
                        msg.author === 'client'
                          ? 'bg-neutral-950 text-white rounded-br-lg'
                          : 'bg-neutral-100 text-neutral-800 rounded-bl-lg'
                      )}
                    >
                      {msg.message ? <p>{msg.message}</p> : null}
                      {msg.attachments?.length ? (
                        <div className="space-y-1.5">
                          {msg.attachments.map((attachment) => (
                            <div
                              key={`${msg.id}-${attachment.name}`}
                              className={cn(
                                'flex items-center gap-2 rounded-xl px-3 py-2 text-xs',
                                msg.author === 'client'
                                  ? 'bg-white/10 text-white/90'
                                  : 'bg-white text-neutral-700'
                              )}
                            >
                              {attachment.url ? (
                                <a href={attachment.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 min-w-0 hover:underline">
                                  <Paperclip size={12} />
                                  <span className="truncate">{attachment.name}</span>
                                </a>
                              ) : (
                                <>
                                  <Paperclip size={12} />
                                  <span className="truncate">{attachment.name}</span>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <span className="text-[10px] text-neutral-400 mt-1 px-1">
                      {msg.author === 'admin' ? 'My Digital Career' : 'Vous'} · {formatTime(msg.timestamp)}
                    </span>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-neutral-100">
              {attachments.length ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {attachments.map((file) => (
                    <span key={file.name} className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-[11px] text-neutral-600">
                      <Paperclip size={11} />
                      {file.name}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="flex items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleAttachmentChange}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 rounded-xl border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 flex items-center justify-center shrink-0 transition-all"
                >
                  <Paperclip size={15} />
                </button>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Écrire un message..."
                  rows={1}
                  className="flex-1 resize-none rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-300 focus:ring-2 focus:ring-neutral-900/10 transition-all max-h-20"
                />
                <button
                  onClick={handleSend}
                  disabled={(!input.trim() && attachments.length === 0) || sending}
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200',
                    (input.trim() || attachments.length > 0) && !sending
                      ? 'bg-neutral-950 text-white hover:bg-neutral-800'
                      : 'bg-neutral-100 text-neutral-400'
                  )}
                >
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    if (isToday) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }

    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}
