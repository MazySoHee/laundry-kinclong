'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  Shirt,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  Loader2,
  AlertCircle,
  Receipt,
  MessageCircle,
  TrendingUp,
} from 'lucide-react'

const inputClass = (hasError: boolean) =>
  `min-h-11 w-full rounded-xl border bg-white py-2.5 pl-10 text-base text-slate-900 placeholder:text-slate-400 outline-none transition-colors duration-200 focus:ring-2 motion-reduce:transition-none ${
    hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
      : 'border-slate-200 focus:border-teal-500 focus:ring-teal-100'
  }`

const benefits = [
  { icon: Receipt, text: 'Catat order & cetak nota digital' },
  { icon: MessageCircle, text: 'Notifikasi WhatsApp saat cucian selesai' },
  { icon: TrendingUp, text: 'Pantau pendapatan otomatis' },
]

export default function LoginPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [touched, setTouched] = useState({ email: false, password: false })

  const emailError =
    touched.email && !/^\S+@\S+\.\S+$/.test(email) ? 'Masukkan email yang valid.' : ''
  const passwordError = touched.password && !password ? 'Password wajib diisi.' : ''

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setTouched({ email: true, password: true })
    if (!/^\S+@\S+\.\S+$/.test(email) || !password) return

    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !data.user) {
      setError('Email atau password salah.')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'owner') {
      router.push('/dashboard')
    } else if (profile?.role === 'kasir') {
      router.push('/kasir')
    } else {
      setError('Profil pengguna tidak ditemukan.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-slate-50 lg:grid lg:grid-cols-2">
      {/* Panel branding */}
      <aside className="relative overflow-hidden bg-gradient-to-br from-teal-600 to-cyan-600 px-6 pb-8 pt-[max(2rem,env(safe-area-inset-top))] text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div aria-hidden="true" className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div aria-hidden="true" className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-white/10" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
            <Shirt className="h-6 w-6" aria-hidden="true" />
          </div>
          <span className="text-xl font-bold tracking-tight">Laundry Kinclong</span>
        </div>

        <div className="relative hidden lg:block">
          <h2 className="text-4xl font-bold leading-tight">
            Kelola laundry
            <br />
            lebih rapi & cepat.
          </h2>
          <ul className="mt-8 space-y-4">
            {benefits.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-teal-50">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative hidden text-sm text-teal-50 lg:block">
          Sistem Informasi Laundry Digital
        </p>
      </aside>

      {/* Form login */}
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-slate-800">Masuk</h1>
          <p className="mt-1 text-sm text-slate-600">
            Gunakan akun kasir atau pemilik untuk melanjutkan.
          </p>

          <form onSubmit={handleLogin} noValidate className="mt-6 space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Email
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  placeholder="nama@email.com"
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? 'email-error' : undefined}
                  className={`${inputClass(!!emailError)} pr-3`}
                />
              </div>
              {emailError && (
                <p id="email-error" className="mt-1.5 flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" /> {emailError}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  placeholder="Masukkan password"
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? 'password-error' : undefined}
                  className={`${inputClass(!!passwordError)} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  aria-pressed={showPassword}
                  className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xl text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {passwordError && (
                <p id="password-error" className="mt-1.5 flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" /> {passwordError}
                </p>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700"
              >
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-orange-500 text-base font-semibold text-white shadow-lg shadow-orange-500/20 transition duration-200 hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Memproses...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" aria-hidden="true" /> Masuk
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}