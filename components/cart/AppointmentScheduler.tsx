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
  const [error, setError] = useState('')
  const [activeDate, setActiveDate] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await fetch('/api/appointments', { cache: 'no-store' })
        const result = await response.json() as {
          success?: boolean
          error?: string
          slots?: Slot[]
        }

        if (cancelled) return

        if (!response.ok || !result.success) {
          setSlots([])
          setError(result.error || 'Les disponibilités ne peuvent pas être chargées pour le moment.')
          return
        }

        setSlots(result.slots ?? [])
      } catch (fetchError) {
        console.error('[appointments] fetch failed:', fetchError)
        if (!cancelled) {
          setSlots([])
          setError('Impossible de charger les créneaux pour le moment.')
        }
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
    return slots.reduce<Record<string, Slot[]>>((accumulator, slot) => {
      accumulator[slot.dateLabel] ??= []
      accumulator[slot.dateLabel].push(slot)
      return accumulator
    }, {})
  }, [slots])

  const orderedDates = useMemo(() => Object.keys(groupedSlots), [groupedSlots])
  const activeSlots = activeDate ? groupedSlots[activeDate] ?? [] : []
  const availableCount = activeSlots.filter((slot) => slot.available).length

  useEffect(() => {
    if (activeDate && groupedSlots[activeDate]) return
    setActiveDate(orderedDates[0] ?? null)
  }, [activeDate, groupedSlots, orderedDates])

  return (
    <div className="relative w-full max-w-full overflow-hidden rounded-[1.9rem] border border-neutral-200/70 bg-neutral-950 text-white shadow-[0_28px_80px_-46px_rgba(15,23,42,0.8)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.10),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(212,175,55,0.14),transparent_30%)]" />

      <div className="relative space-y-5 p-5 sm:p-6">
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
              <CalendarDays size={13} />
              Prise de rendez-vous
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-semibold tracking-tight sm:text-[1.45rem]">
                Choisissez votre échange Google Meet
              </h3>
              <p className="max-w-2xl text-sm leading-relaxed text-white/65">
                Les créneaux sont affichés en heure de Paris. La réservation bloque automatiquement le créneau et le rendez-vous est confirmé par Google Calendar.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:w-full lg:max-w-[360px]">
            <InfoPill icon={<Video size={15} />} label="Format" value="Google Meet · 1h" />
            <InfoPill icon={<Clock3 size={15} />} label="Réservation" value="24h minimum" />
          </div>
        </div>

        <div className="grid min-w-0 gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="rounded-[1.45rem] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                Sélection
              </p>
              {value ? (
                <div className="mt-3 space-y-1.5">
                  <p className="text-sm font-semibold text-white">{value.dateLabel}</p>
                  <p className="text-sm text-white/70">{value.timeLabel}</p>
                  <p className="text-xs text-emerald-200">Créneau prêt à être réservé</p>
                </div>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-white/55">
                  Sélectionnez un jour puis un créneau pour débloquer le paiement.
                </p>
              )}
            </div>

            <div className="rounded-[1.45rem] border border-white/10 bg-black/20 p-4 text-sm text-white/65">
              <p className="font-medium text-white">Disponibilités du jour</p>
              <p className="mt-2">
                {activeDate
                  ? `${availableCount} créneau(x) disponible(s) pour ${activeDate}.`
                  : 'Choisissez une date pour afficher les créneaux.'}
              </p>
            </div>
          </div>

          <div className="min-w-0 rounded-[1.45rem] border border-white/10 bg-white/[0.03] p-4 sm:p-5">
            {loading ? (
              <div className="flex min-h-[160px] items-center justify-center text-sm text-white/60">
                Chargement des disponibilités…
              </div>
            ) : error ? (
              <div className="flex min-h-[160px] items-center justify-center rounded-[1.25rem] border border-red-400/25 bg-red-400/10 px-5 text-center text-sm text-red-100">
                {error}
              </div>
            ) : orderedDates.length === 0 ? (
              <div className="flex min-h-[160px] items-center justify-center rounded-[1.25rem] border border-white/10 bg-white/[0.02] px-5 text-center text-sm text-white/60">
                Aucun créneau disponible pour le moment.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto pb-1">
                  <div className="flex min-w-max gap-2">
                    {orderedDates.map((dateLabel) => {
                      const total = groupedSlots[dateLabel]?.length ?? 0
                      const available = groupedSlots[dateLabel]?.filter((slot) => slot.available).length ?? 0
                      const isActive = activeDate === dateLabel

                      return (
                        <button
                          key={dateLabel}
                          type="button"
                          onClick={() => setActiveDate(dateLabel)}
                          className={cn(
                            'min-w-[150px] rounded-2xl border px-4 py-3 text-left transition',
                            isActive
                              ? 'border-amber-300 bg-amber-300 text-neutral-950 shadow-[0_18px_40px_-24px_rgba(212,175,55,0.65)]'
                              : 'border-white/10 bg-white/[0.04] text-white hover:border-white/25 hover:bg-white/[0.08]'
                          )}
                        >
                          <p className="text-sm font-semibold capitalize">{dateLabel}</p>
                          <p className={cn('mt-1 text-xs', isActive ? 'text-neutral-800/75' : 'text-white/55')}>
                            {available}/{total} disponibles
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Clock3 size={15} className="text-amber-300" />
                      <span className="capitalize">{activeDate}</span>
                    </div>
                    <span className="text-xs text-white/45">
                      {availableCount} disponible(s)
                    </span>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {activeSlots.map((slot) => {
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
                            'rounded-[1.1rem] border px-4 py-3 text-left transition',
                            selected
                              ? 'border-amber-300 bg-amber-300 text-neutral-950 shadow-[0_18px_36px_-24px_rgba(212,175,55,0.65)]'
                              : slot.available
                                ? 'border-white/10 bg-white/[0.04] text-white hover:border-white/25 hover:bg-white/[0.08]'
                                : 'border-white/5 bg-white/[0.02] text-white/25 grayscale'
                          )}
                        >
                          <div className="text-sm font-semibold">{slot.timeLabel}</div>
                          <div className={cn('mt-1 text-[11px]', selected ? 'text-neutral-800/80' : 'text-white/50')}>
                            {slot.available ? 'Disponible' : 'Indisponible'}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3">
      <div className="flex min-w-0 items-center gap-2 text-white/55">
        {icon}
        <span className="min-w-0 text-[10px] font-semibold uppercase leading-none tracking-[0.14em] text-white/55">
          {label}
        </span>
      </div>
      <p className="mt-2 break-words text-sm font-medium text-white">{value}</p>
    </div>
  )
}
