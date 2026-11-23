'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import AppHeader, { headerButtonClass } from '@/components/AppHeader'
import { Toast, useToast } from '@/components/Toast'
import { STATUS_CONFIG, STATUS_LIST, rupiah, type Status } from '@/lib/ui'
import {
  ArrowLeft,
  ClipboardList,
  Search,
  Phone,
  Calendar,
  Loader2,
  MessageCircle,
  ListFilter,
  Inbox,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'

type Order = {
  id: string
  invoice_number: string
  customer_name: string
  customer_phone: string
  items: unknown
  total_price: number
  status: Status
  wa_sent: boolean
  created_at: string
}

const chipClass = (active: boolean) =>
  `inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 motion-reduce:transition-none ${
    active
      ? 'border-teal-600 bg-teal-600 text-white'
      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
  }`

export default function OrdersPage() {
  const supabase = useMemo(() => createClient(), [])
  const { toast, show, hide } = useToast()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [filter, setFilter] = useState<Status | 'semua'>('semua')
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setLoadError(true)
    } else {
      setOrders((data as Order[]) ?? [])
      setLoadError(false)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  function retry() {
    setLoading(true)
    fetchOrders()
  }

  async function updateStatus(order: Order, newStatus: Status) {
    if (newStatus === order.status) return
    setUpdatingId(order.id)

    let waSent = order.wa_sent

    // 1. Jika status diubah ke 'selesai', panggil API WA dulu dengan nama field yang benar
    if (newStatus === 'selesai') {
      try {
        const res = await fetch('/api/send-wa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: order.customer_phone,
            customerName: order.customer_name,
            invoiceNumber: order.invoice_number,
          }),
        })

        const result = await res.json()

        if (res.ok && result.success) {
          waSent = true
          // Opsional: langsung buka tab WhatsApp simulasi, atau cukup tampilkan toast
          show('success', `Status selesai. Notifikasi WA untuk ${order.customer_name} diproses.`)
        } else {
          show('error', result.message || 'Notifikasi WA gagal diproses.')
        }
      } catch (err) {
        console.error('Gagal memanggil /api/send-wa', err)
        show('error', 'Status diubah, tetapi notifikasi WA gagal dikirim.')
      }
    }

    // 2. Update status sekaligus wa_sent ke Supabase
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus, wa_sent: waSent })
      .eq('id', order.id)

    if (error) {
      show('error', 'Gagal mengubah status. Coba lagi.')
      setUpdatingId(null)
      return
    }

    if (newStatus !== 'selesai') {
      show('success', `Status diubah ke ${STATUS_CONFIG[newStatus].label}.`)
    }

    await fetchOrders()
    setUpdatingId(null)
  }

  const counts = useMemo(() => {
    const c: Record<Status, number> = { masuk: 0, proses: 0, selesai: 0, diambil: 0 }
    orders.forEach((o) => {
      c[o.status] += 1
    })
    return c
  }, [orders])

  const visible = orders.filter((o) => {
    const matchStatus = filter === 'semua' || o.status === filter
    const q = search.trim().toLowerCase()
    const matchSearch =
      !q ||
      o.customer_name.toLowerCase().includes(q) ||
      o.invoice_number.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  return (
    <div className="min-h-dvh bg-slate-50">
      <AppHeader
        title="Daftar Cucian"
        subtitle="Kelola status order pelanggan"
        icon={ClipboardList}
        action={
          <Link href="/kasir" className={headerButtonClass}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Kembali ke Kasir</span>
            <span className="sr-only sm:hidden">Kembali ke Kasir</span>
          </Link>
        }
      />

      <main id="main" className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        {/* Filter & pencarian */}
        <section
          aria-label="Filter cucian"
          className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:pb-0" role="group" aria-label="Filter status">
              <button
                onClick={() => setFilter('semua')}
                aria-pressed={filter === 'semua'}
                className={chipClass(filter === 'semua')}
              >
                <ListFilter className="h-4 w-4" aria-hidden="true" />
                Semua ({orders.length})
              </button>
              {STATUS_LIST.map((s) => {
                const Icon = STATUS_CONFIG[s].icon
                return (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    aria-pressed={filter === s}
                    className={chipClass(filter === s)}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {STATUS_CONFIG[s].label} ({counts[s]})
                  </button>
                )
              })}
            </div>

            <div className="relative md:w-72">
              <label htmlFor="search" className="sr-only">
                Cari nama atau nomor invoice
              </label>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama / no. invoice"
                className="min-h-11 w-full rounded-xl border border-slate-200 py-2 pl-10 pr-3 text-base outline-none transition-colors duration-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 motion-reduce:transition-none"
              />
            </div>
          </div>
        </section>

        <p className="sr-only" aria-live="polite">
          {visible.length} cucian ditampilkan
        </p>

        {/* Konten */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-2xl border border-slate-200/80 bg-white motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : loadError ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-10 text-center"
          >
            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-500" aria-hidden="true" />
            <p className="font-medium text-red-800">Data cucian gagal dimuat.</p>
            <button
              onClick={retry}
              className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-red-700 shadow-sm ring-1 ring-red-200 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Coba lagi
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-16 text-center text-slate-600">
            <Inbox className="mx-auto mb-2 h-8 w-8 text-slate-400" aria-hidden="true" />
            <p className="font-medium text-slate-700">Belum ada cucian</p>
            <p className="mt-1 text-sm">
              {orders.length === 0
                ? 'Order baru dari halaman kasir akan muncul di sini.'
                : 'Tidak ada cucian yang cocok dengan filter atau pencarian.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((o) => {
              const cfg = STATUS_CONFIG[o.status]
              const Icon = cfg.icon
              const itemCount = Array.isArray(o.items) ? o.items.length : 0
              const busy = updatingId === o.id

              return (
                <article
                  key={o.id}
                  className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${cfg.box}`}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate font-semibold text-slate-800">{o.customer_name}</h2>
                        <p className="text-xs font-medium tabular-nums text-teal-700">
                          {o.invoice_number}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${cfg.badge}`}
                    >
                      <Icon className="h-3 w-3" aria-hidden="true" />
                      {cfg.label}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1.5 text-sm text-slate-600">
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      <span className="tabular-nums">{o.customer_phone}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      {new Date(o.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {itemCount > 0 && <span>· {itemCount} item</span>}
                    </p>
                    {o.wa_sent && (
                      <p className="flex items-center gap-2 font-medium text-teal-700">
                        <MessageCircle className="h-4 w-4" aria-hidden="true" /> Notifikasi WA terkirim
                      </p>
                    )}

                    {o.status === 'selesai' && (
                      <a
                        href={`https://wa.me/${o.customer_phone
                          .replace(/\D/g, '')
                          .replace(/^0/, '62')}?text=${encodeURIComponent(
                          `Halo ${o.customer_name}, cucian Anda (${o.invoice_number}) di Laundry Kinclong sudah SELESAI dan siap diambil. Terima kasih!`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                      >
                        <MessageCircle className="h-4 w-4" aria-hidden="true" />
                        Kirim WA Sekarang
                      </a>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <p className="text-lg font-bold tabular-nums text-slate-800">
                      {rupiah(o.total_price)}
                    </p>
                    <div className="flex items-center gap-2">
                      {busy && (
                        <Loader2 className="h-4 w-4 animate-spin text-teal-600" aria-hidden="true" />
                      )}
                      <label htmlFor={`status-${o.id}`} className="sr-only">
                        Ubah status {o.invoice_number}
                      </label>
                      <select
                        id={`status-${o.id}`}
                        value={o.status}
                        disabled={busy}
                        onChange={(e) => updateStatus(o, e.target.value as Status)}
                        className="min-h-11 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-base font-medium text-slate-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {STATUS_LIST.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_CONFIG[s].label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>

      <Toast toast={toast} onClose={hide} />
    </div>
  )
}