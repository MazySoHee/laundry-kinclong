'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import AppHeader, { headerButtonClass } from '@/components/AppHeader'
import { Toast, useToast } from '@/components/Toast'
import {
  ArrowLeft,
  Sliders,
  Scale,
  Shirt,
  Zap,
  Save,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'

const inputClass =
  'min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-colors duration-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 motion-reduce:transition-none'

export default function OperationalSettingsPage() {
  const supabase = useMemo(() => createClient(), [])
  const { toast, show, hide } = useToast()

  const [kiloanCap, setKiloanCap] = useState('50')
  const [satuanCap, setSatuanCap] = useState('30')
  const [expressCap, setExpressCap] = useState('10')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from('operational_settings')
      .select('kiloan_daily_capacity_kg, satuan_daily_capacity_items, express_daily_capacity')
      .eq('id', 1)
      .single()

    if (error) {
      setLoadError(true)
    } else if (data) {
      setKiloanCap(String(data.kiloan_daily_capacity_kg))
      setSatuanCap(String(data.satuan_daily_capacity_items))
      setExpressCap(String(data.express_daily_capacity))
      setLoadError(false)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()

    const k = Number(kiloanCap)
    const s = Number(satuanCap)
    const ex = Number(expressCap)

    if (!Number.isFinite(k) || k <= 0 || !Number.isFinite(s) || s <= 0 || !Number.isFinite(ex) || ex <= 0) {
      show('error', 'Semua nilai kapasitas harus berupa angka lebih dari 0.')
      return
    }

    setSaving(true)
    const { error } = await supabase
      .from('operational_settings')
      .update({
        kiloan_daily_capacity_kg: k,
        satuan_daily_capacity_items: Math.round(s),
        express_daily_capacity: Math.round(ex),
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)

    setSaving(false)

    if (error) {
      show('error', 'Gagal menyimpan kapasitas. Pastikan Anda login sebagai Pemilik.')
      return
    }

    show('success', 'Kapasitas operasional diperbarui. Estimasi kasir otomatis menyesuaikan.')
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      <AppHeader
        title="Kapasitas Operasional"
        subtitle="Atur batas pengerjaan harian untuk estimasi otomatis"
        icon={Sliders}
        action={
          <Link href="/dashboard" className={headerButtonClass}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Dashboard</span>
            <span className="sr-only sm:hidden">Dashboard</span>
          </Link>
        }
      />

      <main id="main" className="mx-auto max-w-2xl px-4 py-6">
        {loading ? (
          <div className="h-72 animate-pulse rounded-2xl border border-slate-200/80 bg-white motion-reduce:animate-none" />
        ) : loadError ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-10 text-center"
          >
            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-500" aria-hidden="true" />
            <p className="font-medium text-red-800">Gagal memuat pengaturan kapasitas.</p>
            <button
              onClick={() => {
                setLoading(true)
                loadSettings()
              }}
              className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-red-700 shadow-sm ring-1 ring-red-200 hover:bg-red-50"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Coba lagi
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSave}
            className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm"
          >
            <div>
              <label htmlFor="kiloan-cap" className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Scale className="h-4 w-4 text-teal-600" aria-hidden="true" />
                Kapasitas Laundry Kiloan per Hari (kg)
              </label>
              <input
                id="kiloan-cap"
                type="number"
                min="1"
                step="0.5"
                required
                value={kiloanCap}
                onChange={(e) => setKiloanCap(e.target.value)}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-slate-500">
                Jika total antrean aktif melebihi batas ini, estimasi selesai otomatis bertambah hari.
              </p>
            </div>

            <div>
              <label htmlFor="satuan-cap" className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Shirt className="h-4 w-4 text-teal-600" aria-hidden="true" />
                Kapasitas Laundry Satuan per Hari (poin/item)
              </label>
              <input
                id="satuan-cap"
                type="number"
                min="1"
                step="1"
                required
                value={satuanCap}
                onChange={(e) => setSatuanCap(e.target.value)}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-slate-500">
                Menghitung jumlah item dikalikan bobot kompleksitas layanan satuan.
              </p>
            </div>

            <div>
              <label htmlFor="express-cap" className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Zap className="h-4 w-4 text-orange-500" aria-hidden="true" />
                Kapasitas Same Day & Instant per Hari (slot)
              </label>
              <input
                id="express-cap"
                type="number"
                min="1"
                step="1"
                required
                value={expressCap}
                onChange={(e) => setExpressCap(e.target.value)}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-slate-500">
                Jika slot express penuh, estimasi layanan kilat otomatis menambah waktu tunggu (jam).
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-base font-semibold text-white shadow-lg shadow-orange-500/20 transition duration-200 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" aria-hidden="true" /> Simpan Kapasitas
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </main>

      <Toast toast={toast} onClose={hide} />
    </div>
  )
}