'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import AppHeader, { headerButtonClass } from '@/components/AppHeader'
import { Toast, useToast } from '@/components/Toast'
import { STATUS_CONFIG, STATUS_LIST, rupiah, type Status } from '@/lib/ui'
import { formatDateTimeID, type OrderItemData } from '@/lib/laundry-utils'
import {
  ArrowLeft,
  ClipboardList,
  Search,
  Phone,
  Calendar,
  CalendarClock,
  Loader2,
  ListFilter,
  Inbox,
  AlertCircle,
  RefreshCw,
  Eye,
  X,
  CreditCard,
  FileText,
  CheckCircle2,
  MessageCircle,
} from 'lucide-react'

type Order = {
  id: string
  invoice_number: string
  customer_name: string
  customer_phone: string
  items: OrderItemData[] | unknown
  total_price: number
  status: Status
  payment_status?: 'lunas' | 'belum_lunas' | string | null
  estimated_completion_at?: string | null
  completed_at?: string | null
  picked_up_at?: string | null
  notes?: string | null
  created_at: string
}

const chipClass = (active: boolean) =>
  `inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 motion-reduce:transition-none ${
    active
      ? 'border-teal-600 bg-teal-600 text-white'
      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
  }`

function getServiceCategories(items: unknown): string {
  if (!Array.isArray(items) || items.length === 0) return '-'
  const cats = new Set<string>()
  for (const raw of items as OrderItemData[]) {
    const c = (raw.category ?? '').toLowerCase()
    if (c === 'kiloan' || (raw.unit ?? '').toLowerCase() === 'kg') {
      cats.add('Laundry Kiloan')
    } else {
      cats.add('Laundry Satuan')
    }
  }
  return Array.from(cats).join(', ')
}

