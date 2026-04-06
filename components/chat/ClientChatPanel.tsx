'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, MessageCircle, Paperclip, Send } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { getChatMessages, sendChatMessage } from '@/lib/googleSheets'
import type { ChatMessage, QuestionnaireUpload } from '@/types'
import { cn } from '@/lib/utils'
import { MAX_CHAT_ATTACHMENT_SIZE_MB, MAX_CHAT_ATTACHMENTS, isUploadSizeAllowed, toUploadPayload } from '@/lib/uploads'

const POLL_INTERVAL = 15_000

interface ClientChatPanelProps {
  clientEmail: string
  clientName: string
}

export function ClientChatPanel({ clientEmail, clientName }: ClientChatPanelProps) {
  const { t } = useLanguage()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [attachments, setAttachments] = useState<QuestionnaireUpload[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadMessages = useCallback(async () => {
    if (!clientEmail) return
    try {
      const result = await getChatMessages(clientEmail)
      if (result.success) setMessages(result.messages)
    } catch {
      /* silent */
    }
  }, [clientEmail])

  useEffect(() => {
    setLoading(true)
    loadMessages().finally(() => setLoading(false))
    pollRef.current = setInterval(loadMessages, POLL_INTERVAL)

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [loadMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
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
      await sendChatMessage({ clientEmail, clientName, author: 'client', message: msg, attachments: files })
      await loadMessages()
    } catch {
      /* keep optimistic */
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
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

  return (
    <div className="bg-white/75 backdrop-blur-xl border border-white/80 rounded-[2rem] shadow-glass-lg p-8 md:p-10 overflow-hidden">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-neutral-950 flex items-center justify-center shadow-lg">
            <MessageCircle size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-semibold text-neutral-950">{t.mySite.review.chatTitle}</h3>
            <p className="text-sm text-neutral-500">{t.mySite.review.chatSubtitle}</p>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-neutral-200/70 bg-white/90 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/80">
            <p className="text-sm font-semibold text-neutral-900">{t.chat.title}</p>
            <p className="text-[11px] text-neutral-400">{t.chat.subtitle}</p>
          </div>

          <div className="h-[420px] overflow-y-auto px-5 py-4 space-y-3 bg-white">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={20} className="text-neutral-300 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mb-3">
                  <MessageCircle size={20} className="text-neutral-400" />
                </div>
                <p className="text-sm text-neutral-400 leading-relaxed whitespace-pre-line">
                  {t.chat.empty}
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
                    {msg.author === 'admin' ? t.chat.admin : t.chat.you} · {formatTime(msg.timestamp)}
                  </span>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-4 py-4 border-t border-neutral-100 bg-neutral-50/60">
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
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-11 h-11 rounded-xl border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 flex items-center justify-center shrink-0 transition-all duration-200"
              >
                <Paperclip size={16} />
              </button>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.chat.placeholder}
                rows={1}
                className="flex-1 resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-300 focus:ring-2 focus:ring-neutral-900/10 transition-all max-h-24"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={(!input.trim() && attachments.length === 0) || sending}
                className={cn(
                  'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200',
                  (input.trim() || attachments.length > 0) && !sending
                    ? 'bg-neutral-950 text-white hover:bg-neutral-800'
                    : 'bg-neutral-100 text-neutral-400'
                )}
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
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
