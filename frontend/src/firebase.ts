import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
  type Auth
} from 'firebase/auth'

let runtimeConfig: Record<string, any> = {}

export function setFirebaseRuntimeConfig(config: {
  apiKey?: string
  projectId?: string
  authDomain?: string
  storageBucket?: string
  messagingSenderId?: string
  appId?: string
  [key: string]: any
}) {
  runtimeConfig = { ...runtimeConfig, ...config }
  app = null
  auth = null
}

export function getActiveFirebaseConfig() {
  return {
    apiKey: runtimeConfig.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: runtimeConfig.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: runtimeConfig.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: runtimeConfig.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: runtimeConfig.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: runtimeConfig.appId || import.meta.env.VITE_FIREBASE_APP_ID || '',
  }
}

export function isFirebaseConfigured(): boolean {
  const cfg = getActiveFirebaseConfig()
  return Boolean(cfg.apiKey && cfg.projectId)
}

let app: FirebaseApp | null = null
let auth: Auth | null = null

export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured()) return null
  const cfg = getActiveFirebaseConfig()
  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(cfg)
  }
  if (!auth) {
    auth = getAuth(app)
    auth.useDeviceLanguage()
    // Tắt reCAPTCHA trên Mobile / Dev / WebView
    try {
      auth.settings.appVerificationDisabledForTesting = true
    } catch (e) {
      console.warn('Không thể đặt appVerificationDisabledForTesting:', e)
    }
  }
  return auth
}

/**
 * Chuẩn hóa số điện thoại Việt Nam sang định dạng E.164 (+84...) theo yêu cầu của Firebase Auth
 */
export function formatToE164(phone: string): string {
  const cleaned = phone.trim().replace(/[\s.-]/g, '')
  if (cleaned.startsWith('+')) return cleaned
  if (cleaned.startsWith('0')) {
    return '+84' + cleaned.slice(1)
  }
  if (cleaned.startsWith('84')) {
    return '+' + cleaned
  }
  return '+84' + cleaned
}

/**
 * Thiết lập reCAPTCHA verifier cho Firebase Phone Auth
 */
export function setupRecaptcha(containerId: string): RecaptchaVerifier | null {
  const authInstance = getFirebaseAuth()
  if (!authInstance) return null

  if ((window as any).recaptchaVerifier) {
    try {
      (window as any).recaptchaVerifier.clear()
    } catch {
      // Bỏ qua lỗi clear nếu có
    }
  }

  const verifier = new RecaptchaVerifier(authInstance, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved
    },
    'expired-callback': () => {
      console.warn('reCAPTCHA đã hết hạn, vui lòng thử lại')
    }
  })

  ;(window as any).recaptchaVerifier = verifier
  return verifier
}

/**
 * Gửi mã OTP xác thực qua Firebase Phone Auth (Google SMS Network)
 */
export async function sendFirebaseOtp(
  phone: string,
  verifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  const authInstance = getFirebaseAuth()
  if (!authInstance) {
    throw new Error('Firebase chưa được cấu hình. Vui lòng kiểm tra Firebase Project ID và Web API Key.')
  }
  const formattedPhone = formatToE164(phone)
  return await signInWithPhoneNumber(authInstance, formattedPhone, verifier)
}

/**
 * Xác thực mã OTP và lấy Firebase ID Token
 */
export async function verifyFirebaseOtp(
  confirmationResult: ConfirmationResult,
  code: string
): Promise<string> {
  const userCredential = await confirmationResult.confirm(code)
  const idToken = await userCredential.user.getIdToken()
  return idToken
}
