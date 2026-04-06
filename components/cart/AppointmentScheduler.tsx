'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Clock3, Video } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AppointmentSelection } from '@/types'

interface Slot {
  id: string
  startAt: string
  endAt: string
  dateLabel: string
  timeLabel: string
  durationMinutes: number
  available: boolean
}

interface AppointmentSchedulerProps {
  value: AppointmentSelection | null
  onChange: (value: AppointmentSelection | null) => void
}

export function AppointmentScheduler({ value, onChange }: AppointmentSchedulerProps) {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/appointments')
        const result = await response.json() as { slots?: Slot[] }
        if (!cancelled) {
          setSlots(result.slots ?? [])
        }
      } catch (error) {
        console.error('[appointments] fetch failed:', error)
        if (!cancelled) setSlots([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [])

  const groupedSlots = useMemo(() => {
    return slots.reduce<Record<string, Slot[]>>((acc, slot) => {
      acc[slot.dateLabel] ??= []
      acc[slot.dateLabel].push(slot)
      return acc
    }, {})
  }, [slots])

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-neutral-200/60 bg-neutral-950 text-white shadow-[0_35px_90px_-45px_rgba(15,23,42,0.8)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(212,175,55,0.16),transparent_28%)] pointer-events-none" />
      <div className="relative p-8 space-y-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
            <CalendarDays size={13} />
            Prise de rendez-vous
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold tracking-tight">Choisissez votre échange Google Meet</h3>
            <p className="max-w-2xl text-sm leading-relaxed text-white/65">
              Le rendez-vous sert à préciser votre besoin à l'oral et à faire évoluer votre E-CV ensemble.
              Les créneaux sont proposés à partir de 24h minimum et se bloquent automatiquement une fois réservés.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 space-y-4">
            <div className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4 text-sm text-white/70 space-y-2">
              <div className="flex items-center gap-2 font-medium text-white">
                <Video size={16} />
                Rendez-vous Google Meet · 1h
              </div>
              <p>Échange d'une heure pour préciser votre besoin et faire évoluer votre E-CV.</p>
              <p className="text-xs text-white/50">Horaires affichés en heure de Paris (Europe/Paris).</p>
              <p>Les créneaux gris sont déjà pris ou trop proches dans le temps.</p>
            </div>

            {value ? (
              <div className="rounded-[1.25rem] border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100 space-y-2">
                <p className="font-semibold">Créneau sélectionné</p>
                <p>{value.dateLabel}</p>
                <p>{value.timeLabel}</p>
                <p>1h · Google Meet</p>
              </div>
            ) : (
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
                Sélectionnez d'abord un créneau pour débloquer le paiement.
              </div>
            )}
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
            {loading ? (
              <div className="flex min-h-[280px] items-center justify-center text-sm text-white/60">
                Chargement des disponibilités…
              </div>
            ) : (
              <div className="space-y-5">
                {Object.entries(groupedSlots).map(([dateLabel, dateSlots]) => (
                  <div key={dateLabel} className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Clock3 size={15} className="text-amber-300" />
                      <span className="capitalize">{dateLabel}</span>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {dateSlots.map((slot) => {
                        const selected = value?.slotId === slot.id
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            disabled={!slot.available}
                            onClick={() =>
                              onChange({
                                slotId: slot.id,
                                startAt: slot.startAt,
                                endAt: slot.endAt,
                                dateLabel: slot.dateLabel,
                                timeLabel: slot.timeLabel,
                                durationMinutes: 60,
                                mode: 'google_meet',
                              })
                            }
                            className={cn(
                              'rounded-2xl border px-4 py-4 text-left transition',
                              selected
                                ? 'border-amber-300 bg-amber-300 text-neutral-950 shadow-lg'
                                : slot.available
                                  ? 'border-white/10 bg-white/[0.04] text-white hover:border-white/25 hover:bg-white/[0.08]'
                                  : 'border-white/5 bg-white/[0.02] text-white/25 grayscale'
                            )}
                          >
                            <div className="text-sm font-semibold">{slot.timeLabel}</div>
                            <div className={cn('mt-1 text-xs', selected ? 'text-neutral-800/80' : 'text-white/55')}>
                              {slot.available ? 'Disponible' : 'Indisponible'}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
