'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AppHeader, { headerButtonClass } from '@/components/AppHeader'
import ServiceIcon from '@/components/ServiceIcon'
import { Toast, useToast } from '@/components/Toast'
import { rupiah } from '@/lib/ui'
import {
  calculateDynamicEstimation,
  formatDateTimeID,
  sanitizePhoneInput,
  validateIndonesianPhone,
  type ActiveOrderForQueue,
  type OperationalSettings,
  type OrderItemData,
  type ServiceTier,
} from '@/lib/laundry-utils'
import {
  Clock,
  Plus,
  Minus,
  Trash2,
  ClipboardList,
  LogOut,
  Printer,
  CheckCircle2,
  Loader2,
  User,
  Phone,
  FileText,
  CreditCard,
  CalendarClock,
  ShoppingBag,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'

type Service = {
  id: string
  name: string
  category: 'kiloan' | 'satuan' | string
  price: number
  unit: string
  duration: string
  complexity_weight?: number
  service_tier?: ServiceTier
}

type SavedReceipt = {
  invoice_number: string
  customer_name: string
  customer_phone: string
  items: OrderItemData[]
  total_price: number
  payment_status: 'lunas' | 'belum_lunas'
  notes: string
  created_at: string
  estimated_completion_at: string
}

const DEFAULT_SETTINGS: OperationalSettings = {
  kiloan_daily_capacity_kg: 50,
  satuan_daily_capacity_items: 30,
  express_daily_capacity: 10,
}

const inputClass = (hasError?: boolean) =>
  `min-h-11 w-full rounded-xl border bg-white px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-400 outline-none transition-colors duration-200 focus:ring-2 motion-reduce:transition-none ${
    hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
      : 'border-slate-200 focus:border-teal-500 focus:ring-teal-100'
  }`

export default function KasirPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { toast, show, hide } = useToast()

  const [services, setServices] = useState<Service[]>([])
  const [activeOrders, setActiveOrders] = useState<ActiveOrderForQueue[]>([])
  const [settings, setSettings] = useState<OperationalSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [now, setNow] = useState<Date | null>(null)

  const [categoryFilter, setCategoryFilter] = useState<'semua' | 'kiloan' | 'satuan'>('semua')
  const [cart, setCart] = useState<OrderItemData[]>([])

  // Form pelanggan
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<'lunas' | 'belum_lunas'>('lunas')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [receipt, setReceipt] = useState<SavedReceipt | null>(null)

  const loadData = useCallback(async () => {
    const [svcRes, ordRes, setRes] = await Promise.all([
      supabase.from('services').select('*').order('name', { ascending: true }),
      supabase.from('orders').select('status, items').in('status', ['masuk', 'proses']),
      supabase
        .from('operational_settings')
        .select('kiloan_daily_capacity_kg, satuan_daily_capacity_items, express_daily_capacity')
        .eq('id', 1)
        .single(),
    ])

    if (svcRes.error) {
      setLoadError(true)
    } else {
      setServices((svcRes.data as Service[]) ?? [])
      setActiveOrders((ordRes.data as ActiveOrderForQueue[]) ?? [])
      if (setRes.data) {
        setSettings(setRes.data as OperationalSettings)
      }
      setLoadError(false)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    setNow(new Date())
    loadData()
  }, [loadData])

  function addToCart(svc: Service) {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.service_id === svc.id)
      if (idx >= 0) {
        const next = [...prev]
        const newQty = Number((next[idx].qty + 1).toFixed(2))
        next[idx] = { ...next[idx], qty: newQty, subtotal: Math.round(newQty * next[idx].price) }
        return next
      }
      return [
        ...prev,
        {
          service_id: svc.id,
          name: svc.name,
          category: svc.category,
          price: svc.price,
          unit: svc.unit,
          qty: 1,
          subtotal: svc.price,
          duration: svc.duration,
          complexity_weight: svc.complexity_weight ?? 1,
          service_tier: svc.service_tier,
        },
      ]
    })
  }

  function updateQty(serviceId: string | undefined, qty: number) {
    if (!serviceId) return
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.service_id !== serviceId))
      return
    }
    setCart((prev) =>
      prev.map((i) =>
        i.service_id === serviceId
          ? { ...i, qty, subtotal: Math.round(qty * i.price) }
          : i
      )
    )
  }

  function handlePhoneChange(raw: string) {
    const clean = sanitizePhoneInput(raw)
    setCustomerPhone(clean)
    if (phoneError) {
      const check = validateIndonesianPhone(clean)
      setPhoneError(check.valid ? null : check.error ?? null)
    }
  }

  const totalPrice = useMemo(
    () => cart.reduce((sum, item) => sum + item.subtotal, 0),
    [cart]
  )

  const estimation = useMemo(() => {
    if (!now || cart.length === 0) return null
    return calculateDynamicEstimation(cart, activeOrders, settings, now)
  }, [cart, activeOrders, settings, now])

  const filteredServices = useMemo(() => {
    if (categoryFilter === 'semua') return services
    return services.filter((s) => s.category.toLowerCase() === categoryFilter)
  }, [services, categoryFilter])

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault()

    if (cart.length === 0) {
      show('error', 'Pilih minimal 1 layanan terlebih dahulu.')
      return
    }
    if (!customerName.trim()) {
      show('error', 'Nama pelanggan wajib diisi.')
      return
    }

    const phoneCheck = validateIndonesianPhone(customerPhone)
    if (!phoneCheck.valid) {
      setPhoneError(phoneCheck.error ?? 'Nomor WhatsApp tidak valid.')
      show('error', phoneCheck.error ?? 'Nomor WhatsApp tidak valid.')
      return
    }

    setSubmitting(true)
    const currentNow = new Date()
    const finalEst = calculateDynamicEstimation(cart, activeOrders, settings, currentNow)
    const invoiceNumber = `INV-${currentNow.getFullYear()}${String(currentNow.getMonth() + 1).padStart(
      2,
      '0'
    )}${String(currentNow.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`

    const payload = {
      invoice_number: invoiceNumber,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      items: cart,
      total_price: totalPrice,
      status: 'masuk',
      payment_status: paymentStatus,
      notes: notes.trim() || null,
      estimated_completion_at: finalEst.estimatedDate.toISOString(),
    }

    const { error } = await supabase.from('orders').insert(payload)
    setSubmitting(false)

    if (error) {
      show('error', 'Gagal menyimpan transaksi. Coba lagi.')
      return
    }

    setReceipt({
      invoice_number: invoiceNumber,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      items: cart,
      total_price: totalPrice,
      payment_status: paymentStatus,
      notes: notes.trim(),
      created_at: currentNow.toISOString(),
      estimated_completion_at: finalEst.estimatedDate.toISOString(),
    })

    // Reset form & refresh antrean aktif agar estimasi order berikutnya langsung akurat
    setCart([])
    setCustomerName('')
    setCustomerPhone('')
    setPhoneError(null)
    setPaymentStatus('lunas')
    setNotes('')
    setNow(new Date())
    loadData()
    show('success', `Order ${invoiceNumber} berhasil disimpan!`)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="print:hidden">
        <AppHeader
          title="Kasir Laundry Kinclong"
          subtitle="Catat order & estimasi selesai otomatis"
          icon={ShoppingBag}
          action={
            <div className="flex items-center gap-2">
              <Link href="/kasir/orders" className={headerButtonClass}>
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Daftar Cucian</span>
              </Link>
              <button onClick={handleLogout} className={headerButtonClass}>
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          }
        />

        <main id="main" className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-12">
          {/* Kolom Kiri: Daftar Layanan */}
          <section className="space-y-4 lg:col-span-7" aria-label="Pilih layanan">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                {(['semua', 'kiloan', 'satuan'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`min-h-10 cursor-pointer rounded-xl border px-3.5 text-sm font-medium capitalize transition-colors ${
                      categoryFilter === cat
                        ? 'border-teal-600 bg-teal-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Antrean aktif: <strong className="text-slate-700">{activeOrders.length} order</strong>
              </p>
            </div>

            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white" />
                ))}
              </div>
            ) : loadError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
                <AlertCircle className="mx-auto mb-2 h-7 w-7 text-red-500" />
                <p className="text-sm font-medium text-red-800">Gagal memuat daftar layanan.</p>
                <button
                  onClick={() => {
                    setLoading(true)
                    loadData()
                  }}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200"
                >
                  <RefreshCw className="h-4 w-4" /> Coba lagi
                </button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredServices.map((svc) => {
                  const isKiloan = svc.category.toLowerCase() === 'kiloan'
                  return (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => addToCart(svc)}
                      className="flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-sm transition hover:border-teal-400 hover:shadow-md active:scale-[0.99]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                              isKiloan ? 'bg-teal-50 text-teal-600' : 'bg-amber-50 text-amber-600'
                            }`}
                          >
                            <ServiceIcon name={svc.name} category={svc.category} className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">{svc.name}</h3>
                            <span className="text-xs capitalize text-slate-500">{svc.category}</span>
                          </div>
                        </div>
                        <span className="rounded-lg bg-teal-50 p-1.5 text-teal-700">
                          <Plus className="h-4 w-4" />
                        </span>
                      </div>

                      <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-3">
                        <p className="text-base font-bold tabular-nums text-slate-800">
                          {rupiah(svc.price)}{' '}
                          <span className="text-xs font-normal text-slate-500">/ {svc.unit}</span>
                        </p>
                        <p className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="h-3.5 w-3.5" />
                          Dasar: {svc.duration}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          {/* Kolom Kanan: Ringkasan Nota & Form Checkout */}
          <section className="lg:col-span-5" aria-label="Ringkasan nota">
            <form
              onSubmit={handleCheckout}
              className="sticky top-6 space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
            >
              <h2 className="text-lg font-bold text-slate-800">Ringkasan Nota</h2>

              {/* Keranjang */}
              {cart.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-sm text-slate-500">
                  Klik layanan di sebelah kiri untuk menambahkan ke nota.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {cart.map((item) => (
                    <li key={item.service_id} className="flex items-center justify-between gap-2 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          {rupiah(item.price)} / {item.unit}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateQty(item.service_id, Number((item.qty - 0.5).toFixed(2)))}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                          aria-label="Kurangi"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={item.qty}
                          onChange={(e) => updateQty(item.service_id, parseFloat(e.target.value) || 0)}
                          className="h-8 w-14 rounded-lg border border-slate-200 text-center text-sm font-semibold text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => updateQty(item.service_id, Number((item.qty + 0.5).toFixed(2)))}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                          aria-label="Tambah"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateQty(item.service_id, 0)}
                          className="ml-1 text-slate-400 hover:text-red-500"
                          aria-label="Hapus item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Estimasi Selesai Dinamis (Wajib tampil sebelum checkout) */}
              {estimation && (
                <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3.5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal-800">
                    <CalendarClock className="h-4 w-4 text-teal-600" />
                    Estimasi Tanggal Selesai
                  </div>
                  <p className="mt-1 text-base font-bold text-teal-950">
                    {formatDateTimeID(estimation.estimatedDate)}
                  </p>
                  <ul className="mt-1.5 space-y-0.5 text-xs text-teal-800/90">
                    {estimation.notes.map((n, i) => (
                      <li key={i}>• {n}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Input Pelanggan */}
              <div className="space-y-3 border-t border-slate-100 pt-3">
                <div>
                  <label htmlFor="cust-name" className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <User className="h-3.5 w-3.5" /> Nama Pelanggan *
                  </label>
                  <input
                    id="cust-name"
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className={inputClass()}
                  />
                </div>

                <div>
                  <label htmlFor="cust-phone" className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <Phone className="h-3.5 w-3.5" /> Nomor WhatsApp (Angka 0-9) *
                  </label>
                  <input
                    id="cust-phone"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    maxLength={15}
                    value={customerPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="081234567890"
                    className={inputClass(Boolean(phoneError))}
                  />
                  {phoneError ? (
                    <p className="mt-1 text-xs font-medium text-red-600">{phoneError}</p>
                  ) : (
                    <p className="mt-1 text-xs text-slate-500">Hanya angka, diawali 08 atau 628 (10–15 digit).</p>
                  )}
                </div>

                <div>
                  <label htmlFor="pay-status" className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <CreditCard className="h-3.5 w-3.5" /> Status Pembayaran
                  </label>
                  <select
                    id="pay-status"
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as 'lunas' | 'belum_lunas')}
                    className={inputClass()}
                  >
                    <option value="lunas">Lunas</option>
                    <option value="belum_lunas">Belum Lunas (Bayar Nanti)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="order-notes" className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <FileText className="h-3.5 w-3.5" /> Catatan Tambahan (Opsional)
                  </label>
                  <textarea
                    id="order-notes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Pisahkan pakaian putih, tanpa pewangi"
                    className={inputClass()}
                  />
                </div>
              </div>

              {/* Total & Tombol Simpan */}
              <div className="border-t border-slate-100 pt-3">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Total Pembayaran</span>
                  <span className="text-xl font-bold tabular-nums text-slate-900">
                    {rupiah(totalPrice)}
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={submitting || cart.length === 0}
                  className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-base font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" /> Menyimpan...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5" /> Simpan Order
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </main>
      </div>

      {/* Modal Nota Digital setelah simpan (siap cetak) */}
      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 print:static print:bg-white print:p-0">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl print:shadow-none">
            <div className="text-center">
              <h3 className="text-lg font-bold text-teal-700">LAUNDRY KINCLONG</h3>
              <p className="text-xs text-slate-500">Nota Transaksi Digital</p>
              <p className="mt-1 font-mono text-sm font-semibold text-slate-800">{receipt.invoice_number}</p>
            </div>

            <div className="my-4 space-y-1 border-y border-dashed border-slate-200 py-3 text-xs text-slate-700">
              <p><strong>Pelanggan:</strong> {receipt.customer_name}</p>
              <p><strong>WhatsApp:</strong> {receipt.customer_phone}</p>
              <p><strong>Masuk:</strong> {formatDateTimeID(receipt.created_at)}</p>
              <p><strong>Estimasi Selesai:</strong> {formatDateTimeID(receipt.estimated_completion_at)}</p>
              <p>
                <strong>Pembayaran:</strong>{' '}
                {receipt.payment_status === 'lunas' ? 'Lunas' : 'Belum Lunas'}
              </p>
              {receipt.notes && <p><strong>Catatan:</strong> {receipt.notes}</p>}
            </div>

            <ul className="space-y-1.5 text-xs text-slate-700">
              {receipt.items.map((it, idx) => (
                <li key={idx} className="flex justify-between">
                  <span>
                    {it.name} ({it.qty} {it.unit})
                  </span>
                  <span className="font-semibold tabular-nums">{rupiah(it.subtotal)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-sm font-bold text-slate-900">
              <span>Total</span>
              <span className="tabular-nums">{rupiah(receipt.total_price)}</span>
            </div>

            <div className="mt-5 flex gap-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700"
              >
                <Printer className="h-4 w-4" /> Cetak Nota
              </button>
              <button
                type="button"
                onClick={() => setReceipt(null)}
                className="min-h-11 cursor-pointer rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
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