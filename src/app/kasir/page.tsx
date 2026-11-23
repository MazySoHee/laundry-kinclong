'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  Plus,
  Minus,
  Printer,
  LogOut,
  ClipboardList,
  CheckCircle2,
  Sparkles,
  WashingMachine,
  Wind,
  Zap,
  Shirt,
  ShoppingBag,
  User,
  Phone,
  Clock,
} from 'lucide-react'
import Link from 'next/link'

type Service = {
  id: string
  name: string
  category: 'kiloan' | 'satuan'
  price: number
  unit: string
  estimated_days: string
}

type CartItem = Service & { qty: number }

type SavedOrder = {
  invoice_number: string
  customer_name: string
  customer_phone: string
  items: CartItem[]
  total_price: number
  created_at: string
}

// Fungsi pintar untuk memberi ikon & warna otomatis sesuai nama layanan
function getServiceVisual(name: string, category: string) {
  const lower = name.toLowerCase()
  if (lower.includes('wash') || lower.includes('cuci')) {
    return {
      icon: WashingMachine,
      bg: 'bg-teal-50',
      text: 'text-teal-600',
      border: 'border-teal-100',
    }
  }
  if (lower.includes('iron') || lower.includes('setrika')) {
    return {
      icon: Zap,
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'border-amber-100',
    }
  }
  if (lower.includes('dry') || lower.includes('kering')) {
    return {
      icon: Wind,
      bg: 'bg-cyan-50',
      text: 'text-cyan-600',
      border: 'border-cyan-100',
    }
  }
  if (category === 'satuan' || lower.includes('shirt') || lower.includes('pants') || lower.includes('sweater')) {
    return {
      icon: Shirt,
      bg: 'bg-indigo-50',
      text: 'text-indigo-600',
      border: 'border-indigo-100',
    }
  }
  return {
    icon: Sparkles,
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-100',
  }
}

