// Google reCAPTCHA v3 (invisible). Off until VITE_RECAPTCHA_SITE_KEY is set in Vercel;
// the server checks the token when RECAPTCHA_SECRET_KEY is set (api/_lib/spam.js).
const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
let loading = null;

function load() {
  if (!SITE_KEY) return Promise.resolve(null);
  if (!loading) {
    loading = new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(SITE_KEY)}`;
      s.async = true;
      s.onload = () => window.grecaptcha.ready(() => resolve(window.grecaptcha));
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    });
  }
  return loading;
}

// Returns a token, or null when reCAPTCHA isn't configured or can't load (forms still submit).
export async function getRecaptchaToken(action) {
  try {
    const g = await load();
    return g ? await g.execute(SITE_KEY, { action }) : null;
  } catch {
    return null;
  }
}
