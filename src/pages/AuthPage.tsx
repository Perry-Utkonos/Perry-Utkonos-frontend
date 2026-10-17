import { useState, type FormEvent } from 'react'
import { api, demo } from '../api'
import { errorMessage } from '../api/profiles'
import CentaurIcon from '../components/CentaurIcon'

export default function AuthPage() {
  const [register, setRegister] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    setBusy(true); setError(null)
    try {
      if (register) await api.register({ username: String(values.get('username')).trim(), email: String(values.get('email')).trim(), password: String(values.get('password')), displayName: String(values.get('displayName')).trim() })
      else await api.login({ usernameOrEmail: String(values.get('login')).trim(), password: String(values.get('password')) })
    } catch (cause) { setError(errorMessage(cause)) } finally { setBusy(false) }
  }
  if (demo) return <main className="auth-page"><section className="auth-card">
    <div className="brand"><CentaurIcon monochrome />fate.</div>
    <h1>Тестовый режим</h1>
    <p>Вход без регистрации с примерными анкетами и переписками.</p>
    <button className="button button-primary button-wide" onClick={() => demo?.enter()}>Открыть приложение</button>
  </section></main>
  return <main className="auth-page">
    <section className="auth-card">
      <div className="brand"><CentaurIcon monochrome />fate.</div>
      <h1>{register ? 'Начнём знакомство' : 'С возвращением'}</h1>
      <p>{register ? 'Создайте аккаунт и заполните свою анкету.' : 'Войдите, чтобы продолжить общение.'}</p>
      <form className="profile-form" onSubmit={submit} key={String(register)}>
        {register ? <>
          <label>Имя<input name="displayName" autoComplete="name" maxLength={80} required disabled={busy} /></label>
          <label>Логин<input name="username" autoComplete="username" minLength={3} maxLength={32} required disabled={busy} /></label>
          <label>Почта<input name="email" type="email" autoComplete="email" required disabled={busy} /></label>
        </> : <label>Почта или логин<input name="login" autoComplete="username" required disabled={busy} /></label>}
        <label>Пароль<input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : 1} required disabled={busy} /></label>
        {error && <p className="api-error" role="alert">{error}</p>}
        <button className="button button-primary button-wide" disabled={busy}>{busy ? 'Подождите…' : register ? 'Создать аккаунт' : 'Войти'}</button>
      </form>
      <button className="text-button auth-switch" disabled={busy} onClick={() => { setRegister(!register); setError(null) }}>{register ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}</button>
    </section>
  </main>
}