export default function OrdersPage() {
  const supabase = useMemo(() => createClient(), [])
  const { toast, show, hide } = useToast()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [filter, setFilter] = useState<Status | 'semua'>('semua')
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setLoadError(true)
    } else {
      const list = (data as Order[]) ?? []
      setOrders(list)
      setSelectedOrder((prev) => (prev ? list.find((o) => o.id === prev.id) ?? null : null))
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

    const nowIso = new Date().toISOString()
    const updatePayload: Record<string, string> = { status: newStatus }

    if (newStatus === 'selesai') {
      updatePayload.completed_at = nowIso
      try {
        await fetch('/api/send-wa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: order.customer_phone,
            customerName: order.customer_name,
            invoiceNumber: order.invoice_number,
          }),
        })
      } catch (err) {
        console.error('Gagal memanggil /api/send-wa', err)
      }
    } else if (newStatus === 'diambil') {
      updatePayload.picked_up_at = nowIso
      if (!order.completed_at) {
        updatePayload.completed_at = nowIso
      }
    }

    const { error } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', order.id)

    if (error) {
      show('error', 'Gagal mengubah status. Coba lagi.')
      setUpdatingId(null)
      return
    }

    show('success', `Status diubah ke ${STATUS_CONFIG[newStatus].label}.`)
    await fetchOrders()
    setUpdatingId(null)
  }

  async function togglePaymentStatus(order: Order) {
    const nextStatus = order.payment_status === 'lunas' ? 'belum_lunas' : 'lunas'
    setUpdatingId(order.id)

    const { error } = await supabase
      .from('orders')
      .update({ payment_status: nextStatus })
      .eq('id', order.id)

    if (error) {
      show('error', 'Gagal mengubah status pembayaran.')
      setUpdatingId(null)
      return
    }

    show('success', `Status pembayaran diubah ke ${nextStatus === 'lunas' ? 'Lunas' : 'Belum Lunas'}.`)
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
        subtitle="Kelola status & detail order pelanggan"
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
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition-colors duration-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 motion-reduce:transition-none"
              />
            </div>
          </div>
        </section>

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
              className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-red-700 shadow-sm ring-1 ring-red-200 hover:bg-red-50"
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
              const isPaid = (o.payment_status ?? 'lunas') === 'lunas'

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
                      Masuk: {formatDateTimeID(o.created_at)}
                      {itemCount > 0 && <span>· {itemCount} item</span>}
                    </p>
                    {o.estimated_completion_at && (
                      <p className="flex items-center gap-2 text-teal-700">
                        <CalendarClock className="h-4 w-4 text-teal-600" aria-hidden="true" />
                        Est. selesai: {formatDateTimeID(o.estimated_completion_at)}
                      </p>
                    )}
                    <p className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {isPaid ? 'Lunas' : 'Belum Lunas'}
                      </span>
                    </p>

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

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                    <p className="text-lg font-bold tabular-nums text-slate-800">
                      {rupiah(o.total_price)}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(o)}
                        className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        Detail
                      </button>

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
                        className="min-h-10 cursor-pointer rounded-xl border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
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

      {/* Modal Detail Pemesanan Lengkap */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-modal-title"
        >
          <div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 id="detail-modal-title" className="text-lg font-bold text-slate-900">
                  Detail Pemesanan
                </h2>
                <p className="text-sm font-semibold text-teal-700">{selectedOrder.invoice_number}</p>
                <p className="text-xs text-slate-400">ID: {selectedOrder.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Tutup detail"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 rounded-xl bg-slate-50 p-3.5 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Data Pelanggan
                </p>
                <p className="text-slate-800">
                  <strong>Nama:</strong> {selectedOrder.customer_name}
                </p>
                <p className="text-slate-800">
                  <strong>WhatsApp:</strong> {selectedOrder.customer_phone}
                </p>
                <p className="text-slate-800">
                  <strong>Jenis Layanan:</strong> {getServiceCategories(selectedOrder.items)}
                </p>
              </div>

              <div className="space-y-1.5 rounded-xl bg-slate-50 p-3.5 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status & Pembayaran
                </p>
                <p className="text-slate-800">
                  <strong>Status Pengerjaan:</strong> {STATUS_CONFIG[selectedOrder.status].label}
                </p>
                <div className="flex items-center gap-2 text-slate-800">
                  <strong>Pembayaran:</strong>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                      (selectedOrder.payment_status ?? 'lunas') === 'lunas'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {(selectedOrder.payment_status ?? 'lunas') === 'lunas' ? 'Lunas' : 'Belum Lunas'}
                  </span>
                  <button
                    type="button"
                    disabled={updatingId === selectedOrder.id}
                    onClick={() => togglePaymentStatus(selectedOrder)}
                    className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Ubah
                  </button>
                </div>
              </div>
            </div>

            {/* Jadwal & Tracking Waktu */}
            <div className="mt-4 grid gap-2 rounded-xl border border-slate-200/80 p-3.5 text-xs sm:grid-cols-2">
              <div>
                <span className="text-slate-500">Tanggal Masuk:</span>
                <p className="font-semibold text-slate-800">{formatDateTimeID(selectedOrder.created_at)}</p>
              </div>
              <div>
                <span className="text-slate-500">Estimasi Selesai:</span>
                <p className="font-semibold text-teal-700">
                  {formatDateTimeID(selectedOrder.estimated_completion_at)}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Tanggal Selesai Aktual:</span>
                <p className="font-semibold text-slate-800">
                  {formatDateTimeID(selectedOrder.completed_at)}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Tanggal Pengambilan:</span>
                <p className="font-semibold text-slate-800">
                  {formatDateTimeID(selectedOrder.picked_up_at)}
                </p>
              </div>
            </div>

            {/* Daftar Item Cucian */}
            <div className="mt-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Daftar Item Cucian
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Layanan</th>
                      <th className="px-3 py-2">Harga</th>
                      <th className="px-3 py-2">Qty / Berat</th>
                      <th className="px-3 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                      (selectedOrder.items as OrderItemData[]).map((it, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2">
                            <p className="font-medium text-slate-800">{it.name}</p>
                            {it.category && (
                              <p className="text-xs capitalize text-slate-500">{it.category}</p>
                            )}
                          </td>
                          <td className="px-3 py-2 tabular-nums text-slate-600">
                            {rupiah(it.price)} / {it.unit}
                          </td>
                          <td className="px-3 py-2 tabular-nums text-slate-700">
                            {it.qty} {it.unit}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-800">
                            {rupiah(it.subtotal)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-xs text-slate-500">
                          Rincian item tidak tersedia.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="border-t border-slate-200 bg-slate-50 font-bold text-slate-900">
                    <tr>
                      <td colSpan={3} className="px-3 py-2.5 text-right">
                        Total Pembayaran
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {rupiah(selectedOrder.total_price)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Catatan Tambahan */}
            <div className="mt-4 rounded-xl bg-slate-50 p-3.5 text-sm">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <FileText className="h-3.5 w-3.5" /> Catatan Tambahan
              </p>
              <p className="text-slate-700">{selectedOrder.notes || 'Tidak ada catatan tambahan.'}</p>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="min-h-11 cursor-pointer rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={hide} />
    </div>
  )
}