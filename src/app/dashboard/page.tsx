'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AppHeader, { headerButtonClass } from '@/components/AppHeader'
import { Toast, useToast } from '@/components/Toast'
import { STATUS_CONFIG, STATUS_LIST, rupiah, type Status } from '@/lib/ui'
import {
  LayoutDashboard,
  Wallet,
  CalendarDays,
  TrendingUp,
  PackageOpen,
  Download,
  Settings2,
  LogOut,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Sliders,
} from 'lucide-react'

type Order = {
  id: string
  invoice_number: string
  customer_name: string
  customer_phone: string
  total_price: number
  status: Status
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { toast, show, hide } = useToast()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [now, setNow] = useState<Date | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('id, invoice_number, customer_name, customer_phone, total_price, status, created_at')
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
    setNow(new Date())
    load()
  }, [load])

  function retry() {
    setLoading(true)
    load()
  }

  const stats = useMemo(() => {
    let today = 0
    let month = 0
    let all = 0
    let todayCount = 0
    let monthCount = 0
    let notPickedUp = 0
    const byStatus: Record<Status, number> = { masuk: 0, proses: 0, selesai: 0, diambil: 0 }

    orders.forEach((o) => {
      const d = new Date(o.created_at)
      all += o.total_price
      byStatus[o.status] += 1

      if (now) {
        if (d.toDateString() === now.toDateString()) {
          today += o.total_price
          todayCount += 1
        }
        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
          month += o.total_price
          monthCount += 1
        }
      }

      if (o.status !== 'diambil') notPickedUp += 1
    })

    return { today, month, all, todayCount, monthCount, notPickedUp, byStatus }
  }, [orders, now])

  function exportCSV() {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const header = ['Invoice', 'Nama', 'Telepon', 'Total', 'Status', 'Tanggal']
    const rows = orders.map((o) => [
      o.invoice_number,
      o.customer_name,
      o.customer_phone,
      o.total_price,
      o.status,
      new Date(o.created_at).toLocaleString('id-ID'),
    ])
    const csv = [header, ...rows].map((r) => r.map(esc).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `laporan-laundry-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    show('success', `${orders.length} order berhasil diekspor.`)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const cards = [
    {
      label: 'Pendapatan Hari Ini',
      value: rupiah(stats.today),
      note: `${stats.todayCount} order`,
      icon: Wallet,
      box: 'bg-teal-50 text-teal-600',
    },
    {
      label: 'Pendapatan Bulan Ini',
      value: rupiah(stats.month),
      note: `${stats.monthCount} order`,
      icon: CalendarDays,
      box: 'bg-cyan-50 text-cyan-600',
    },
    {
      label: 'Total Semua Pendapatan',
      value: rupiah(stats.all),
      note: `${orders.length} order`,
      icon: TrendingUp,
      box: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: 'Belum Diambil',
      value: String(stats.notPickedUp),
      note: 'cucian menunggu',
      icon: PackageOpen,
      box: 'bg-amber-50 text-amber-600',
    },
  ]

  return (
    <div className="min-h-dvh bg-slate-50">
      <AppHeader
        title="Dashboard Pemilik"
        subtitle="Laundry Kinclong"
        icon={LayoutDashboard}
        action={
          <button onClick={handleLogout} className={headerButtonClass}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Keluar</span>
            <span className="sr-only sm:hidden">Keluar</span>
          </button>
        }
      />

      <main id="main" className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {loading ? (
          <div className="space-y-6" aria-busy="true">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-36 animate-pulse rounded-2xl border border-slate-200/80 bg-white motion-reduce:animate-none"
                />
              ))}
            </div>
            <div className="h-64 animate-pulse rounded-2xl border border-slate-200/80 bg-white motion-reduce:animate-none" />
          </div>
        ) : loadError ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-12 text-center"
          >
            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-500" aria-hidden="true" />
            <p className="font-medium text-red-800">Data dashboard gagal dimuat.</p>
            <button
              onClick={retry}
              className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-red-700 shadow-sm ring-1 ring-red-200 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Coba lagi
            </button>
          </div>
        ) : (
          <>
            {/* Kartu ringkasan */}
            <section
              aria-label="Ringkasan pendapatan"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              {cards.map((c) => {
                const Icon = c.icon
                return (
                  <div
                    key={c.label}
                    className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
                  >
                    <div
                      className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${c.box}`}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <p className="text-sm text-slate-600">{c.label}</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-slate-800">{c.value}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{c.note}</p>
                  </div>
                )
              })}
            </section>

            {/* Status cucian */}
            <section
              aria-label="Ringkasan status cucian"
              className="grid grid-cols-2 gap-3 lg:grid-cols-4"
            >
              {STATUS_LIST.map((s) => {
                const cfg = STATUS_CONFIG[s]
                const Icon = cfg.icon
                return (
                  <div
                    key={s}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cfg.box}`}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xl font-bold tabular-nums text-slate-800">
                        {stats.byStatus[s]}
                      </p>
                      <p className="text-xs text-slate-600">{cfg.label}</p>
                    </div>
                  </div>
                )
              })}
            </section>

            {/* Aksi */}
            <section aria-label="Aksi" className="grid gap-4 sm:grid-cols-3">
              <Link
                href="/dashboard/services"
                className="flex min-h-16 cursor-pointer items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-colors duration-200 hover:border-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 motion-reduce:transition-none"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                    <Settings2 className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Kelola Layanan & Harga</p>
                    <p className="text-sm text-slate-600">Tambah, edit, atau hapus layanan</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400" aria-hidden="true" />
              </Link>

              <Link
                href="/dashboard/settings"
                className="flex min-h-16 cursor-pointer items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-colors duration-200 hover:border-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 motion-reduce:transition-none"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                    <Sliders className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Kapasitas Operasional</p>
                    <p className="text-sm text-slate-600">Atur batas harian & antrean</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400" aria-hidden="true" />
              </Link>

              <button
                onClick={exportCSV}
                disabled={orders.length === 0}
                className="flex min-h-16 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-orange-500 p-4 text-base font-semibold text-white shadow-lg shadow-orange-500/20 transition duration-200 hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                <Download className="h-5 w-5" aria-hidden="true" />
                Export CSV
              </button>
            </section>

            {/* Order terbaru */}
            <section
              aria-labelledby="recent-title"
              className="rounded-2xl border border-slate-200/80 bg-white shadow-sm"
            >
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 id="recent-title" className="font-semibold text-slate-800">
                  Order Terbaru
                </h2>
              </div>
              {orders.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-slate-600">
                  Belum ada order. Data akan muncul setelah kasir menyimpan order pertama.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {orders.slice(0, 5).map((o) => {
                    const cfg = STATUS_CONFIG[o.status]
                    const Icon = cfg.icon
                    return (
                      <li
                        key={o.id}
                        className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-5 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">
                            {o.customer_name}
                          </p>
                          <p className="text-xs tabular-nums text-slate-500">
                            {o.invoice_number} ·{' '}
                            {new Date(o.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="text-sm font-semibold tabular-nums text-slate-700">
                            {rupiah(o.total_price)}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${cfg.badge}`}
                          >
                            <Icon className="h-3 w-3" aria-hidden="true" />
                            {cfg.label}
                          </span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </main>

      <Toast toast={toast} onClose={hide} />
    </div>
  )
}