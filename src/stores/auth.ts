import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type AuthError,
} from 'firebase/auth'
import { firebaseAuth } from '@/lib/firebase'
import api from '@/services/api'
import type { User } from '@/types'

function mapFirebaseError(error: AuthError): string {
  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'Este email ya está registrado'
    case 'auth/invalid-email':
      return 'Email inválido'
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres'
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Credenciales incorrectas'
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera un momento e inténtalo de nuevo'
    case 'auth/operation-not-allowed':
      return 'El registro por email no está habilitado en Firebase Console'
    default:
      return error.message || 'Error de autenticación'
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('ma_token'))
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value)

  function setSession(idToken: string, userData: User) {
    token.value = idToken
    user.value = userData
    localStorage.setItem('ma_token', idToken)
  }

  async function syncProfile(idToken: string, name: string): Promise<User> {
    const { data } = await api.post<User>(
      '/auth/profile',
      { name },
      { headers: { Authorization: `Bearer ${idToken}` } },
    )
    return data
  }

  async function login(email: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password)
      const idToken = await credential.user.getIdToken()
      const { data } = await api.get<User>('/auth/me', {
        headers: { Authorization: `Bearer ${idToken}` },
      })
      setSession(idToken, data)
    } catch (e: unknown) {
      const authError = e as AuthError
      error.value = authError.code ? mapFirebaseError(authError) : 'Error al iniciar sesión'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function register(name: string, email: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const credential = await createUserWithEmailAndPassword(
        firebaseAuth,
        email.trim().toLowerCase(),
        password,
      )
      await updateProfile(credential.user, { displayName: name.trim() })
      const idToken = await credential.user.getIdToken(true)

      try {
        const profile = await syncProfile(idToken, name.trim())
        setSession(idToken, profile)
      } catch {
        // Usuario creado en Firebase Auth aunque falle sync con backend
        setSession(idToken, {
          id: credential.user.uid,
          email: credential.user.email || email.trim().toLowerCase(),
          name: name.trim(),
        })
      }
    } catch (e: unknown) {
      const authError = e as AuthError
      error.value = authError.code ? mapFirebaseError(authError) : 'Error al registrarse'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchUser() {
    if (!token.value) return
    try {
      const { data } = await api.get<User>('/auth/me', {
        headers: { Authorization: `Bearer ${token.value}` },
      })
      user.value = data
    } catch {
      logout()
    }
  }

  async function logout() {
    try {
      await signOut(firebaseAuth)
    } catch {
      // ignore
    }
    token.value = null
    user.value = null
    localStorage.removeItem('ma_token')
  }

  function clearError() {
    error.value = null
  }

  return {
    user, token, loading, error, isAuthenticated,
    login, register, fetchUser, logout, clearError,
  }
})