export default function KasirPage() {
  const [services, setServices] = useState<Service[]>([])
  const [cart, setCart] = useState<Record<string, number>>({})
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [receipt, setReceipt] = useState<SavedOrder | null>(null)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const fetchServices = async () => {
      const { data } = await supabase.from('services').select('*').order('category')
      if (data) setServices(data)
    }
    fetchServices()
  }, [])

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => {
      const current = prev[id] || 0
      const next = Math.max(0, current + delta)
      if (next === 0) {
        const copy = { ...prev }
        delete copy[id]
        return copy
      }
      return { ...prev, [id]: next }
    })
  }

  const selectedItems: CartItem[] = services
    .filter((s) => cart[s.id] > 0)
    .map((s) => ({ ...s, qty: cart[s.id] }))

  const totalItems = selectedItems.reduce((sum, item) => sum + item.qty, 0)
  const totalPrice = selectedItems.reduce((sum, item) => sum + item.price * item.qty, 0)

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedItems.length === 0) return alert('Pilih minimal 1 layanan terlebih dahulu!')

    setLoading(true)
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`

    const newOrder = {
      invoice_number: invoiceNumber,
      customer_name: customerName,
      customer_phone: customerPhone,
      items: selectedItems,
      total_price: totalPrice,
      status: 'masuk',
    }

    const { data, error } = await supabase.from('orders').insert(newOrder).select().single()

    setLoading(false)
    if (error) {
      alert('Gagal menyimpan pesanan: ' + error.message)
      return
    }

    setReceipt(data)
    setCart({})
    setCustomerName('')
    setCustomerPhone('')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const formatRupiah = (angka: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(angka)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header Tema Teal sesuai Referensi Desain */}
      <header className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md print:hidden">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight leading-tight">Laundry Kinclong</h1>
              <p className="text-xs text-teal-100">Kasir Digital • Cepat & Otomatis</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/kasir/orders"
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white/15 hover:bg-white/25 rounded-xl transition backdrop-blur-sm"
            >
              <ClipboardList className="w-4 h-4" />
              Daftar Cucian
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-white/10 hover:bg-red-500/80 rounded-xl transition"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Konten Utama */}
      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
        {/* Kolom Kiri: Daftar Layanan dengan Ikon */}
        <div className="lg:col-span-2 space-y-6">
          {(['kiloan', 'satuan'] as const).map((kategori) => (
            <div key={kategori} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="font-bold text-sm uppercase tracking-wider text-teal-700">
                  {kategori === 'kiloan' ? 'Laundry Kiloan' : 'Laundry Satuan'}
                </h2>
                <span className="text-xs text-slate-400">
                  Pilih jumlah untuk menambah ke nota
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {services
                  .filter((s) => s.category === kategori)
                  .map((service) => {
                    const qty = cart[service.id] || 0
                    const visual = getServiceVisual(service.name, service.category)
                    const IconComponent = visual.icon

                    return (
                      <div
                        key={service.id}
                        className={`flex items-center justify-between p-4 rounded-2xl bg-white border transition shadow-sm ${
                          qty > 0
                            ? 'border-teal-500 ring-1 ring-teal-500/20'
                            : 'border-slate-200/80 hover:border-teal-300'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {/* Kotak Ikon Berwarna */}
                          <div
                            className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${visual.bg} ${visual.text} ${visual.border}`}
                          >
                            <IconComponent className="w-6 h-6" />
                          </div>

                          <div>
                            <h3 className="font-bold text-slate-800">{service.name}</h3>
                            <div className="flex items-center gap-3 mt-1 text-xs">
                              <span className="flex items-center gap-1 text-slate-500">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                {service.estimated_days}
                              </span>
                              <span className="font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md">
                                {formatRupiah(service.price)} / {service.unit}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Tombol + / - */}
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => updateQty(service.id, -1)}
                            className="w-8 h-8 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 flex items-center justify-center hover:bg-slate-100 transition"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-6 text-center font-bold text-slate-800">{qty}</span>
                          <button
                            type="button"
                            onClick={() => updateQty(service.id, 1)}
                            className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 shadow-sm shadow-teal-600/20 transition"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>

        {/* Kolom Kanan: Ringkasan Pesanan & Tombol Checkout Oranye */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 h-fit sticky top-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-teal-600" />
              <h2 className="font-bold text-lg text-slate-800">Ringkasan Nota</h2>
            </div>
            {totalItems > 0 && (
              <span className="text-xs font-bold bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full">
                {totalItems} item
              </span>
            )}
          </div>

          <form onSubmit={handleCheckout} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Nama Pelanggan
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Nomor WhatsApp
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50/50"
                />
              </div>
            </div>

            {/* List Item Terpilih */}
            <div className="border-t border-dashed border-slate-200 pt-4 space-y-2.5">
              {selectedItems.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6 bg-slate-50 rounded-xl">
                  Belum ada layanan dipilih
                </p>
              ) : (
                selectedItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      {item.name}{' '}
                      <span className="text-xs font-semibold text-teal-600">
                        ({item.qty} {item.unit})
                      </span>
                    </span>
                    <span className="font-semibold text-slate-800">
                      {formatRupiah(item.price * item.qty)}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-slate-200 pt-4 flex justify-between items-center">
              <span className="font-semibold text-slate-500 text-sm">Total Bayar</span>
              <span className="text-2xl font-extrabold text-teal-700">
                {formatRupiah(totalPrice)}
              </span>
            </div>

            {/* Tombol Oranye Coral sesuai Referensi Desain */}
            <button
              type="submit"
              disabled={loading || selectedItems.length === 0}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl shadow-md shadow-orange-500/25 transition disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? 'Menyimpan...' : 'Checkout & Cetak Nota'}
            </button>
          </form>
        </div>
      </main>

      {/* Modal Nota Digital */}
      {receipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:static print:bg-white print:p-0">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl print:shadow-none print:max-w-full">
            <div className="text-center border-b border-dashed border-slate-300 pb-4 mb-4">
              <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-2 print:hidden">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h2 className="font-extrabold text-xl text-teal-700">LAUNDRY KINCLONG</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Nota Digital • {receipt.invoice_number}
              </p>
            </div>

            <div className="text-sm space-y-1.5 mb-4">
              <p className="flex justify-between">
                <span className="text-slate-500">Pelanggan</span>
                <strong className="text-slate-800">{receipt.customer_name}</strong>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-500">WhatsApp</span>
                <span className="text-slate-800">{receipt.customer_phone}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-500">Tanggal</span>
                <span className="text-slate-800">
                  {new Date(receipt.created_at).toLocaleString('id-ID')}
                </span>
              </p>
            </div>

            <div className="border-t border-b border-dashed border-slate-300 py-3 space-y-2 text-sm mb-4">
              {receipt.items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>
                    {item.name} x{item.qty}
                  </span>
                  <span className="font-medium">{formatRupiah(item.price * item.qty)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between font-extrabold text-lg text-teal-700 mb-6">
              <span>TOTAL</span>
              <span>{formatRupiah(receipt.total_price)}</span>
            </div>

            <div className="flex gap-2.5 print:hidden">
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl text-sm font-bold shadow-md shadow-orange-500/20 transition"
              >
                <Printer className="w-4 h-4" />
                Cetak Nota
              </button>
              <button
                onClick={() => setReceipt(null)}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}