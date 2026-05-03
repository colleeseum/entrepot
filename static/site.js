import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-functions.js";
import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  getDocs,
  orderBy,
  query,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import {
  STORAGE_ADDONS as GENERATED_STORAGE_ADDONS,
  STORAGE_SEASON_ADDONS as GENERATED_STORAGE_SEASON_ADDONS,
  STORAGE_CONDITIONS as GENERATED_STORAGE_CONDITIONS,
  STORAGE_ETIQUETTE as GENERATED_STORAGE_ETIQUETTE,
  STORAGE_SEASONS as GENERATED_STORAGE_SEASONS,
  VEHICLE_TYPES as GENERATED_VEHICLE_TYPES,
  I18N as GENERATED_I18N,
} from "./generated/website-text.generated.js";

const CONTACT_EMAILS = {
  default: "entrepot@as-colle.com",
  en: "warehouse@as-colle.com",
  fr: "entrepot@as-colle.com",
};
const CONTACT_FROM_ADDRESSES = {
  default: "Site <entrepot@as-colle.com>",
  en: "Site <warehouse@as-colle.com>",
  fr: "Site <entrepot@as-colle.com>",
};
const IS_LOCALHOST =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");
const DISABLE_MAILTO_FALLBACK = IS_LOCALHOST;
const IS_STAGING_PAGE =
  typeof window !== "undefined" &&
  (() => {
    try {
      const path = window.location.pathname || "";
      if (path === "/staging" || path.startsWith("/staging/")) return true;
      const params = new URLSearchParams(window.location.search || "");
      const value = (params.get("staging") || "").trim().toLowerCase();
      return value === "1" || value === "true";
    } catch (err) {
      return false;
    }
  })();

const DEBUG_I18N_KEYS =
  typeof window !== "undefined" &&
  (() => {
    if (!IS_STAGING_PAGE) return false;
    try {
      const params = new URLSearchParams(window.location.search || "");
      if (!params.has("debug")) return false;
      const value = (params.get("debug") || "").trim().toLowerCase();
      // Enable on ?debug, ?debug=1, ?debug=true, ?debug=i18n
      if (!value) return true;
      return value === "1" || value === "true" || value === "i18n";
    } catch (err) {
      return false;
    }
  })();

let EDIT_I18N =
  typeof window !== "undefined" &&
  (() => {
    if (!IS_STAGING_PAGE) return false;
    try {
      const params = new URLSearchParams(window.location.search || "");
      if (!params.has("edit")) return false;
      const value = (params.get("edit") || "").trim().toLowerCase();
      if (!value) return true;
      return value === "1" || value === "true" || value === "i18n";
    } catch (err) {
      return false;
    }
  })();
let stagingRefreshHandler = null;

const STAGING_ALLOWED_EMAILS = new Set(["sergecolle@gmail.com", "arcolle@gmail.com"]);

const syncI18nEditRootState = () => {
  if (typeof document === "undefined") return;
  if (EDIT_I18N) {
    document.documentElement.dataset.i18nEdit = "true";
  } else {
    delete document.documentElement.dataset.i18nEdit;
    delete document.documentElement.dataset.i18nEditCount;
  }
};

syncI18nEditRootState();

if (typeof window !== "undefined") {
  window.__ENTREPOT_STAGING_FLAGS__ = {
    isStaging: IS_STAGING_PAGE,
    edit: EDIT_I18N,
    debug: DEBUG_I18N_KEYS,
    path: window.location?.pathname || "",
    search: window.location?.search || "",
    loadedAt: Date.now(),
    build: "staging-edit-v1",
  };
}

const firebaseConfig = {
  apiKey: "AIzaSyAEtdh7DvpbC4T4HaQ646alWA1T9iSfz3o",
  authDomain: "tracker-187c5.firebaseapp.com",
  projectId: "tracker-187c5",
  storageBucket: "tracker-187c5.firebasestorage.app",
  messagingSenderId: "1044638579272",
  appId: "1:1044638579272:web:8c433ce2da61137c70f67d",
  measurementId: "G-BNNZ9YQLBK",
};

let firebaseApp = null;
let firebaseAnalytics = null;
let firebaseFunctions = null;
let firebaseAuth = null;
let firebaseDb = null;
let sendEmailCallable = null;
let createStorageRequestCallable = null;
let createStorageRequestsCallable = null;
let getWebsiteContentCallable = null;

try {
  firebaseApp = initializeApp(firebaseConfig);
  try {
    firebaseAnalytics = getAnalytics(firebaseApp);
  } catch (analyticsErr) {
    console.warn("Analytics unavailable", analyticsErr);
  }
  firebaseFunctions = getFunctions(firebaseApp);
  firebaseAuth = getAuth(firebaseApp);
  firebaseDb = getFirestore(firebaseApp);
  if (IS_LOCALHOST) {
    connectFunctionsEmulator(firebaseFunctions, "localhost", 5001);
    try {
      connectAuthEmulator(firebaseAuth, "http://localhost:9099", {
        disableWarnings: true,
      });
    } catch (err) {
      // ignore if already connected
    }
    try {
      connectFirestoreEmulator(firebaseDb, "localhost", 8081);
    } catch (err) {
      // ignore if already connected
    }
  }
  sendEmailCallable = httpsCallable(firebaseFunctions, "sendEmail");
  createStorageRequestCallable = httpsCallable(
    firebaseFunctions,
    "createStorageRequest",
  );
  createStorageRequestsCallable = httpsCallable(
    firebaseFunctions,
    "createStorageRequests",
  );
  getWebsiteContentCallable = httpsCallable(firebaseFunctions, "getWebsiteContent");
} catch (firebaseErr) {
  console.warn("Firebase initialization failed", firebaseErr);
}

const getContactEmail = (lang = currentLanguage) => {
  return CONTACT_EMAILS[lang] || CONTACT_EMAILS.default;
};
const getContactFromAddress = (lang = currentLanguage) => {
  return CONTACT_FROM_ADDRESSES[lang] || CONTACT_FROM_ADDRESSES.default;
};

const INSURANCE_BUFFER_DAYS = 15;

const SUPPORTED_LANGUAGES = ["en", "fr"];
const DEFAULT_LANGUAGE = "en";
const LANGUAGE_STORAGE_KEY = "ferme-colle-language";
let currentLanguage = DEFAULT_LANGUAGE;
let syncContractHelperLanguage = () => {};
let syncContactFormLanguage = () => {};
let attachContractPdfToContactForm = null;
let collectContractVehiclePayload = () => null;
let resetContractVehicleFields = () => {};
let refreshContractEstimate = () => {};

const CONTRACT_TEMPLATES = {
  en: "./static/documents/contract-en.pdf",
  fr: "./static/documents/contract-fr.pdf",
};

const ensureGeneratedData = (value, label) => {
  if (value === undefined || value === null) {
    throw new Error(
      `Missing generated website content: ${label}. Run "node functions/scripts/export-site-data.mjs --out static/generated/website-text.generated.js" before deploying.`,
    );
  }
  return value;
};

let STORAGE_ADDONS = Array.isArray(GENERATED_STORAGE_ADDONS)
  ? GENERATED_STORAGE_ADDONS
  : [];
let STORAGE_SEASON_ADDONS = Array.isArray(GENERATED_STORAGE_SEASON_ADDONS)
  ? GENERATED_STORAGE_SEASON_ADDONS
  : [];
let STORAGE_CONDITIONS = ensureGeneratedData(
  GENERATED_STORAGE_CONDITIONS,
  "STORAGE_CONDITIONS",
);
let STORAGE_ETIQUETTE = ensureGeneratedData(
  GENERATED_STORAGE_ETIQUETTE,
  "STORAGE_ETIQUETTE",
);
let SEASON_DEFINITIONS = ensureGeneratedData(
  GENERATED_STORAGE_SEASONS,
  "STORAGE_SEASONS",
);
let VEHICLE_TYPES = ensureGeneratedData(
  GENERATED_VEHICLE_TYPES,
  "VEHICLE_TYPES",
);
let I18N = ensureGeneratedData(GENERATED_I18N, "I18N");

const slugifyVehicleType = (value = "") =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");

let VEHICLE_TYPE_LOOKUP = new Map();
let VEHICLE_TYPE_SLUG_LOOKUP = new Map();
let VEHICLE_TYPE_LEGACY_LOOKUP = new Map();

let SEASON_LOOKUP = {};

const rebuildGeneratedLookups = () => {
  // Vehicle types
  const sortedVehicleTypes = ensureGeneratedData(VEHICLE_TYPES, "VEHICLE_TYPES")
    .slice()
    .sort((a, b) => {
      const aOrder =
        typeof a.order === "number" ? a.order : Number.MAX_SAFE_INTEGER;
      const bOrder =
        typeof b.order === "number" ? b.order : Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return (a.value || "").localeCompare(b.value || "");
    });
  VEHICLE_TYPES = sortedVehicleTypes;

  VEHICLE_TYPE_LOOKUP = new Map();
  VEHICLE_TYPE_SLUG_LOOKUP = new Map();
  VEHICLE_TYPE_LEGACY_LOOKUP = new Map();

  VEHICLE_TYPES.forEach((type) => {
    const key = type.id || type.value;
    if (key) {
      VEHICLE_TYPE_LOOKUP.set(key, type);
    }
    const slug = type.slug || slugifyVehicleType(type.value || "");
    if (slug) {
      VEHICLE_TYPE_SLUG_LOOKUP.set(slug, type);
    }
    const legacyValues = Array.isArray(type.legacyValues)
      ? type.legacyValues
      : [];
    legacyValues.forEach((legacy) => {
      if (!legacy) return;
      VEHICLE_TYPE_LEGACY_LOOKUP.set(legacy, type);
      const legacySlug = slugifyVehicleType(legacy);
      if (legacySlug && !VEHICLE_TYPE_SLUG_LOOKUP.has(legacySlug)) {
        VEHICLE_TYPE_SLUG_LOOKUP.set(legacySlug, type);
      }
    });
    if (type.value) {
      VEHICLE_TYPE_LEGACY_LOOKUP.set(type.value, type);
    }
  });

  // Seasons
  SEASON_DEFINITIONS = ensureGeneratedData(SEASON_DEFINITIONS, "STORAGE_SEASONS");
  SEASON_LOOKUP = SEASON_DEFINITIONS.reduce((acc, season) => {
    acc[season.id] = season;
    return acc;
  }, {});
  // Keep the shared policy card in sync with latest conditions.
  SHARED_POLICY_CARD.policies = STORAGE_CONDITIONS;
};

const setWebsiteContentPayload = (payload) => {
  if (!payload || typeof payload !== "object") return;
  if (payload.STORAGE_ADDONS) STORAGE_ADDONS = payload.STORAGE_ADDONS;
  if (payload.STORAGE_SEASON_ADDONS) STORAGE_SEASON_ADDONS = payload.STORAGE_SEASON_ADDONS;
  if (payload.STORAGE_CONDITIONS) STORAGE_CONDITIONS = payload.STORAGE_CONDITIONS;
  if (payload.STORAGE_ETIQUETTE) STORAGE_ETIQUETTE = payload.STORAGE_ETIQUETTE;
  if (payload.STORAGE_SEASONS) SEASON_DEFINITIONS = payload.STORAGE_SEASONS;
  if (payload.VEHICLE_TYPES) VEHICLE_TYPES = payload.VEHICLE_TYPES;
  if (payload.I18N) I18N = payload.I18N;
  rebuildGeneratedLookups();
};

const getVehicleTypeEntry = (value) => {
  if (!value) return null;
  return (
    VEHICLE_TYPE_LOOKUP.get(value) ||
    VEHICLE_TYPE_LEGACY_LOOKUP.get(value) ||
    VEHICLE_TYPE_SLUG_LOOKUP.get(slugifyVehicleType(value)) ||
    null
  );
};

const getVehicleTypeSlug = (value) => {
  return getVehicleTypeEntry(value)?.slug || slugifyVehicleType(value);
};

const isOtherVehicleType = (value) => getVehicleTypeSlug(value) === "other";
const requiresLengthForType = (value) =>
  LENGTH_REQUIRED_TYPE_SLUGS.has(getVehicleTypeSlug(value));

// Add-on prices are season-scoped (Tracker -> storageSeasonAddOns). Do not enforce a global price map.

const getRecaptchaSiteKey = () => {
  if (typeof document === "undefined") return "";
  const meta = document.querySelector('meta[name="recaptcha-site-key"]');
  return (meta?.content || "").trim();
};
const RECAPTCHA_SITE_KEY = getRecaptchaSiteKey();
const RECAPTCHA_RENDER_DELAY_MS = 250;
const RECAPTCHA_RENDER_MAX_ATTEMPTS = 40;
const RECAPTCHA_API_BASE_URL =
  "https://www.google.com/recaptcha/api.js?render=explicit";
const RECAPTCHA_LANGUAGE_CODES = {
  en: "en",
  fr: "fr",
};
let recaptchaScriptLanguage = null;
let recaptchaScriptPromise = null;
const recaptchaWidgets = new Map();

const isRecaptchaConfigured = () => Boolean(RECAPTCHA_SITE_KEY);

const getRecaptchaWidgetState = (container) => {
  if (!container) return null;
  if (!recaptchaWidgets.has(container)) {
    recaptchaWidgets.set(container, {
      widgetId: null,
      renderAttempts: 0,
      renderRequested: false,
    });
  }
  return recaptchaWidgets.get(container);
};

const isRecaptchaWidgetReady = (container) => {
  if (typeof window === "undefined") return false;
  const state = getRecaptchaWidgetState(container);
  return (
    typeof state?.widgetId === "number" &&
    typeof window.grecaptcha?.getResponse === "function"
  );
};

const getRecaptchaLanguageCode = (lang = currentLanguage) => {
  return (
    RECAPTCHA_LANGUAGE_CODES[lang] ||
    RECAPTCHA_LANGUAGE_CODES[DEFAULT_LANGUAGE]
  );
};

const cleanupRecaptchaScript = () => {
  if (typeof document !== "undefined") {
    document
      .querySelectorAll('script[data-recaptcha-script]')
      .forEach((script) => script.remove());
  }
  if (typeof window !== "undefined") {
    try {
      delete window.grecaptcha;
    } catch (err) {
      window.grecaptcha = undefined;
    }
    try {
      delete window.___grecaptcha_cfg;
    } catch (err) {
      window.___grecaptcha_cfg = undefined;
    }
  }
  recaptchaScriptPromise = null;
  recaptchaScriptLanguage = null;
};

const loadRecaptchaScript = (lang = currentLanguage) => {
  if (!isRecaptchaConfigured()) return Promise.resolve();
  if (typeof document === "undefined") {
    return Promise.reject(
      new Error("Document unavailable when loading reCAPTCHA."),
    );
  }
  const targetLang = getRecaptchaLanguageCode(lang);
  if (recaptchaScriptPromise && recaptchaScriptLanguage === targetLang) {
    return recaptchaScriptPromise;
  }
  if (recaptchaScriptLanguage && recaptchaScriptLanguage !== targetLang) {
    cleanupRecaptchaScript();
  }
  recaptchaScriptLanguage = targetLang;
  const scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${RECAPTCHA_API_BASE_URL}&hl=${targetLang}`;
    script.async = true;
    script.defer = true;
    script.dataset.recaptchaScript = "true";
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Google reCAPTCHA script."));
    document.head.appendChild(script);
  });
  recaptchaScriptPromise = scriptPromise.catch((err) => {
    recaptchaScriptPromise = null;
    throw err;
  });
  return recaptchaScriptPromise;
};

const resetRecaptchaWidgetState = (container) => {
  if (!container) return;
  const previous = recaptchaWidgets.get(container);
  recaptchaWidgets.set(container, {
    widgetId: null,
    renderAttempts: 0,
    renderRequested: false,
    onChange: previous?.onChange || null,
    onExpired: previous?.onExpired || null,
  });
};

const configureRecaptchaWidget = (container, options = {}) => {
  const state = getRecaptchaWidgetState(container);
  if (!state) return;
  state.onChange = options.onChange || null;
  state.onExpired = options.onExpired || null;
};

const refreshRecaptchaForLanguage = () => {
  if (!isRecaptchaConfigured()) return;
  const containers = Array.from(recaptchaWidgets.keys());
  containers.forEach((container) => {
    container.innerHTML = "";
    resetRecaptchaWidgetState(container);
    setupRecaptchaWidget(container);
  });
};

const setupRecaptchaWidget = (container) => {
  const state = getRecaptchaWidgetState(container);
  if (
    !container ||
    state?.renderRequested ||
    typeof state?.widgetId === "number" ||
    !isRecaptchaConfigured() ||
    typeof window === "undefined"
  ) {
    return;
  }
  const attemptRender = () => {
    console.debug("[recaptcha] render attempt", {
      attempt: state.renderAttempts,
      hasApi: Boolean(window.grecaptcha),
      hasRender: Boolean(window.grecaptcha?.render),
    });
    if (window.grecaptcha?.render) {
      const renderWidget = () => {
        try {
          state.widgetId = window.grecaptcha.render(container, {
            sitekey: RECAPTCHA_SITE_KEY,
            callback: (token) => {
              if (typeof state.onChange === "function") {
                state.onChange(token || "");
              }
            },
            "expired-callback": () => {
              if (typeof state.onExpired === "function") {
                state.onExpired();
              } else if (typeof state.onChange === "function") {
                state.onChange("");
              }
            },
            "error-callback": () => {
              if (typeof state.onExpired === "function") {
                state.onExpired();
              } else if (typeof state.onChange === "function") {
                state.onChange("");
              }
            },
          });
          console.debug("[recaptcha] widget rendered", {
            widgetId: state.widgetId,
          });
        } catch (err) {
          console.error("reCAPTCHA rendering failed", err);
        }
      };
      if (typeof window.grecaptcha.ready === "function") {
        window.grecaptcha.ready(renderWidget);
      } else {
        renderWidget();
      }
      return;
    }
    if (state.renderAttempts >= RECAPTCHA_RENDER_MAX_ATTEMPTS) {
      console.warn("reCAPTCHA did not become ready in time.");
      return;
    }
    state.renderAttempts += 1;
    window.setTimeout(attemptRender, RECAPTCHA_RENDER_DELAY_MS);
  };
  state.renderRequested = true;
  loadRecaptchaScript(currentLanguage)
    .then(() => {
      if (!state.renderRequested) return;
      attemptRender();
    })
    .catch((err) => {
      state.renderRequested = false;
      console.error("reCAPTCHA script failed to load", err);
      container.innerHTML = "";
    });
};

const getRecaptchaToken = (container) => {
  if (!isRecaptchaWidgetReady(container)) return "";
  const state = getRecaptchaWidgetState(container);
  return window.grecaptcha.getResponse(state.widgetId);
};

const resetRecaptchaWidget = (container) => {
  if (!isRecaptchaWidgetReady(container)) return;
  const state = getRecaptchaWidgetState(container);
  try {
    window.grecaptcha.reset(state.widgetId);
  } catch (err) {
    console.warn("reCAPTCHA reset failed", err);
  }
};

const getVehicleLabelForLanguage = (value, lang = currentLanguage) => {
  if (!value) return "";
  const entry = getVehicleTypeEntry(value);
  if (!entry) return value;
  const labels = entry.labels || {};
  return labels[lang] || labels[DEFAULT_LANGUAGE] || entry.value || value;
};

const populateVehicleOptionsForSelect = (select) => {
  if (!select) return;
  const selectedValue = select.value;
  select.querySelectorAll("option[data-vehicle-option]").forEach((option) => {
    option.remove();
  });
  VEHICLE_TYPES.forEach((type) => {
    const option = document.createElement("option");
    option.value = type.id || type.value;
    option.dataset.vehicleOption = "true";
    option.textContent = getVehicleLabelForLanguage(option.value);
    select.appendChild(option);
  });
  if (selectedValue) {
    select.value = selectedValue;
    if (select.value !== selectedValue) {
      const entry = getVehicleTypeEntry(selectedValue);
      if (entry) {
        select.value = entry.id || entry.value || selectedValue;
      }
    }
  }
};

const LENGTH_REQUIRED_TYPE_SLUGS = new Set([
  "rv-motorhome",
  "car",
  "truck",
  "other",
]);

const CONTRACT_FORM_MEMORY_PREFIX = "contract-helper-vehicle-";
const CONTRACT_FORM_MEMORY_FIELDS = [
  "vehicleType",
  "vehicleTypeOther",
  "vehicleBrand",
  "vehicleModel",
  "vehicleColour",
  "vehicleLength",
  "vehicleYear",
  "vehiclePlate",
  "vehicleProv",
  "insuranceCompany",
  "insurancePolicy",
  "battery",
  "propane",
];
const CONTRACT_FORM_IGNORED_MEMORY_FIELDS = new Set(["email"]);

const getVehicleStorageKey = (type) => {
  if (!type) return null;
  return `${CONTRACT_FORM_MEMORY_PREFIX}${type}`;
};

const clearLanguageIndicators = () => {
  if (typeof window === "undefined" || !window.history?.replaceState) return;
  try {
    const url = new URL(window.location.href);
    let changed = false;
    if (url.searchParams.has("lang")) {
      url.searchParams.delete("lang");
      changed = true;
    }
    if (url.hash) {
      const hashValue = url.hash.replace(/^#/, "").toLowerCase();
      if (SUPPORTED_LANGUAGES.includes(hashValue)) {
        url.hash = "";
        changed = true;
      }
    }
    if (changed) {
      const newUrl = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState({}, "", newUrl);
    }
  } catch (err) {}
};


const formatCurrency = (value, lang = currentLanguage, options = {}) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  const locale = getLocale(lang);
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 0,
  });
  const amount = formatter.format(num);
  return lang === "fr" ? `${amount}\u00A0$` : `$${amount}`;
};

const formatPdfCurrency = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return num.toFixed(2);
};

const parseCurrencyValue = (value) => {
  if (value === null || value === undefined) return null;
  const normalized = typeof value === "string" ? value : String(value);
  const amount = Number(normalized.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(amount) ? amount : null;
};

const formatPhoneNumber = (value = "") => {
  const input = String(value || "").trim();
  if (!input) return "";
  const digits = input.replace(/\D+/g, "");
  if (!digits) return input;

  let local = digits;
  if (local.length === 11 && local.startsWith("1")) {
    local = local.slice(1);
  }

  if (local.length === 10) {
    const area = local.slice(0, 3);
    const exchange = local.slice(3, 6);
    const station = local.slice(6);
    return `+1 ${area}-${exchange}-${station}`;
  }

  if (local.length === 7) {
    const exchange = local.slice(0, 3);
    const station = local.slice(3);
    return `${exchange}-${station}`;
  }

  return input;
};

const formatPdfDate = (value = "") => {
  if (!value) return "";
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/;
  if (isoMatch.test(value)) {
    const [, year, month, day] = isoMatch.exec(value);
    return `${month}/${day}/${year}`;
  }
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }
  return value;
};

const I18N_FALLBACKS = {
  "form.queue.added": {
    en: "Vehicle added to your request.",
    fr: "Véhicule ajouté à votre demande.",
  },
  "form.queue.missingVehicle": {
    en: "Please add a vehicle to your request.",
    fr: "Veuillez ajouter un véhicule à votre demande.",
  },
  "form.queue.remove": {
    en: "Remove",
    fr: "Retirer",
  },
  "form.requestStatus.error": {
    en: "Unable to submit the request right now. Please try again.",
    fr: "Impossible d’envoyer la demande pour l’instant. Veuillez réessayer.",
  },
  "form.requestStatus.sending": {
    en: "Sending your request…",
    fr: "Envoi de votre demande…",
  },
  "form.requestStatus.success": {
    en: "Request sent. Confirmation number: {{confirmation}}. We will contact you at {{email}}.",
    fr: "Demande envoyée. Numéro de confirmation : {{confirmation}}. Nous vous contacterons à {{email}}.",
  },
  "form.requestStatus.successNoCode": {
    en: "Request sent. We will contact you at {{email}}.",
    fr: "Demande envoyée. Nous vous contacterons à {{email}}.",
  },
  "form.requestStatus.unavailable": {
    en: "Request service unavailable. Please try again later.",
    fr: "Service de demande indisponible. Veuillez réessayer plus tard.",
  },
  "form.captcha.error": {
    en: "Please complete the captcha before submitting your request.",
    fr: "Veuillez compléter le captcha avant d’envoyer votre demande.",
  },
  "form.captcha.hint": {
    en: "This helps us block automated submissions.",
    fr: "Cela nous aide à bloquer les envois automatisés.",
  },
  "form.captcha.label": {
    en: "Security check",
    fr: "Vérification de sécurité",
  },
  "form.captcha.unavailable": {
    en: "Security check is still loading. Please wait a moment and try again.",
    fr: "La vérification de sécurité est encore en chargement. Veuillez patienter et réessayer.",
  },
};

const getTranslation = (key, lang = currentLanguage) => {
  const entry = I18N[key] || I18N_FALLBACKS[key];
  if (!entry) return "";
  return entry[lang] || entry[DEFAULT_LANGUAGE] || "";
};

const getMessage = (key, lang = currentLanguage) => getTranslation(key, lang);

const formatTemplate = (template, replacements = {}) => {
  if (!template) return "";
  return template.replace(/{{(\w+)}}|{(\w+)}/g, (_, doubleToken, singleToken) => {
    const token = doubleToken || singleToken;
    const value = replacements[token];
    return value === undefined ? "" : String(value);
  });
};

const formatRequestError = (err) => {
  if (!err) return "";
  if (typeof err === "string") return err;
  const message = err?.message ? String(err.message) : "";
  const code = err?.code ? String(err.code) : "";
  if (message && code && !message.includes(code)) {
    return `${message} (${code})`;
  }
  if (message) return message;
  if (code) return `Request failed (${code}).`;
  return "";
};

const getLocale = (lang = currentLanguage) => (lang === "fr" ? "fr-CA" : "en-CA");
const getLocalizedText = (value, lang = currentLanguage) => {
  if (typeof value === "function") {
    return value(lang);
  }
  if (value && typeof value === "object") {
    return value[lang] || value[DEFAULT_LANGUAGE] || "";
  }
  return value || "";
};

const getPricingReplacements = () => ({});

const resolvePolicyEntry = (policy, lang = currentLanguage) => {
  if (!policy) return { text: "", tooltip: undefined };
  if (typeof policy === "function") {
    return { text: policy(lang) || "", tooltip: undefined };
  }
  const replacements = getPricingReplacements(lang);
  const base = policy && typeof policy === "object" && "text" in policy ? policy.text : policy;
  const textValue = getLocalizedText(base, lang);
  const resolvedText = formatTemplate(textValue, replacements);
  const tooltipValue =
    policy && typeof policy === "object" && "tooltip" in policy
      ? getLocalizedText(policy.tooltip, lang)
      : policy?.tooltipKey
        ? getTranslation(policy.tooltipKey, lang)
        : undefined;
  return { text: resolvedText, tooltip: tooltipValue };
};

const SHARED_POLICY_TEXT_FALLBACKS = {
  name: {
    en: "Access, maintenance & conditions",
    fr: "Accès, entretien et conditions",
  },
  seasonLabel: {
    en: "Applies to every booking",
    fr: "S’applique à toutes les réservations",
  },
  description: {
    en: "Propane, payment, deposit and access conditions that cover both indoor and outdoor storage.",
    fr: "Règles sur les réservoirs de propane/d’essence, les paiements, les dépôts et les conditions d’accès pour tout type d’entreposage.",
  },
  ruleTitle: {
    en: "Access, maintenance & conditions",
    fr: "Accès, entretien et conditions",
  },
};

const loggedSharedPolicyWarnings = new Set();

const getSharedPolicyText = (token, lang = currentLanguage) => {
  const text = getTranslation(`sharedPolicies.${token}`, lang);
  if (text) return text;
  if (!loggedSharedPolicyWarnings.has(token)) {
    console.warn(
      `Missing shared policy translation: sharedPolicies.${token}. Falling back to built-in copy.`,
    );
    loggedSharedPolicyWarnings.add(token);
  }
  const fallback = SHARED_POLICY_TEXT_FALLBACKS[token];
  return fallback?.[lang] || fallback?.[DEFAULT_LANGUAGE] || "";
};

const SHARED_POLICY_CARD = {
  id: "shared",
  name: (lang = currentLanguage) => getSharedPolicyText("name", lang),
  seasonLabel: (lang = currentLanguage) =>
    getSharedPolicyText("seasonLabel", lang),
  description: (lang = currentLanguage) =>
    getSharedPolicyText("description", lang),
  ruleTitle: (lang = currentLanguage) => getSharedPolicyText("ruleTitle", lang),
  policies: STORAGE_CONDITIONS,
};

// Initialize lookups from the generated content (static file).
rebuildGeneratedLookups();

const normalizeSeasonDateString = (value = "") => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const frenchAdjusted = trimmed.replace(
    /(\d{1,2})(er)?\s([^.\s]+)\.?(?:\s)?(\d{4})/i,
    "$3 $1, $4",
  );
  return frenchAdjusted.replace(
    /(\d{1,2})\s([A-Za-z]+)\s(\d{4})/i,
    "$2 $1, $3",
  );
};

const parseSeasonDate = (value = "") => {
  const normalized = normalizeSeasonDateString(value);
  if (!normalized) return null;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getSeasonPickupDate = (seasonValue) => {
  if (!seasonValue) return null;
  const season =
    typeof seasonValue === "string" ? SEASON_LOOKUP[seasonValue] : seasonValue;
  if (!season || !season.pickupDeadline) return null;
  const pickupText = getLocalizedText(season.pickupDeadline, "en");
  return parseSeasonDate(pickupText);
};

const getAllSeasonCards = () => [...SEASON_DEFINITIONS, SHARED_POLICY_CARD];

const getSeasonLabelForLanguage = (seasonId, lang = currentLanguage) => {
  const season = SEASON_LOOKUP[seasonId];
  if (!season) return "";
  return getLocalizedText(season.seasonLabel, lang);
};

const populateSeasonOptionsForSelect = (select) => {
  if (!select) return;
  const selectedValue = select.value;
  select.querySelectorAll("option[data-season-option]").forEach((option) => {
    option.remove();
  });
  SEASON_DEFINITIONS.forEach((season) => {
    const option = document.createElement("option");
    option.value = season.id;
    option.dataset.seasonOption = "true";
    option.textContent = getSeasonLabelForLanguage(season.id);
    select.appendChild(option);
  });
  if (selectedValue) {
    select.value = selectedValue;
  }
};

const findSeasonByLabel = (label = "") => {
  if (!label) return null;
  const normalized = label.toLowerCase();
  return SEASON_DEFINITIONS.find((season) => {
    const en = getLocalizedText(season.seasonLabel, "en").toLowerCase();
    const fr = getLocalizedText(season.seasonLabel, "fr").toLowerCase();
    return normalized === en || normalized === fr;
  });
};

const offerRequiresLength = (offer) => {
  if (!offer) return false;
  if (offer.price?.mode === "perFoot") return true;
  return Boolean(offer.lengthRange);
};

const lengthMatchesRange = (length, range) => {
  if (!range) return true;
  if (!Number.isFinite(length)) return false;
  if (typeof range.min === "number") {
    if (range.exclusiveMin) {
      if (!(length > range.min)) return false;
    } else if (!(length >= range.min)) {
      return false;
    }
  }
  if (typeof range.max === "number") {
    if (range.exclusiveMax) {
      if (!(length < range.max)) return false;
    } else if (!(length <= range.max)) {
      return false;
    }
  }
  return true;
};

const offerSupportsVehicleType = (offer, vehicleTypeId) => {
  if (!offer || !Array.isArray(offer.vehicleTypes) || !vehicleTypeId) return false;
  if (offer.vehicleTypes.length === 0) return true;
  if (offer.vehicleTypes.includes(vehicleTypeId)) return true;
  const entry = getVehicleTypeEntry(vehicleTypeId);
  if (!entry) {
    return offer.vehicleTypes.includes(vehicleTypeId);
  }
  const candidates = new Set([
    entry.id,
    entry.value,
    entry.slug,
    ...(Array.isArray(entry.legacyValues) ? entry.legacyValues : []),
  ]);
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (offer.vehicleTypes.includes(candidate)) {
      return true;
    }
  }
  return false;
};

const getOffersForType = (season, vehicleType) => {
  if (!season || !vehicleType) return [];
  return season.offers.filter((offer) =>
    offerSupportsVehicleType(offer, vehicleType),
  );
};

const getSeasonAddonPrice = (seasonId = "", code = "") => {
  if (!seasonId || !code) return null;
  const entry = STORAGE_SEASON_ADDONS.find(
    (row) => row && row.seasonId === seasonId && row.code === code,
  );
  if (!entry) return null;
  return typeof entry.price === "number" ? entry.price : Number(entry.price) || 0;
};

const computeOfferPrice = (offer, context) => {
  if (!offer || !offer.price) return null;
  if (offer.price.mode === "contact") return null;
  if (offer.price.mode === "flat") {
    return offer.price.amount;
  }
  if (offer.price.mode === "perFoot") {
    const length = context.length;
    if (!Number.isFinite(length)) return null;
    const minimum = offer.price.minimum || 0;
    return Math.max(length * offer.price.rate, minimum);
  }
  return null;
};

const estimateRentalCost = (values) => {
  const season = SEASON_LOOKUP[values.season];
  if (!season || !values.vehicleType) {
    return "";
  }
  const offers = getOffersForType(season, values.vehicleType);
  if (!offers.length) {
    return getMessage("messages.contactForPricing");
  }
  const length = Number.parseFloat(values.vehicleLength);
  const numericLength = Number.isFinite(length) ? length : null;
  const needsLength = offers.some(offerRequiresLength);
  if (needsLength && !Number.isFinite(numericLength)) {
    return getMessage("messages.enterLength");
  }
  const matchedOffer = offers.find((offer) =>
    lengthMatchesRange(numericLength, offer.lengthRange),
  );
  const offer = matchedOffer || offers[offers.length - 1];
  const baseAmount = computeOfferPrice(offer, { length: numericLength });
  if (!Number.isFinite(baseAmount)) {
    return getMessage("messages.contactForPricing");
  }
  let total = baseAmount;
  if (values.battery === "yes") {
    total += getSeasonAddonPrice(values.season, "battery") || 0;
  }
  if (values.propane === "yes") {
    total += getSeasonAddonPrice(values.season, "propane") || 0;
  }
  return formatCurrency(total);
};

// "Add-on services" marketing copy is i18n HTML and may contain placeholders like:
//   <span data-service-price="battery"></span>
// Pricing is season-scoped, so we intentionally strip these placeholders from the
// marketing section to avoid showing the wrong price (or any price at all).
const populateServicePriceElements = (root) => {
  if (!root || !root.querySelectorAll) return;
  root.querySelectorAll("[data-service-price]").forEach((el) => {
    const parent = el.parentElement;
    el.remove();
    if (parent && parent.tagName === "STRONG" && !parent.textContent.trim()) {
      parent.remove();
    }
  });
};

const showI18nToast = (message) => {
  if (typeof document === "undefined") return;
  const existing = document.getElementById("i18n-edit-toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.id = "i18n-edit-toast";
  toast.className = "i18n-edit-toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => {
    toast.classList.add("visible");
  }, 10);
  window.setTimeout(() => {
    toast.classList.remove("visible");
    window.setTimeout(() => toast.remove(), 250);
  }, 1400);
};

const removeI18nEditAffordances = () => {
  if (typeof document === "undefined") return;
  document.querySelectorAll(".i18n-edit-button").forEach((button) => button.remove());
  document.querySelectorAll("[data-i18n-edit-attached], [data-i18n-edit-click-attached]").forEach((el) => {
    delete el.dataset.i18nEditAttached;
    delete el.dataset.i18nEditClickAttached;
  });
};

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    return false;
  }
};

const renderStagingModeToggle = () => {
  if (typeof document === "undefined" || !IS_STAGING_PAGE) return;
  const existing = document.getElementById("staging-preview-controls");
  if (existing) existing.remove();

  const controls = document.createElement("div");
  controls.id = "staging-preview-controls";
  controls.className = "staging-preview-controls";

  const refreshButton = document.createElement("button");
  refreshButton.id = "staging-refresh";
  refreshButton.type = "button";
  refreshButton.className = "staging-control-button";
  refreshButton.textContent = "Refresh";
  refreshButton.setAttribute("aria-label", "Refresh staging content from Tracker");
  refreshButton.addEventListener("click", async () => {
    if (!stagingRefreshHandler) return;
    refreshButton.disabled = true;
    refreshButton.textContent = "Refreshing";
    try {
      await stagingRefreshHandler();
      showI18nToast("Staging content refreshed.");
    } catch (err) {
      console.warn("Staging refresh failed", err);
      showI18nToast(err?.message || "Refresh failed.");
    } finally {
      refreshButton.disabled = false;
      refreshButton.textContent = "Refresh";
    }
  });

  const button = document.createElement("button");
  button.id = "staging-mode-toggle";
  button.type = "button";
  button.className = "staging-control-button";
  button.textContent = EDIT_I18N ? "View" : "Edit";
  button.setAttribute(
    "aria-label",
    EDIT_I18N ? "Switch staging preview to view mode" : "Switch staging preview to edit mode",
  );
  button.addEventListener("click", () => {
    EDIT_I18N = !EDIT_I18N;
    syncI18nEditRootState();
    const url = new URL(window.location.href);
    if (EDIT_I18N) url.searchParams.set("edit", "1");
    else url.searchParams.delete("edit");
    window.history.replaceState({}, "", url.toString());
    window.__ENTREPOT_STAGING_FLAGS__ = {
      ...(window.__ENTREPOT_STAGING_FLAGS__ || {}),
      edit: EDIT_I18N,
      search: window.location.search || "",
    };
    if (EDIT_I18N) {
      applyTranslationsForLanguage(currentLanguage);
    } else {
      removeI18nEditAffordances();
    }
    renderStagingModeToggle();
  });
  controls.appendChild(refreshButton);
  controls.appendChild(button);
  document.body.appendChild(controls);
};

const createPencilIcon = () => {
  // Some browsers and extensions can interfere with inline SVG rendering inside buttons.
  // Use plain text as the durable fallback, and let CSS render an icon if possible.
  const span = document.createElement("span");
  span.className = "i18n-edit-icon-fallback";
  span.textContent = "Edit";
  return span;
};

const getTrackerAdminBaseUrl = () => {
  if (typeof window === "undefined") return "";
  const host = window.location.hostname || "";
  const isLocal =
    host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (isLocal) {
    return "http://127.0.0.1:5002";
  }
  return "https://tracker-187c5.web.app";
};

const buildTrackerI18nEditUrl = (key) => {
  const base = getTrackerAdminBaseUrl();
  if (!base) return "";
  const url = new URL(base);
  url.searchParams.set("view", "pricing");
  url.searchParams.set("panel", "i18n");
  url.searchParams.set("editI18nKey", key);
  return url.toString();
};

const openTrackerAdminTab = (url) => {
  if (typeof window === "undefined") return null;
  if (!url) return null;
  // Use a named browsing context. Do not keep or mutate a Window reference:
  // Tracker runs on another origin, so direct navigation/focus access can raise
  // cross-origin errors in local staging.
  return window.open(url, "tracker_admin");
};

const attachI18nEditAffordance = (el, key) => {
  if (!el || !key) return;
  // For attribute translations, we do not attach buttons (not visible content).
  if (el.dataset.i18nAttr) return;

  // Make the translated block open Tracker only with a modifier key so we do not
  // break normal interactions (form steppers, buttons, links).
  if (!el.dataset.i18nEditClickAttached) {
    el.addEventListener("click", (evt) => {
      if (!EDIT_I18N) return;
      // Only when holding Alt/Option.
      if (!evt.altKey) return;
      // Ignore interactive elements.
      const target = evt.target;
      if (target && target.closest && target.closest("a,button,input,select,textarea,label")) {
        return;
      }
      evt.preventDefault();
      evt.stopPropagation();
      const url = buildTrackerI18nEditUrl(key);
      const opened = openTrackerAdminTab(url);
      if (!opened) {
        showI18nToast(`Open Tracker and search: ${key}`);
      }
    });
    el.dataset.i18nEditClickAttached = "true";
  }

  // Re-attach if translations re-render and wipe the button.
  if (el.querySelector(":scope > .i18n-edit-button")) {
    el.dataset.i18nEditAttached = "true";
    return;
  }

  // Keep the UI minimal and not disruptive: a small button appended inline.
  if (getComputedStyle(el).position === "static") {
    el.style.position = "relative";
  }
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "i18n-edit-button";
  btn.setAttribute("aria-label", `Edit in Tracker: ${key}`);
  btn.title = `Edit in Tracker: ${key}`;
  btn.appendChild(createPencilIcon());
  btn.addEventListener("click", async (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    const url = buildTrackerI18nEditUrl(key);
    const opened = openTrackerAdminTab(url);
    if (!opened) {
      // Popup blockers or missing base URL.
      showI18nToast(`Open Tracker and search: ${key}`);
    }
  });

  el.appendChild(btn);
  el.dataset.i18nEditAttached = "true";
};

const populateContractAddonPriceElements = () => {
  const form = document.getElementById("contract-helper");
  if (!form) return;
  const seasonSelect = form.querySelector('select[name="season"]');
  const seasonId = seasonSelect?.value?.trim() || "";

  document.querySelectorAll("[data-addon-price]").forEach((el) => {
    const code = el.dataset.addonPrice || "";
    const price = getSeasonAddonPrice(seasonId, code);
    if (!seasonId || price === null) {
      el.textContent = "";
      el.classList.add("hidden");
      return;
    }
    el.classList.remove("hidden");
    el.textContent = formatCurrency(price);
  });
};

const buildTenantPayload = (data) => {
  return {
    season: data.season || "",
    tenantName: data.tenantName || "",
    tenantPhone: data.tenantPhone || "",
    tenantAddress: data.tenantAddress || "",
    tenantCity: data.tenantCity || "",
    tenantProvince: data.tenantProvince || "",
    tenantPostal: data.tenantPostal || "",
    email: data.email || "",
    formLanguage: currentLanguage,
  };
};

const buildVehicleRequestPayload = (data) => {
  const vehicleType = data.vehicleType || "";
  return {
    season: data.season || "",
    vehicleType,
    vehicleTypeLabel: getVehicleLabelForLanguage(vehicleType),
    vehicleTypeOther: data.vehicleTypeOther || "",
    vehicleBrand: data.vehicleBrand || "",
    vehicleModel: data.vehicleModel || "",
    vehicleColour: data.vehicleColour || "",
    vehicleLength: data.vehicleLength || "",
    vehicleYear: data.vehicleYear || "",
    vehiclePlate: data.vehiclePlate || "",
    vehicleProv: data.vehicleProv || "",
    insuranceCompany: data.insuranceCompany || "",
    insurancePolicy: data.insurancePolicy || "",
    insuranceExpiration: data.insuranceExpiration || "",
    battery: data.battery === "yes",
    propane: data.propane === "yes",
    estimatedCost: parseCurrencyValue(data.leaseCost),
    deposit: parseCurrencyValue(data.deposit),
  };
};

const formatOfferPriceDisplay = (offer, lang = currentLanguage) => {
  if (!offer || !offer.price) return "";
  if (offer.price.mode === "flat") {
    return formatCurrency(offer.price.amount, lang);
  }
  if (offer.price.mode === "perFoot") {
    const rate = formatCurrency(offer.price.rate, lang, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const unit =
      getLocalizedText(offer.price.unit, lang) || (lang === "fr" ? "/ pi" : "/ ft");
    return `${rate} ${unit}`;
  }
  return getMessage("messages.contactForPricing", lang);
};

const formatOfferNote = (offer, lang = currentLanguage) => {
  if (!offer || !offer.note) return "";
  const template = getLocalizedText(offer.note, lang);
  if (!template) return "";
  const replacements = {};
  if (template.includes("{{amount}}") || template.includes("{amount}")) {
    const minimum = offer.price?.minimum;
    replacements.amount = minimum ? formatCurrency(minimum, lang) : "";
  }
  return formatTemplate(template, replacements);
};


const seasonGridEl = document.getElementById("season-grid");
const contractDownloadLink = document.querySelector("[data-contract-download]");

const getContractTemplateUrl = (lang = currentLanguage) => {
  return CONTRACT_TEMPLATES[lang] || CONTRACT_TEMPLATES[DEFAULT_LANGUAGE];
};

const buildSeasonCards = () => {
  if (!seasonGridEl) return;
  seasonGridEl.innerHTML = "";

  getAllSeasonCards().forEach((season) => {
    const card = document.createElement("article");
    card.className = "season-card";
    if (season.id === "shared") {
      card.classList.add("season-card--full");
    }
    const heading = document.createElement("div");
    const description = season.description
      ? `<p>${getLocalizedText(season.description)}</p>`
      : "";
    const timeframe = season.timeframe
      ? `<p><strong>${getLocalizedText(season.timeframe)}</strong></p>`
      : "";
    heading.innerHTML = `
            <p class="eyebrow">${getLocalizedText(season.seasonLabel)}</p>
            <h3>${getLocalizedText(season.name)}</h3>
            ${description}
            ${timeframe}
        `;

    let table = null;
    if (season.offers && season.offers.length) {
      const visibleOffers = season.offers.filter((offer) => !offer.hideInTable);
      if (visibleOffers.length) {
        table = document.createElement("table");
        visibleOffers.forEach((offer) => {
          const row = document.createElement("tr");
          const label = document.createElement("td");
          const note = formatOfferNote(offer);
          if (note) {
            const trimmed = String(note).trim();
            const alreadyWrapped =
              trimmed.length >= 2 && trimmed.startsWith("(") && trimmed.endsWith(")");
            label.textContent = alreadyWrapped
              ? `${getLocalizedText(offer.label)} ${trimmed}`
              : `${getLocalizedText(offer.label)} (${trimmed})`;
          } else {
            label.textContent = getLocalizedText(offer.label);
          }
          const price = document.createElement("td");
          price.textContent = formatOfferPriceDisplay(offer);
          row.appendChild(label);
          row.appendChild(price);
          table.appendChild(row);
        });
      }
    }

    card.appendChild(heading);
    if (table) {
      card.appendChild(table);
    }
    const list = document.createElement("ul");
    (season.policies || []).forEach((policy) => {
      const { text, tooltip } = resolvePolicyEntry(policy);
      if (!text) return;
      const li = document.createElement("li");
      li.textContent = text;
      if (tooltip) {
        const info = document.createElement("span");
        info.className = "info-badge";
        info.tabIndex = 0;
        info.setAttribute("role", "button");
        info.setAttribute(
          "aria-label",
          getTranslation("policies.tooltipLabel"),
        );
        info.dataset.tooltip = tooltip;
        info.textContent = "?";
        li.appendChild(info);
      }
      list.appendChild(li);
    });
    card.appendChild(list);
    if (season.id === "shared") {
      const etiquetteSection = document.createElement("div");
      etiquetteSection.className = "season-card__etiquette";
      const etiquetteHeading = document.createElement("h3");
      etiquetteHeading.textContent = getTranslation("etiquette.heading");
      const etiquetteIntro = document.createElement("p");
      etiquetteIntro.textContent = getTranslation("etiquette.intro");
      const etiquetteList = document.createElement("ul");
      STORAGE_ETIQUETTE.forEach((entry) => {
        const text = entry.text
          ? getLocalizedText(entry.text)
          : entry.translationKey
            ? getTranslation(entry.translationKey)
            : "";
        if (!text) return;
        const li = document.createElement("li");
        const textSpan = document.createElement("span");
        textSpan.textContent = text;
        li.appendChild(textSpan);
        const tooltipText = entry.tooltip
          ? getLocalizedText(entry.tooltip)
          : entry.tooltipKey
            ? getTranslation(entry.tooltipKey)
            : "";
        if (tooltipText) {
          const info = document.createElement("span");
          info.className = "info-badge";
          info.tabIndex = 0;
          info.setAttribute("role", "button");
          info.setAttribute(
            "aria-label",
            getTranslation("etiquette.tooltipLabel"),
          );
          info.dataset.tooltip = tooltipText;
          info.textContent = "?";
          li.appendChild(info);
        }
        etiquetteList.appendChild(li);
      });
      etiquetteSection.appendChild(etiquetteHeading);
      etiquetteSection.appendChild(etiquetteIntro);
      etiquetteSection.appendChild(etiquetteList);
      card.appendChild(etiquetteSection);
    }
    seasonGridEl.appendChild(card);
  });
};

const initFormStepper = () => {
  const form = document.getElementById("contract-helper");
  if (!form) return;

  const steps = Array.from(form.querySelectorAll(".form-step"));
  const navButtons = Array.from(form.querySelectorAll("[data-step-target]"));
  const nextBtn = form.querySelector("[data-step-next]");
  const prevBtn = form.querySelector("[data-step-prev]");

  let currentStep = 0;

  const validateStepsBefore = (targetIndex) => {
    if (targetIndex <= 0) {
      return { valid: true };
    }
    for (let stepIndex = 0; stepIndex < targetIndex; stepIndex += 1) {
      const stepEl = steps[stepIndex];
      if (!stepEl) continue;
      const fields = Array.from(
        stepEl.querySelectorAll("input, select, textarea"),
      ).filter((field) => field.type !== "hidden" && !field.closest(".hidden"));
      for (const field of fields) {
        if (!field.checkValidity()) {
          field.reportValidity();
          return { valid: false, invalidStep: stepIndex };
        }
      }
    }
    return { valid: true };
  };

  const gotoStep = (index) => {
    if (index < 0 || index >= steps.length) return;
    steps.forEach((step, idx) => {
      step.classList.toggle("active", idx === index);
    });
    const requestRecaptchaContainer = steps[index]?.querySelector(
      "[data-request-recaptcha-container]",
    );
    if (
      requestRecaptchaContainer &&
      !isRecaptchaWidgetReady(requestRecaptchaContainer)
    ) {
      requestRecaptchaContainer.innerHTML = "";
      resetRecaptchaWidgetState(requestRecaptchaContainer);
      window.setTimeout(
        () => setupRecaptchaWidget(requestRecaptchaContainer),
        0,
      );
    }
    navButtons.forEach((btn) => {
      btn.classList.toggle(
        "active",
        Number(btn.dataset.stepTarget) - 1 === index,
      );
    });
    currentStep = index;
    const isFirst = currentStep === 0;
    const isLast = currentStep === steps.length - 1;
    if (prevBtn) {
      prevBtn.classList.toggle("hidden", isFirst);
      prevBtn.disabled = isFirst;
    }
    if (nextBtn) {
      nextBtn.classList.toggle("hidden", isLast);
      nextBtn.disabled = isLast;
    }
  };

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const targetIndex = currentStep + 1;
      const validation = validateStepsBefore(targetIndex);
      if (!validation.valid) {
        gotoStep(validation.invalidStep);
        return;
      }
      gotoStep(targetIndex);
    });
  }
  if (prevBtn) {
    prevBtn.addEventListener("click", () => gotoStep(currentStep - 1));
  }
  navButtons.forEach((btn) =>
    btn.addEventListener("click", () => {
      const targetIndex = Number(btn.dataset.stepTarget) - 1;
      const validation = validateStepsBefore(targetIndex);
      if (!validation.valid) {
        gotoStep(validation.invalidStep);
        return;
      }
      gotoStep(targetIndex);
    }),
  );

  gotoStep(0);

  const seasonSelect = form.querySelector('select[name="season"]');
  const leaseDurationInput = form.querySelector('input[name="leaseDuration"]');
  const leaseCostInput = form.querySelector('input[name="leaseCost"]');
  const vehicleLengthInput = form.querySelector('input[name="vehicleLength"]');
  const vehicleTypeOtherInput = form.querySelector(
    'input[name="vehicleTypeOther"]',
  );
  const tenantPhoneInput = form.querySelector('input[name="tenantPhone"]');
  const depositInput = form.querySelector('input[name="deposit"]');
  const vehicleTypeSelect = document.getElementById("vehicle-type-select");
  const insuranceExpirationInput = form.querySelector(
    'input[name="insuranceExpiration"]',
  );
  const insuranceExpirationWarning = form.querySelector(
    "[data-insurance-warning]",
  );
  const propaneCheckbox = form.querySelector('input[name="propane"]');
  const contactForm = document.getElementById("contact-form");
  const contactNameInput = contactForm?.elements?.name || null;
  const contactEmailInput = contactForm?.elements?.email || null;
  const contactSeasonSelect = contactForm?.elements?.season || null;
  const contactVehicleInput = contactForm?.elements?.vehicle || null;

  const setContactPrefillValue = (input, value) => {
    if (!input) return;
    const nextValue = typeof value === "string" ? value.trim() : "";
    if (!nextValue) return;
    const previousPrefill = input.dataset.prefillValue || "";
    if (!input.value || input.value === previousPrefill) {
      input.value = nextValue;
    }
    input.dataset.prefillValue = nextValue;
  };

  const getContactVehicleDisplay = () => {
    if (!vehicleTypeSelect) return "";
    const selectedValue = vehicleTypeSelect.value;
    if (!selectedValue) return "";
    if (isOtherVehicleType(selectedValue)) {
      return vehicleTypeOtherInput?.value?.trim() || "";
    }
    return getVehicleLabelForLanguage(selectedValue);
  };

  const updateContactPrefillFromContract = () => {
    if (!contactForm) return;
    const tenantNameValue = form.elements.tenantName?.value?.trim();
    const tenantEmailValue = form.elements.email?.value?.trim();
    const seasonValue = seasonSelect?.value?.trim() || "";
    const vehicleValue = vehicleTypeSelect?.value?.trim() || "";
    const vehicleDisplay = getContactVehicleDisplay();
    setContactPrefillValue(contactNameInput, tenantNameValue);
    setContactPrefillValue(contactEmailInput, tenantEmailValue);
    setContactPrefillValue(contactSeasonSelect, seasonValue);
    if (contactVehicleInput?.tagName === "SELECT") {
      setContactPrefillValue(contactVehicleInput, vehicleValue);
    } else {
      setContactPrefillValue(contactVehicleInput, vehicleDisplay);
    }
  };

  let isApplyingFormMemory = false;
  const loadFormMemory = (type = vehicleTypeSelect?.value) => {
    const storageKey = getVehicleStorageKey(type);
    if (!storageKey) return {};
    if (typeof window === "undefined" || !window.localStorage) return {};
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (err) {
      return {};
    }
  };
  const saveFormMemory = () => {
    if (isApplyingFormMemory) return;
    if (typeof window === "undefined" || !window.localStorage) return;
    const storageKey = getVehicleStorageKey(vehicleTypeSelect?.value);
    if (!storageKey) return;
    const data = new FormData(form);
    const payload = {};
    CONTRACT_FORM_MEMORY_FIELDS.forEach((name) => {
      const value = data.get(name);
      if (value) {
        payload[name] = value;
      }
    });
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (err) {}
  };
  const applyFormMemory = (type = vehicleTypeSelect?.value) => {
    const stored = loadFormMemory(type);
    const entries = Object.entries(stored || {});
    if (!entries.length) return;
    isApplyingFormMemory = true;
    entries.forEach(([name, value]) => {
      if (CONTRACT_FORM_IGNORED_MEMORY_FIELDS.has(name)) return;
      const field = form.elements[name];
      if (!field) return;
      if (field.type === "checkbox") {
        field.checked = value === "yes";
      } else {
        field.value = value;
      }
    });
    isApplyingFormMemory = false;
    if (vehicleTypeSelect && vehicleTypeOther) {
      const isOther = isOtherVehicleType(vehicleTypeSelect.value);
      vehicleTypeOther.classList.toggle("hidden", !isOther);
      const input = vehicleTypeOther.querySelector("input");
      if (input) {
        input.required = isOther;
      }
    }
  };

  const populateSeasonSelect = () => {
    populateSeasonOptionsForSelect(seasonSelect);
  };

  const populateVehicleTypeOptions = () => {
    populateVehicleOptionsForSelect(vehicleTypeSelect);
  };

  const applyDepositRule = (estimatedValue) => {
    if (!depositInput) return;
    const amount = parseCurrencyValue(estimatedValue);
    if (amount === null) return;
    const depositValue = amount > 250 ? 100 : 50;
    const currentValue = Number(depositInput.value);
    if (!Number.isFinite(currentValue) || currentValue !== depositValue) {
      depositInput.value = depositValue;
    }
  };

  const updateInsuranceExpirationWarning = () => {
    if (!insuranceExpirationWarning) return;
    insuranceExpirationWarning.hidden = true;
    if (!seasonSelect || !insuranceExpirationInput) return;
    const seasonData = SEASON_LOOKUP[seasonSelect.value];
    const expirationValue = insuranceExpirationInput.value;
    if (!seasonData || !expirationValue) return;
    const pickupDate = getSeasonPickupDate(seasonData);
    if (!pickupDate) return;
    const cutoffDate = new Date(pickupDate.getTime());
    cutoffDate.setDate(cutoffDate.getDate() + INSURANCE_BUFFER_DAYS);
    const expirationDate = new Date(expirationValue);
    if (Number.isNaN(expirationDate.getTime())) return;
    if (expirationDate < cutoffDate) {
      insuranceExpirationWarning.hidden = false;
    }
  };

  const updateLeaseDuration = () => {
    if (!seasonSelect || !leaseDurationInput) return;
    const seasonInfo = SEASON_LOOKUP[seasonSelect.value];
    leaseDurationInput.value = seasonInfo
      ? getLocalizedText(seasonInfo.duration)
      : "";
  };
  const updateEstimatedCost = () => {
    if (!leaseCostInput) return;
    const formValues = Object.fromEntries(new FormData(form).entries());
    const estimate = estimateRentalCost(formValues);
    leaseCostInput.value = estimate;
    const numericEstimate = parseCurrencyValue(estimate);
    if (numericEstimate === null) {
      leaseCostInput.value = "";
    }
    applyDepositRule(estimate);
  };
  if (seasonSelect) {
    seasonSelect.addEventListener("change", () => {
      updateLeaseDuration();
      updateEstimatedCost();
      updateInsuranceExpirationWarning();
      populateContractAddonPriceElements();
    });
    updateInsuranceExpirationWarning();
    populateContractAddonPriceElements();
  }

  if (insuranceExpirationInput) {
    ["change", "input"].forEach((eventName) => {
      insuranceExpirationInput.addEventListener(
        eventName,
        updateInsuranceExpirationWarning,
      );
    });
  }

  const vehicleTypeOther = document.getElementById("vehicle-type-other");
  const updateLengthRequirement = () => {
    if (!vehicleLengthInput || !vehicleTypeSelect) return;
    const requiresLength = requiresLengthForType(vehicleTypeSelect.value);
    vehicleLengthInput.required = Boolean(requiresLength);
  };
  const updatePropaneAvailability = () => {
    if (!propaneCheckbox || !vehicleTypeSelect) return;
    const isRv = getVehicleTypeSlug(vehicleTypeSelect.value) === "rv-motorhome";
    propaneCheckbox.disabled = !isRv;
    const label = propaneCheckbox.closest("label");
    if (label) {
      label.classList.toggle("disabled", !isRv);
    }
    if (!isRv && propaneCheckbox.checked) {
      propaneCheckbox.checked = false;
      updateEstimatedCost();
      saveFormMemory();
    }
  };
  if (vehicleTypeSelect && vehicleTypeOther) {
    const toggleOther = () => {
      const isOther = isOtherVehicleType(vehicleTypeSelect.value);
      vehicleTypeOther.classList.toggle("hidden", !isOther);
      const input = vehicleTypeOther.querySelector("input");
      if (input) {
        input.required = isOther;
      }
      updateEstimatedCost();
      updateLengthRequirement();
      updatePropaneAvailability();
      updateContactPrefillFromContract();
    };
    vehicleTypeSelect.addEventListener("change", toggleOther);
    toggleOther();
  }

  const serviceCheckboxes = [
    form.querySelector('input[name="battery"]'),
    propaneCheckbox,
  ];

  [vehicleLengthInput, vehicleTypeOtherInput, ...serviceCheckboxes].forEach(
    (el) => {
      if (!el) return;
      el.addEventListener("input", updateEstimatedCost);
      el.addEventListener("change", updateEstimatedCost);
    },
  );

  ["tenantName", "email"].forEach((fieldName) => {
    const field = form.elements[fieldName];
    if (!field) return;
    ["input", "change"].forEach((eventName) => {
      field.addEventListener(eventName, updateContactPrefillFromContract);
    });
  });
  if (vehicleTypeOtherInput) {
    ["input", "change"].forEach((eventName) => {
      vehicleTypeOtherInput.addEventListener(
        eventName,
        updateContactPrefillFromContract,
      );
    });
  }

  if (vehicleTypeSelect) {
    vehicleTypeSelect.addEventListener("change", () => {
      applyFormMemory(vehicleTypeSelect.value);
      updateLengthRequirement();
      updatePropaneAvailability();
      updateEstimatedCost();
      updateContactPrefillFromContract();
      saveFormMemory();
    });
    updateLengthRequirement();
    updatePropaneAvailability();
  }

  const resetVehicleButton = form.querySelector("[data-reset-vehicle]");
  const clearVehicleMemory = () => {
    const currentType = vehicleTypeSelect?.value;
    const storageKey = getVehicleStorageKey(currentType);
    if (storageKey && window.localStorage) {
      try {
        window.localStorage.removeItem(storageKey);
      } catch (err) {}
    }
    isApplyingFormMemory = true;
    CONTRACT_FORM_MEMORY_FIELDS.forEach((name) => {
      if (name === "vehicleType") return;
      const field = form.elements[name];
      if (!field) return;
      if (field.type === "checkbox") {
        field.checked = false;
      } else {
        field.value = "";
      }
    });
    isApplyingFormMemory = false;
    if (vehicleTypeOther) {
      const isOther = isOtherVehicleType(vehicleTypeSelect?.value);
      vehicleTypeOther.classList.toggle("hidden", !isOther);
    }
    updateLengthRequirement();
    updatePropaneAvailability();
    updateEstimatedCost();
    updateContactPrefillFromContract();
  };
  if (resetVehicleButton) {
    resetVehicleButton.addEventListener("click", () => {
      clearVehicleMemory();
    });
  }

  if (tenantPhoneInput) {
    const enforcePhoneFormat = () => {
      const formatted = formatPhoneNumber(tenantPhoneInput.value);
      if (formatted && formatted !== tenantPhoneInput.value) {
        tenantPhoneInput.value = formatted;
      }
    };
    tenantPhoneInput.addEventListener("blur", enforcePhoneFormat);
    enforcePhoneFormat();
  }

  CONTRACT_FORM_MEMORY_FIELDS.forEach((name) => {
    const field = form.elements[name];
    if (!field) return;
    const handler = () => saveFormMemory();
    field.addEventListener("change", handler);
    if (field.tagName === "INPUT" && field.type !== "checkbox") {
      field.addEventListener("input", handler);
    }
  });

  populateSeasonSelect();
  populateVehicleTypeOptions();
  applyFormMemory();
  updateLengthRequirement();
  updatePropaneAvailability();
  updateLeaseDuration();
  updateEstimatedCost();
  updateInsuranceExpirationWarning();
  updateContactPrefillFromContract();

  collectContractVehiclePayload = () => {
    const formEntries = new FormData(form);
    const data = Object.fromEntries(formEntries.entries());
    return buildVehicleRequestPayload(data);
  };

  resetContractVehicleFields = () => {
    const resetFields = [
      "vehicleType",
      "vehicleTypeOther",
      "vehicleBrand",
      "vehicleModel",
      "vehicleColour",
      "vehicleLength",
      "vehicleYear",
      "vehiclePlate",
      "vehicleProv",
      "insuranceCompany",
      "insurancePolicy",
      "insuranceExpiration",
    ];
    resetFields.forEach((name) => {
      const field = form.elements[name];
      if (!field) return;
      field.value = "";
    });
    const batteryField = form.elements.battery;
    if (batteryField && batteryField.type === "checkbox") {
      batteryField.checked = false;
    }
    if (propaneCheckbox) {
      propaneCheckbox.checked = false;
    }
    if (vehicleTypeOther) {
      vehicleTypeOther.classList.add("hidden");
      const input = vehicleTypeOther.querySelector("input");
      if (input) {
        input.required = false;
      }
    }
    updateLengthRequirement();
    updatePropaneAvailability();
    updateEstimatedCost();
    updateInsuranceExpirationWarning();
  };

  refreshContractEstimate = () => {
    updateLengthRequirement();
    updatePropaneAvailability();
    updateEstimatedCost();
    updateInsuranceExpirationWarning();
  };

  syncContractHelperLanguage = () => {
    populateSeasonSelect();
    populateVehicleTypeOptions();
    applyFormMemory();
    updateLengthRequirement();
    updatePropaneAvailability();
    updateLeaseDuration();
    updateEstimatedCost();
    updateInsuranceExpirationWarning();
    updateContactPrefillFromContract();
  };
};

const populateServicePrices = () => {};

const updateContractDownloadLink = () => {
  if (!contractDownloadLink) return;
  const url = getContractTemplateUrl();
  contractDownloadLink.href = url;
  const filename = url.split("/").pop();
  if (filename) {
    contractDownloadLink.download = filename;
  }
};

const serializeFileAttachments = async (fileList) => {
  if (!fileList || !fileList.length) return [];
  const files = Array.isArray(fileList) ? fileList : Array.from(fileList);
  const encodeFile = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : "";
        const [, base64 = ""] = result.split(",");
        resolve({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          content: base64,
        });
      };
      reader.onerror = () =>
        reject(reader.error || new Error(`Failed to read file: ${file.name}`));
      reader.readAsDataURL(file);
    });
  return Promise.all(files.map(encodeFile));
};

const updateContactEmails = () => {
  const email = getContactEmail();
  if (!email) return;
  const anchors = document.querySelectorAll("[data-contact-email]");
  anchors.forEach((anchor) => {
    anchor.href = `mailto:${email}`;
    anchor.textContent = email;
  });
};

const handleContactForm = () => {
  const form = document.getElementById("contact-form");
  if (!form) {
    attachContractPdfToContactForm = null;
    return;
  }

  const attachmentInput = form.querySelector('input[name="attachments"]');
  const attachmentTrigger = form.querySelector("[data-attachment-trigger]");
  const attachmentList = form.querySelector("[data-attachment-list]");
  const submitButton = form.querySelector('button[type="submit"]');
  const statusEl = form.querySelector("[data-contact-status]");
  const recaptchaContainer = form.querySelector("[data-recaptcha-container]");
  const contactSeasonSelect = form.querySelector("[data-contact-season-select]");
  const contactVehicleSelect = form.querySelector("[data-contact-vehicle-select]");

  populateSeasonOptionsForSelect(contactSeasonSelect);
  populateVehicleOptionsForSelect(contactVehicleSelect);
  syncContactFormLanguage = () => {
    populateSeasonOptionsForSelect(contactSeasonSelect);
    populateVehicleOptionsForSelect(contactVehicleSelect);
  };

  let attachmentFiles = [];

  const updateAttachmentList = () => {
    if (!attachmentList) return;
    attachmentList.innerHTML = "";
    if (!attachmentFiles.length) {
      attachmentList.hidden = true;
      return;
    }
    attachmentFiles.forEach((file, index) => {
      const li = document.createElement("li");
      li.classList.add("file-upload__item");

      const nameSpan = document.createElement("span");
      nameSpan.textContent = file.name;
      li.appendChild(nameSpan);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "file-upload__remove";
      removeBtn.dataset.attachmentRemove = index;
      removeBtn.setAttribute("aria-label", `Remove ${file.name}`);
      removeBtn.innerHTML = "&times;";
      li.appendChild(removeBtn);

      attachmentList.appendChild(li);
    });
    attachmentList.hidden = false;
  };

  const addAttachments = (files) => {
    const list = Array.isArray(files) ? files : [files];
    const validFiles = list.filter((file) => file instanceof File);
    if (!validFiles.length) return false;
    attachmentFiles = attachmentFiles.concat(validFiles);
    updateAttachmentList();
    return true;
  };

  const setContactStatus = (message, type = "info") => {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.dataset.status = type;
    statusEl.hidden = !message;
  };

  const updateContactSubmitState = () => {
    if (!submitButton) return;
    submitButton.disabled =
      isRecaptchaConfigured() && !getRecaptchaToken(recaptchaContainer);
  };

  configureRecaptchaWidget(recaptchaContainer, {
    onChange: updateContactSubmitState,
    onExpired: updateContactSubmitState,
  });
  updateContactSubmitState();

  const removeAttachmentAt = (index) => {
    const idx = Number(index);
    if (Number.isNaN(idx) || idx < 0 || idx >= attachmentFiles.length) return;
    attachmentFiles.splice(idx, 1);
    updateAttachmentList();
  };

  if (attachmentTrigger && attachmentInput) {
    attachmentTrigger.addEventListener("click", () => attachmentInput.click());
  }
  if (attachmentInput) {
    attachmentInput.addEventListener("change", () => {
      if (!attachmentInput.files?.length) return;
      addAttachments([...attachmentInput.files]);
      attachmentInput.value = "";
    });
  }
  if (attachmentList) {
    attachmentList.addEventListener("click", (event) => {
      const target = event.target.closest("[data-attachment-remove]");
      if (!target) return;
      removeAttachmentAt(target.dataset.attachmentRemove);
    });
  }

  attachContractPdfToContactForm = (file) => {
    if (!file) return false;
    let normalized = null;
    if (file instanceof File) {
      normalized = file;
    } else if (file instanceof Blob) {
      normalized = new File(
        [file],
        `contract-${Date.now()}.pdf`,
        { type: file.type || "application/pdf" },
      );
    }
    if (!normalized) return false;
    const added = addAttachments([normalized]);
    if (added) {
      setContactStatus(
        getTranslation("contactForm.status.attachmentAdded"),
        "info",
      );
      document.getElementById("contact-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
    return added;
  };

  setupRecaptchaWidget(recaptchaContainer);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const nameInput = (data.get("name") || "").trim();
    const email = (data.get("email") || "").trim();
    const seasonInput = (data.get("season") || "").trim();
    const vehicleInput = (data.get("vehicle") || "").trim();
    const message = (data.get("message") || "").trim();
    const readableName =
      nameInput || getTranslation("contactForm.inquiryFallback");
    const vehicleDisplay = getVehicleLabelForLanguage(vehicleInput);
    const seasonDisplay =
      getSeasonLabelForLanguage(seasonInput) ||
      getTranslation("contactForm.seasonFallback");

    const subjectTemplate = getTranslation("contactForm.subject");
    const fallbackSubject = encodeURIComponent(
      formatTemplate(subjectTemplate, {
        vehicle: vehicleDisplay,
        season: seasonDisplay,
      }),
    );
    const bodyLines = [
      `${getTranslation("contactForm.bodyName")}: ${readableName}`,
      `${getTranslation("contactForm.bodyEmail")}: ${email}`,
      `${getTranslation("contactForm.bodyVehicle")}: ${vehicleDisplay}`,
      `${getTranslation("contactForm.bodySeason")}: ${seasonDisplay}`,
    ];
    const attachmentNames = attachmentFiles.map((file) => file.name);
    if (attachmentNames.length) {
      bodyLines.push(
        `${getTranslation("contactForm.attachments.note")}: ${attachmentNames.join(", ")}`,
      );
    }
    bodyLines.push("", message);
    const bodyText = bodyLines.join("\n");
    const fallbackBody = encodeURIComponent(bodyText);
    const fallbackSend = () => {
      window.location.href = `mailto:${getContactEmail()}?subject=${fallbackSubject}&body=${fallbackBody}`;
    };
    console.debug("[contact] submit captured", {
      readableName,
      vehicleDisplay,
      attachmentCount: attachmentFiles.length,
    });

    let recaptchaToken = "";
    if (isRecaptchaConfigured()) {
      console.debug("[contact] reCAPTCHA enabled, checking widget readiness");
      if (!isRecaptchaWidgetReady(recaptchaContainer)) {
        console.warn("[contact] reCAPTCHA widget not ready");
        setContactStatus(
          getTranslation("contactForm.captcha.unavailable"),
          "error",
        );
        return;
      }
      recaptchaToken = getRecaptchaToken(recaptchaContainer);
      if (!recaptchaToken) {
        console.warn("[contact] reCAPTCHA token missing");
        setContactStatus(getTranslation("contactForm.captcha.error"), "error");
        return;
      }
      console.debug("[contact] reCAPTCHA token acquired", {
        tokenLength: recaptchaToken.length,
      });
    } else {
      console.debug("[contact] reCAPTCHA not configured; continuing without token");
    }

    if (submitButton) submitButton.disabled = true;
    setContactStatus(getTranslation("contactForm.status.sending"), "info");

    try {
      const attachmentsPayload =
        attachmentFiles.length > 0
          ? await serializeFileAttachments(attachmentFiles)
          : [];
      if (!sendEmailCallable) {
        throw new Error("sendEmail callable unavailable");
      }
      const payload = {
        to: getContactEmail(),
        from: getContactFromAddress(),
        replyTo: email || CONTACT_EMAILS.default,
        subject: formatTemplate(subjectTemplate, {
          vehicle: vehicleDisplay,
          season: seasonDisplay,
        }),
        text: bodyText,
        attachments: attachmentsPayload,
      };
      if (recaptchaToken) {
        payload.captchaToken = recaptchaToken;
      }
      console.debug("[contact] invoking sendEmail", {
        to: payload.to,
        from: payload.from,
        includeCaptcha: Boolean(recaptchaToken),
      });
      await sendEmailCallable(payload);
      setContactStatus(getTranslation("contactForm.status.success"), "success");
      form.reset();
      attachmentFiles = [];
      updateAttachmentList();
    } catch (err) {
      console.error("Contact form send failed", err);
      setContactStatus(getTranslation("contactForm.status.error"), "error");
      if (DISABLE_MAILTO_FALLBACK) {
        console.warn(
          "[contact] Mailto fallback suppressed for debugging; compose email manually if needed.",
        );
      } else {
        fallbackSend();
      }
    } finally {
      resetRecaptchaWidget(recaptchaContainer);
      if (submitButton) {
        submitButton.disabled = false;
        updateContactSubmitState();
      }
    }
  });
};

const handleContractHelper = () => {
  const form = document.getElementById("contract-helper");
  if (!form) return;

  const submitButton = form.querySelector('button[type="submit"]');
  const statusEl = form.querySelector("[data-contract-status]");
  const addVehicleButton = form.querySelector("[data-add-vehicle]");
  const resetRequestButton = form.querySelector("[data-request-reset]");
  const requestList = form.querySelector("[data-request-vehicle-list]");
  const requestEmpty = form.querySelector("[data-request-empty]");
  const requestCount = form.querySelector("[data-request-count]");
  const recaptchaContainer = form.querySelector("[data-request-recaptcha-container]");
  let queuedRequests = [];
  let hasSubmitted = false;

  const updateRequestSubmitState = () => {
    if (!submitButton || hasSubmitted) return;
    submitButton.disabled =
      isRecaptchaConfigured() && !getRecaptchaToken(recaptchaContainer);
  };

  configureRecaptchaWidget(recaptchaContainer, {
    onChange: updateRequestSubmitState,
    onExpired: updateRequestSubmitState,
  });
  updateRequestSubmitState();

  const setContractStatus = (message, type = "info") => {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.dataset.status = type;
    statusEl.hidden = !message;
  };

  const formatVehicleSummary = (payload) => {
    if (!payload) return "";
    const parts = [];
    const typeLabel = payload.vehicleTypeLabel || payload.vehicleType || "";
    if (typeLabel) parts.push(typeLabel);
    if (payload.vehicleLength) {
      const unit = currentLanguage === "fr" ? "pi" : "ft";
      parts.push(`${payload.vehicleLength} ${unit}`);
    }
    if (payload.vehiclePlate) {
      const provinceSuffix = payload.vehicleProv ? ` (${payload.vehicleProv})` : "";
      parts.push(`${payload.vehiclePlate}${provinceSuffix}`);
    } else if (payload.vehicleProv) {
      parts.push(payload.vehicleProv);
    }
    const addons = [];
    if (payload.battery) addons.push(getTranslation("form.service.battery"));
    if (payload.propane) addons.push(getTranslation("form.service.propane"));
    if (addons.length) {
      parts.push(addons.join(" + "));
    }
    return parts.filter(Boolean).join(" • ");
  };

  const renderQueue = () => {
    if (!requestList) return;
    requestList.innerHTML = "";
    queuedRequests.forEach((request, index) => {
      const item = document.createElement("li");
      item.className = "request-queue__item";
      const summary = document.createElement("span");
      summary.textContent = formatVehicleSummary(request);
      item.appendChild(summary);
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "request-queue__remove";
      removeButton.dataset.requestRemove = String(index);
      removeButton.textContent = getTranslation("form.queue.remove");
      item.appendChild(removeButton);
      requestList.appendChild(item);
    });
    if (requestEmpty) {
      requestEmpty.hidden = queuedRequests.length > 0;
    }
    if (requestCount) {
      requestCount.textContent = queuedRequests.length
        ? `(${queuedRequests.length})`
        : "";
    }
  };

  const addCurrentVehicleToQueue = () => {
    const payload =
      typeof collectContractVehiclePayload === "function"
        ? collectContractVehiclePayload()
        : null;
    if (!payload || !payload.vehicleType) {
      setContractStatus(getTranslation("form.queue.missingVehicle"), "error");
      return;
    }
    queuedRequests.push(payload);
    if (typeof resetContractVehicleFields === "function") {
      resetContractVehicleFields();
    }
    renderQueue();
    setContractStatus(getTranslation("form.queue.added"), "success");
  };

  if (addVehicleButton) {
    addVehicleButton.addEventListener("click", () => {
      if (hasSubmitted) return;
      addCurrentVehicleToQueue();
    });
  }

  if (requestList) {
    requestList.addEventListener("click", (event) => {
      const target = event.target.closest("[data-request-remove]");
      if (!target) return;
      const index = Number(target.dataset.requestRemove);
      if (Number.isNaN(index)) return;
      queuedRequests.splice(index, 1);
      renderQueue();
    });
  }

  if (resetRequestButton) {
    resetRequestButton.addEventListener("click", () => {
      queuedRequests = [];
      hasSubmitted = false;
      form.reset();
      setContractStatus("", "info");
      if (submitButton) {
        submitButton.disabled = false;
        updateRequestSubmitState();
      }
      if (addVehicleButton) {
        addVehicleButton.disabled = false;
      }
      resetRequestButton.classList.add("hidden");
      if (typeof syncContractHelperLanguage === "function") {
        syncContractHelperLanguage();
      }
      renderQueue();
    });
  }

  renderQueue();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formEntries = new FormData(form);
    formEntries.set("formLanguage", currentLanguage);
    const formData = Object.fromEntries(formEntries.entries());
    if (hasSubmitted) {
      return;
    }
    if (!createStorageRequestsCallable && !createStorageRequestCallable) {
      setContractStatus(getTranslation("form.requestStatus.unavailable"), "error");
      return;
    }

    const tenantPayload = buildTenantPayload(formData);
    tenantPayload.seasonLabel = getSeasonLabelForLanguage(tenantPayload.season);
    const currentRequest = buildVehicleRequestPayload(formData);
    const requests = queuedRequests.slice();
    if (currentRequest.vehicleType) {
      requests.push(currentRequest);
    }
    if (!requests.length) {
      setContractStatus(getTranslation("form.queue.missingVehicle"), "error");
      return;
    }

    const payload = {
      tenant: tenantPayload,
      requests: requests.map((request) => ({
        ...request,
        season: tenantPayload.season,
        seasonLabel: tenantPayload.seasonLabel || request.seasonLabel || "",
      })),
    };

    let recaptchaToken = "";
    if (isRecaptchaConfigured()) {
      if (!isRecaptchaWidgetReady(recaptchaContainer)) {
        setContractStatus(getTranslation("form.captcha.unavailable"), "error");
        return;
      }
      recaptchaToken = getRecaptchaToken(recaptchaContainer);
      if (!recaptchaToken) {
        setContractStatus(getTranslation("form.captcha.error"), "error");
        return;
      }
      payload.captchaToken = recaptchaToken;
    }

    if (submitButton) {
      submitButton.disabled = true;
    }
    setContractStatus(getTranslation("form.requestStatus.sending"), "info");

    try {
      let response = null;
      if (createStorageRequestsCallable) {
        try {
          response = await createStorageRequestsCallable(payload);
        } catch (err) {
          const code = err?.code || "";
          const message = err?.message || "";
          const isUnimplemented =
            code === "functions/unimplemented" ||
            code === "functions/not-found" ||
            code === "unimplemented" ||
            code === "not-found" ||
            message.includes("UNIMPLEMENTED") ||
            message.toLowerCase().includes("not found");
          if (!isUnimplemented) {
            throw err;
          }
        }
      }

      if (!response) {
        if (!createStorageRequestCallable) {
          throw new Error("Request service unavailable");
        }
        if (requests.length !== 1) {
          throw new Error("Multi-vehicle requests are not available yet.");
        }
        const singleRequest = requests[0];
        const flatPayload = {
          ...tenantPayload,
          ...singleRequest,
          season: tenantPayload.season,
        };
        if (recaptchaToken) {
          flatPayload.captchaToken = recaptchaToken;
        }
        response = await createStorageRequestCallable(flatPayload);
      }

      const confirmationCode =
        response?.data?.confirmationCode || response?.data?.requestId || "";
      const successTemplate = confirmationCode
        ? getTranslation("form.requestStatus.success")
        : getTranslation("form.requestStatus.successNoCode");
      const successMessage = formatTemplate(successTemplate, {
        confirmation: confirmationCode,
        email: tenantPayload.email || "",
      });
      setContractStatus(successMessage, "success");
      hasSubmitted = true;
      if (addVehicleButton) {
        addVehicleButton.disabled = true;
      }
      if (resetRequestButton) {
        resetRequestButton.classList.remove("hidden");
      }
    } catch (err) {
      console.error("Unable to submit storage request", err);
      const message =
        formatRequestError(err) || getTranslation("form.requestStatus.error");
      setContractStatus(message, "error");
    } finally {
      if (submitButton && !hasSubmitted) {
        submitButton.disabled = false;
      }
      resetRecaptchaWidget(recaptchaContainer);
      updateRequestSubmitState();
    }
  });
};

const buildTenantAddress = (data) => {
  const tenantStreet = (data.tenantAddress || "").trim();
  const tenantCity = (data.tenantCity || "").trim();
  const tenantProvince = (data.tenantProvince || "").trim();
  const tenantPostal = (data.tenantPostal || "").toUpperCase().trim();
  const provincePostal = [tenantProvince, tenantPostal].filter(Boolean).join(" ");
  return [tenantStreet, tenantCity, provincePostal].filter(Boolean).join(", ");
};

const getSharedPolicyTexts = (lang = currentLanguage) => {
  return (SHARED_POLICY_CARD.policies || [])
    .map((policy) => resolvePolicyEntry(policy, lang).text)
    .filter(Boolean);
};

const getDropoffEtiquetteContent = (lang = currentLanguage) => {
  const items = [
    "etiquette.item.clean",
    "etiquette.item.propane",
    "etiquette.item.tires",
    "etiquette.item.tarp",
  ]
    .map((key) => getTranslation(key, lang))
    .filter(Boolean);
  return {
    heading: getTranslation("etiquette.heading", lang),
    intro: getTranslation("etiquette.intro", lang),
    items,
  };
};

const wrapTextIntoLines = (text, font, fontSize, maxWidth) => {
  if (!text || !font || !fontSize || !maxWidth) return [];
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const words = normalized.split(" ");
  const lines = [];
  let currentLine = "";
  words.forEach((word) => {
    if (!word) return;
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      currentLine = candidate;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  });
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
};

const appendSharedPoliciesPage = (
  pdfDoc,
  {
    bodyFont,
    titleFont,
    lang = currentLanguage,
    titleFontSize = 11,
    bodyFontSize = 9.5,
    lineHeightMultiplier = 1.3,
    useExistingPage = false,
    existingPageBottomPadding = 140,
  } = {},
) => {
  const activeBodyFont = bodyFont || titleFont;
  const activeTitleFont = titleFont || bodyFont;
  if (!pdfDoc || !activeBodyFont) return;
  const policies = getSharedPolicyTexts(lang);
  if (!policies.length) return;
  const pages = pdfDoc.getPages();
  const baseSize = pages.length
    ? pages[0].getSize()
    : { width: 612, height: 792 };
  let width = baseSize.width || 612;
  let height = baseSize.height || 792;
  const margin = 50;
  const bulletIndent = 14;
  const bodyLineHeight = bodyFontSize * lineHeightMultiplier;
  let page = null;
  let cursorY = 0;
  let maxWidth = width - margin * 2;
  let currentBottomMargin = margin;

  const setPageContext = (targetPage, bottomMargin = margin) => {
    page = targetPage;
    const size = page.getSize();
    width = size.width;
    height = size.height;
    maxWidth = width - margin * 2;
    cursorY = height - margin;
    currentBottomMargin = bottomMargin;
  };

  if (useExistingPage && pages.length) {
    setPageContext(
      pages[pages.length - 1],
      Math.max(existingPageBottomPadding, margin),
    );
  } else {
    const newPage = pdfDoc.addPage([width, height]);
    setPageContext(newPage);
  }

  const createPage = () => {
    const newPage = pdfDoc.addPage([baseSize.width || 612, baseSize.height || 792]);
    setPageContext(newPage);
  };

  const lineHeightForSize = (size) => size * lineHeightMultiplier;

  const ensureSpace = (needed = bodyLineHeight) => {
    if (cursorY - needed < currentBottomMargin) {
      createPage();
    }
  };

  const drawParagraph = (
    text,
    {
      font = activeBodyFont,
      fontSize = bodyFontSize,
      spacingMultiplier = lineHeightMultiplier,
    } = {},
  ) => {
    if (!text) return;
    const paragraphs = text.split(/\n+/).filter((paragraph) => paragraph.trim());
    if (!paragraphs.length) return;
    paragraphs.forEach((paragraph, index) => {
      const lines = wrapTextIntoLines(paragraph, font, fontSize, maxWidth);
      lines.forEach((line) => {
        const lineHeight = fontSize * spacingMultiplier;
        ensureSpace(lineHeight);
        page.drawText(line, {
          x: margin,
          y: cursorY,
          size: fontSize,
          font,
        });
        cursorY -= lineHeight;
      });
      if (index < paragraphs.length - 1) {
        const extraSpacing = Math.max(spacingMultiplier - 1, 0.2);
        cursorY -= fontSize * extraSpacing;
      }
    });
    cursorY -= fontSize * 0.35;
  };

  const drawBulletParagraph = (text) => {
    if (!text) return;
    const bulletWidth = Math.max(maxWidth - bulletIndent, 50);
    const lines = wrapTextIntoLines(
      text,
      activeBodyFont,
      bodyFontSize,
      bulletWidth,
    );
    if (!lines.length) return;
    lines.forEach((line, index) => {
      ensureSpace(bodyLineHeight);
      if (index === 0) {
        page.drawText("•", {
          x: margin,
          y: cursorY,
          size: bodyFontSize,
          font: activeBodyFont,
        });
      }
      page.drawText(line, {
        x: margin + bulletIndent,
        y: cursorY,
        size: bodyFontSize,
        font: activeBodyFont,
      });
      cursorY -= bodyLineHeight;
    });
    cursorY -= bodyLineHeight * 0.35;
  };

  const drawSectionHeading = (text) => {
    if (!text) return;
    const normalizedTitle = text.toUpperCase();
    ensureSpace(lineHeightForSize(titleFontSize));
    const titleBaselineY = cursorY;
    page.drawText(normalizedTitle, {
      x: margin,
      y: cursorY,
      size: titleFontSize,
      font: activeTitleFont || activeBodyFont,
      characterSpacing: 0.15,
    });
    const titleWidth =
      activeTitleFont?.widthOfTextAtSize(normalizedTitle, titleFontSize) ||
      maxWidth;
    const underlineHeight = Math.max(0.8, titleFontSize * 0.12);
    page.drawRectangle({
      x: margin,
      y: titleBaselineY - titleFontSize * 0.3,
      width: Math.min(titleWidth, maxWidth),
      height: underlineHeight,
    });
    cursorY -= titleFontSize * (lineHeightMultiplier + 0.15);
  };

  const title =
    getLocalizedText(SHARED_POLICY_CARD.ruleTitle, lang) ||
    getLocalizedText(SHARED_POLICY_CARD.name, lang) ||
    "Access & maintenance";
  drawSectionHeading(title);
  const description = getLocalizedText(SHARED_POLICY_CARD.description, lang);
  drawParagraph(description, {
    font: activeBodyFont,
    fontSize: bodyFontSize,
  });

  policies.forEach((policy) => {
    drawBulletParagraph(policy);
  });

  const etiquette = getDropoffEtiquetteContent(lang);
  if (
    etiquette.heading ||
    etiquette.intro ||
    (etiquette.items && etiquette.items.length)
  ) {
    cursorY -= bodyFontSize * 0.15;
    drawSectionHeading(
      etiquette.heading ||
        getTranslation("etiquette.heading", lang) ||
        "Drop-off etiquette",
    );
    drawParagraph(etiquette.intro, {
      font: activeBodyFont,
      fontSize: bodyFontSize,
    });
    etiquette.items.forEach((item) => drawBulletParagraph(item));
  }
};

const buildBlankContractWithPolicies = async (lang = currentLanguage) => {
  if (!window.PDFLib) {
    throw new Error("PDF library unavailable");
  }
  const { PDFDocument, StandardFonts } = window.PDFLib;
  const templateUrl = getContractTemplateUrl(lang);
  const response = await fetch(templateUrl);
  if (!response.ok) {
    throw new Error("Unable to load the contract template PDF.");
  }
  const templateBytes = await response.arrayBuffer();
  const pdfDoc = await PDFDocument.load(templateBytes);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const useExistingPolicyPage = pdfDoc.getPageCount() > 1;
  appendSharedPoliciesPage(pdfDoc, {
    bodyFont: helvetica,
    titleFont: helveticaBold,
    lang,
    titleFontSize: 11,
    bodyFontSize: 9.5,
    useExistingPage: useExistingPolicyPage,
    existingPageBottomPadding: 160,
  });
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const templateName = templateUrl.split("/").pop() || `contract-${lang}.pdf`;
  const filename = templateName.replace(/\.pdf$/i, "-policies.pdf");
  return { url, filename, blob };
};

const generateContractPdf = async (data) => {
  const { PDFDocument, PDFName, PDFBool, StandardFonts } = window.PDFLib;
  const preferredLanguage =
    data.formLanguage && SUPPORTED_LANGUAGES.includes(data.formLanguage)
      ? data.formLanguage
      : currentLanguage;
  const templateUrl = getContractTemplateUrl(preferredLanguage);
  const response = await fetch(templateUrl);
  if (!response.ok) {
    throw new Error("Unable to load the contract template PDF.");
  }
  const templateBytes = await response.arrayBuffer();
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const formLanguage = preferredLanguage || DEFAULT_LANGUAGE;

  const updateAppearance = (field, force = false) => {
    if (!field || !force) return;
    try {
      field.updateAppearances(helvetica);
    } catch (err) {
      const fieldName =
        typeof field.getName === "function" ? field.getName() : "unknown";
      console.warn(
        `Unable to update appearance for ${fieldName}`,
        err,
      );
    }
  };

  const setTextField = (nameOrNames, value = "", refresh = false) => {
    const names = Array.isArray(nameOrNames) ? nameOrNames : [nameOrNames];
    for (const name of names) {
      try {
        const field = form.getTextField(name);
        field.setText(value ? String(value) : "");
        updateAppearance(field, refresh);
        return true;
      } catch (err) {}
    }
    return false;
  };

  const setChoiceField = (name, value = "") => {
    const normalized = value ? String(value) : "";
    if (!normalized) return;
    try {
      const field = form.getDropdown(name);
      field.select(normalized);
      updateAppearance(field, true);
    } catch (err) {
      console.warn(`Missing choice field: ${name}`, err);
    }
  };

  const setDropdownField = (name, value = "") => {
    setChoiceField(name, value);
  };

  const setCheck = (name, checked) => {
    try {
      const field = form.getCheckBox(name);
      if (checked) {
        field.check();
      } else {
        field.uncheck();
      }
    } catch (err) {
      console.warn(`Missing checkbox: ${name}`, err);
    }
  };

  const tenantAddressLine = buildTenantAddress(data);
  const formattedPhone = formatPhoneNumber(data.tenantPhone);
  const estimatedCostDisplay = estimateRentalCost(data);
  const depositValue = parseCurrencyValue(data.deposit) || 0;
  const estimatedAmount = parseCurrencyValue(estimatedCostDisplay) || 0;
  const batteryFee = data.battery === "yes" ? getSeasonAddonPrice(data.season, "battery") || 0 : 0;
  const propaneFee = data.propane === "yes" ? getSeasonAddonPrice(data.season, "propane") || 0 : 0;
  const servicesTotal = batteryFee + propaneFee;
  const remainingAmount = Math.max(estimatedAmount - depositValue, 0);
  const servicesDisplay =
    servicesTotal > 0 ? formatCurrency(servicesTotal) : "$0";
  const remainingDisplay =
    remainingAmount > 0 ? formatCurrency(remainingAmount) : "$0";
  const tenantSigLocationValue = [data.tenantCity, data.tenantProvince]
    .filter(Boolean)
    .join(", ") || "Alfred, ON";
  const contractNumber = Date.now().toString();

  const pdfSeasonLabel =
    getSeasonLabelForLanguage(data.season, formLanguage) ||
    getSeasonLabelForLanguage(data.season, DEFAULT_LANGUAGE) ||
    "";
  const pdfVehicleLabel =
    getVehicleLabelForLanguage(data.vehicleType, formLanguage) ||
    data.vehicleType ||
    "";

  setDropdownField("season", pdfSeasonLabel || data.season || "");
  setTextField("tenantName", data.tenantName || "");
  setTextField("tenantPhone", formattedPhone);
  setTextField("tenantEmail", data.email || "");
  setTextField("tenantAddress", tenantAddressLine);
  setDropdownField("vehicleType", pdfVehicleLabel);
  setTextField("vehicleTypeOther", data.vehicleTypeOther || "");
  setTextField("vehicleBrand", data.vehicleBrand || "");
  setTextField("vehicleModel", data.vehicleModel || "");
  setTextField("vehicleColour", data.vehicleColour || "");
  setTextField("vehicleLength", data.vehicleLength || "");
  setTextField(["vehicleYear", "Number_1"], data.vehicleYear || "");
  setTextField("vehiclePlate", data.vehiclePlate || "");
  setDropdownField("vehicleProv", data.vehicleProv || "");
  setTextField("insuranceCompany", data.insuranceCompany || "");
  setTextField("insurancePolicy", data.insurancePolicy || "");
  setTextField(
    "insuranceExpiration",
    formatPdfDate(data.insuranceExpiration) || "",
    true,
  );
  setTextField("leaseDuration", data.leaseDuration || "");
  setTextField("leaseCost", estimatedAmount ? formatPdfCurrency(estimatedAmount) : "");
  setTextField(
    "deposit",
    depositValue ? formatPdfCurrency(depositValue) : "",
  );
  setTextField(
    "service Cost",
    servicesTotal ? formatPdfCurrency(servicesTotal) : "",
  );
  setTextField(
    "remaining",
    remainingAmount ? formatPdfCurrency(remainingAmount) : "",
  );
  setTextField(["contractNumber", "contract"], contractNumber);
  setTextField("tenantSigLocation", tenantSigLocationValue);
  setTextField(
    "tenantSigDate",
    formatPdfDate(new Date().toISOString().slice(0, 10)),
    true,
  );
  const safeSetText = (name) => {
    try {
      const field = form.getTextField(name);
      field.setText("");
    } catch (err) {
      // ignore missing or non-text fields
    }
  };
  safeSetText("tenantSignature");
  safeSetText("repSignature");
  setTextField("repSigLocation", "");
  setTextField("repSigDate", "");

  setCheck("battery", data.battery === "yes");
  setCheck("propane", data.propane === "yes");

  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const useExistingPolicyPage = pdfDoc.getPageCount() > 1;
  appendSharedPoliciesPage(pdfDoc, {
    bodyFont: helvetica,
    titleFont: helveticaBold,
    lang: formLanguage,
    titleFontSize: 11,
    bodyFontSize: 9.5,
    useExistingPage: useExistingPolicyPage,
    existingPageBottomPadding: 160,
  });

  const acroFormDict = pdfDoc.catalog.lookup(PDFName.of("AcroForm"));
  if (acroFormDict) {
    acroFormDict.set(PDFName.of("NeedAppearances"), PDFBool.True);
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  return { url, filename: `colle-storage-${contractNumber}.pdf` };
};

const seasonWindow = (seasonValue = "") => {
  let season = SEASON_LOOKUP[seasonValue];
  if (!season) {
    season = findSeasonByLabel(String(seasonValue || ""));
  }

  if (!season) {
    return getMessage("messages.seasonWindowFallback");
  }

  const dropoff =
    getLocalizedText(season.dropoffWindow) ||
    getLocalizedText(season.timeframe).split("–")[0].trim();
  const pickup = getLocalizedText(season.pickupDeadline);
  return formatTemplate(getMessage("messages.seasonWindow"), {
    dropoff,
    pickup,
  });
};

const applyTranslationsForLanguage = (lang) => {
  const elements = document.querySelectorAll("[data-i18n]");
  let editAttachCount = 0;
  let translatedCount = 0;
  elements.forEach((el) => {
    const key = el.dataset.i18n;
    if (DEBUG_I18N_KEYS) {
      const attrTargets = el.dataset.i18nAttr
        ? el.dataset.i18nAttr
            .split(",")
            .map((attr) => attr.trim())
            .filter(Boolean)
        : [];
      if (attrTargets.length) {
        attrTargets.forEach((attr) => el.setAttribute(attr, key));
        return;
      }
      // Force plain text so we don't accidentally render markup when debugging.
      el.textContent = key;
      return;
    }
    const translation = getTranslation(key, lang);
    if (!translation) return;
    translatedCount += 1;
    const attrTargets = el.dataset.i18nAttr
      ? el.dataset.i18nAttr
          .split(",")
          .map((attr) => attr.trim())
          .filter(Boolean)
      : [];
    if (attrTargets.length) {
      attrTargets.forEach((attr) => el.setAttribute(attr, translation));
      return;
    }
    if (el.dataset.i18nHtml === "true") {
      el.innerHTML = translation;
      populateServicePriceElements(el);
      if (EDIT_I18N) {
        attachI18nEditAffordance(el, key);
        editAttachCount += 1;
      }
      return;
    }
    el.textContent = translation;
    if (EDIT_I18N) {
      attachI18nEditAffordance(el, key);
      editAttachCount += 1;
    }
  });
  if (typeof window !== "undefined" && IS_STAGING_PAGE && EDIT_I18N) {
    // Visible in DevTools to confirm edit mode is running.
    window.__ENTREPOT_STAGING_FLAGS__ = {
      ...(window.__ENTREPOT_STAGING_FLAGS__ || {}),
      lastEditAttachCount: editAttachCount,
      lastTranslatedCount: translatedCount,
    };
    if (typeof document !== "undefined") {
      document.documentElement.dataset.i18nEditCount = String(editAttachCount);
    }
    if (!window.__ENTREPOT_EDIT_LOGGED__) {
      window.__ENTREPOT_EDIT_LOGGED__ = true;
      console.info("[entrepot] edit mode active; i18n nodes processed:", editAttachCount);
    }
  }
};

const updateLanguageToggleState = () => {
  const buttons = document.querySelectorAll("[data-lang-toggle]");
  buttons.forEach((btn) => {
    const lang = btn.dataset.langToggle;
    btn.classList.toggle("active", lang === currentLanguage);
  });
};

const applyLanguage = (lang, { skipPersist, skipUrlSync } = {}) => {
  const normalized = SUPPORTED_LANGUAGES.includes(lang)
    ? lang
    : DEFAULT_LANGUAGE;
  const previousLanguage = currentLanguage;
  currentLanguage = normalized;
  document.documentElement.lang = currentLanguage;
  if (!skipPersist) {
    try {
      window.localStorage?.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
    } catch (err) {}
  }
  applyTranslationsForLanguage(currentLanguage);
  if (typeof window !== "undefined" && IS_STAGING_PAGE && EDIT_I18N) {
    if (!window.__ENTREPOT_STAGING_FLAGS__) window.__ENTREPOT_STAGING_FLAGS__ = {};
    window.__ENTREPOT_STAGING_FLAGS__.lastApplyLanguageAt = Date.now();
  }
  buildSeasonCards();
  populateServicePrices();
  updateContractDownloadLink();
  updateContactEmails();
  syncContractHelperLanguage();
  syncContactFormLanguage();
  updateLanguageToggleState();
  if (previousLanguage !== currentLanguage) {
    refreshRecaptchaForLanguage();
  }
  if (!skipUrlSync) {
    clearLanguageIndicators();
  }
};

const initLanguageToggle = () => {
  const buttons = document.querySelectorAll("[data-lang-toggle]");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.langToggle;
      if (!lang || lang === currentLanguage) return;
      applyLanguage(lang);
    });
  });
};

const getStoredLanguage = () => {
  try {
    const stored = window.localStorage?.getItem(LANGUAGE_STORAGE_KEY);
    const normalized = stored ? stored.toLowerCase() : null;
    if (normalized && SUPPORTED_LANGUAGES.includes(normalized)) {
      return normalized;
    }
  } catch (err) {}
  return null;
};

const getLanguageFromHostname = () => {
  const hostname = (window.location.hostname || "").toLowerCase();
  if (!hostname) return null;
  if (hostname.includes("entrepot")) {
    return "fr";
  }
  if (hostname.includes("warehouse")) {
    return "en";
  }
  return null;
};

const getLanguageFromUrl = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const queryLang = params.get("lang");
    const normalizedQuery = queryLang ? queryLang.toLowerCase() : null;
    if (normalizedQuery && SUPPORTED_LANGUAGES.includes(normalizedQuery)) {
      return normalizedQuery;
    }
  } catch (err) {}
  const hash = (window.location.hash || "").replace(/^#/, "");
  const normalizedHash = hash ? hash.toLowerCase() : null;
  if (normalizedHash && SUPPORTED_LANGUAGES.includes(normalizedHash)) {
    return normalizedHash;
  }
  return null;
};

const bootEntrepotSite = () => {
  (async () => {
    if (typeof window !== "undefined" && window.__ENTREPOT_STAGING_FLAGS__) {
      window.__ENTREPOT_STAGING_FLAGS__.bootStartedAt = Date.now();
    }
    renderStagingModeToggle();
    const urlLanguageRaw = getLanguageFromUrl();
    const storedLanguage = getStoredLanguage();
    const urlLanguage = storedLanguage ? null : urlLanguageRaw;
    const hostLanguage = getLanguageFromHostname();
    const initialLanguage =
      storedLanguage || urlLanguage || hostLanguage || DEFAULT_LANGUAGE;

    currentLanguage = initialLanguage;
    if (typeof document !== "undefined") {
      document.documentElement.lang = currentLanguage;
    }

    const showStagingGate = (opts = {}) => {
      const existing = document.getElementById("staging-gate");
      if (existing) existing.remove();
      const page = document.querySelector(".page");
      if (page) {
        page.dataset.stagingHidden = "true";
        page.style.visibility = "hidden";
      }

      const overlay = document.createElement("div");
      overlay.id = "staging-gate";
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.background = "#0b1020";
      overlay.style.color = "#fff";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      overlay.style.padding = "24px";
      overlay.style.zIndex = "9999";

      const card = document.createElement("div");
      card.style.maxWidth = "520px";
      card.style.width = "100%";
      card.style.background = "rgba(255,255,255,0.06)";
      card.style.border = "1px solid rgba(255,255,255,0.14)";
      card.style.borderRadius = "12px";
      card.style.padding = "18px";

      const title = document.createElement("h2");
      title.textContent = "Staging preview";
      title.style.margin = "0 0 10px";

      const body = document.createElement("p");
      body.style.margin = "0 0 14px";
      body.style.lineHeight = "1.5";
      body.textContent =
        opts.message ||
        (opts.mode === "email"
          ? "Sign in to view staging website content from Tracker."
          : "Sign in with Google to view staging website content from Tracker.");

      const error = document.createElement("p");
      error.style.margin = "0 0 14px";
      error.style.color = "#ffb4b4";
      error.style.display = opts.error ? "block" : "none";
      error.textContent = opts.error || "";

      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "10px";
      actions.style.flexWrap = "wrap";

      const controls = document.createElement("div");
      controls.style.display = "grid";
      controls.style.gridTemplateColumns = "1fr";
      controls.style.gap = "10px";
      controls.style.marginBottom = "12px";

      let emailInput = null;
      let passwordInput = null;
      if (opts.mode === "email") {
        emailInput = document.createElement("input");
        emailInput.type = "email";
        emailInput.placeholder = "Email";
        emailInput.autocomplete = "username";
        emailInput.style.padding = "10px 12px";
        emailInput.style.borderRadius = "10px";
        emailInput.style.border = "1px solid rgba(255,255,255,0.22)";
        emailInput.style.background = "rgba(255,255,255,0.08)";
        emailInput.style.color = "#fff";

        passwordInput = document.createElement("input");
        passwordInput.type = "password";
        passwordInput.placeholder = "Password";
        passwordInput.autocomplete = "current-password";
        passwordInput.style.padding = "10px 12px";
        passwordInput.style.borderRadius = "10px";
        passwordInput.style.border = "1px solid rgba(255,255,255,0.22)";
        passwordInput.style.background = "rgba(255,255,255,0.08)";
        passwordInput.style.color = "#fff";

        controls.appendChild(emailInput);
        controls.appendChild(passwordInput);
      }

      if (opts.actions !== false) {
        const login = document.createElement("button");
        login.type = "button";
        login.textContent = opts.mode === "email" ? "Sign in" : "Sign in with Google";
        login.style.padding = "10px 14px";
        login.style.borderRadius = "10px";
        login.style.border = "1px solid rgba(255,255,255,0.2)";
        login.style.background = "#ffffff";
        login.style.color = "#0b1020";
        login.style.fontWeight = "700";
        login.style.cursor = "pointer";
        login.addEventListener("click", () => {
          if (opts.mode === "email") {
            opts.onEmailLogin?.({
              email: emailInput?.value || "",
              password: passwordInput?.value || "",
            });
            return;
          }
          opts.onLogin?.();
        });

        const logout = document.createElement("button");
        logout.type = "button";
        logout.textContent = "Sign out";
        logout.style.padding = "10px 14px";
        logout.style.borderRadius = "10px";
        logout.style.border = "1px solid rgba(255,255,255,0.2)";
        logout.style.background = "transparent";
        logout.style.color = "#fff";
        logout.style.fontWeight = "700";
        logout.style.cursor = "pointer";
        logout.style.display = opts.showLogout ? "inline-flex" : "none";
        logout.addEventListener("click", () => opts.onLogout?.());

        actions.appendChild(login);
        actions.appendChild(logout);
      }

      card.appendChild(title);
      card.appendChild(body);
      card.appendChild(error);
      if (controls.childNodes.length) {
        card.appendChild(controls);
      }
      if (actions.childNodes.length) {
        card.appendChild(actions);
      }
      overlay.appendChild(card);
      document.body.appendChild(overlay);
    };

    const hideStagingGate = () => {
      const existing = document.getElementById("staging-gate");
      if (existing) existing.remove();
      const page = document.querySelector(".page");
      if (page && page.dataset.stagingHidden === "true") {
        delete page.dataset.stagingHidden;
        page.style.visibility = "";
      }
    };

    const ensureStagingContent = async ({ silent = false } = {}) => {
      if (!firebaseAuth) {
        throw new Error("Firebase Auth is not available.");
      }
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      const currentUser = firebaseAuth.currentUser;
      const isAllowed = (user) => {
        const email = (user?.email || "").toLowerCase();
        return email && STAGING_ALLOWED_EMAILS.has(email);
      };

      if (!silent) {
        showStagingGate({
          message: "Checking staging access...",
          actions: false,
        });
      }

      const signedInUser = await new Promise((resolve) => {
        let latestUser = firebaseAuth.currentUser || null;
        let settled = false;
        let timeoutId = null;
        let unsubscribe = () => {};
        const finish = (user) => {
          if (settled) return;
          settled = true;
          if (timeoutId) window.clearTimeout(timeoutId);
          unsubscribe();
          resolve(user || null);
        };
        unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
          latestUser = user || null;
          if (latestUser) {
            finish(latestUser);
          }
        });
        timeoutId = window.setTimeout(() => finish(latestUser), 1800);
      });

      const user = signedInUser || currentUser;
      if (!user) {
        const mode = IS_LOCALHOST ? "email" : "google";
        showStagingGate({
          mode,
          onLogin: async () => {
            try {
              await signInWithPopup(firebaseAuth, provider);
              window.location.reload();
            } catch (err) {
              showStagingGate({
                mode,
                error: err?.message || "Sign-in failed.",
                onLogin: async () => {
                  await signInWithPopup(firebaseAuth, provider);
                  window.location.reload();
                },
              });
            }
          },
          onEmailLogin: async ({ email, password }) => {
            try {
              await signInWithEmailAndPassword(
                firebaseAuth,
                (email || "").trim(),
                password || "",
              );
              // After sign-in, continue loading staging content without forcing a full reload.
              hideStagingGate();
              await ensureStagingContent();
            } catch (err) {
              showStagingGate({
                mode,
                error: err?.message || "Sign-in failed.",
                onEmailLogin: async ({ email, password }) => {
                  await signInWithEmailAndPassword(
                    firebaseAuth,
                    (email || "").trim(),
                    password || "",
                  );
                  hideStagingGate();
                  await ensureStagingContent();
                },
              });
            }
          },
        });
        return { pendingAuth: true };
      }

      if (!isAllowed(user)) {
        showStagingGate({
          error: `Not authorized: ${user.email || "unknown email"}`,
          showLogout: true,
          onLogout: async () => {
            await signOut(firebaseAuth);
            window.location.reload();
          },
          onLogin: async () => {
            await signInWithPopup(firebaseAuth, provider);
            window.location.reload();
          },
        });
        throw new Error("Not authorized.");
      }

      if (!silent) {
        showStagingGate({
          message: `Signed in as ${user.email}. Loading staging content...`,
          actions: false,
        });
      }

      // Local dev: avoid callable cross-origin CORS issues by reading the emulator directly.
      if (IS_LOCALHOST) {
        if (!firebaseDb) {
          throw new Error("Firestore is not available.");
        }
        const fetchCollection = async (name, orderField) => {
          const ref = collection(firebaseDb, name);
          const q = orderField ? query(ref, orderBy(orderField)) : ref;
          const snap = await getDocs(q);
          return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        };

        const [
          STORAGE_ADDONS,
          STORAGE_SEASON_ADDONS,
          STORAGE_CONDITIONS,
          STORAGE_ETIQUETTE,
          i18nDocs,
          STORAGE_SEASONS,
          offers,
          VEHICLE_TYPES,
        ] = await Promise.all([
          fetchCollection("storageAddOns", "order"),
          fetchCollection("storageSeasonAddOns", "order"),
          fetchCollection("storageConditions", "order"),
          fetchCollection("storageEtiquette", "order"),
          fetchCollection("i18nEntries", "key"),
          fetchCollection("storageSeasons", "order"),
          fetchCollection("storageOffers", "order"),
          fetchCollection("vehicleTypes", "order"),
        ]);

        const offersBySeason = new Map();
        offers.forEach((offer) => {
          const seasonId = offer.seasonId;
          if (!seasonId) return;
          if (!offersBySeason.has(seasonId)) offersBySeason.set(seasonId, []);
          offersBySeason.get(seasonId).push(offer);
        });
        STORAGE_SEASONS.forEach((season) => {
          const seasonOffers = offersBySeason.get(season.id) || [];
          seasonOffers.sort((a, b) => (a.order || 0) - (b.order || 0));
          season.offers = seasonOffers;
        });

        const I18N_LOCAL = {};
        i18nDocs.forEach((entry) => {
          const key = entry.key || entry.id;
          if (!key) return;
          I18N_LOCAL[key] = entry.text || { en: "", fr: "" };
        });

        setWebsiteContentPayload({
          STORAGE_ADDONS,
          STORAGE_SEASON_ADDONS,
          STORAGE_CONDITIONS,
          STORAGE_ETIQUETTE,
          STORAGE_SEASONS,
          VEHICLE_TYPES,
          I18N: I18N_LOCAL,
        });
        if (!silent) {
          hideStagingGate();
        }
        return { pendingAuth: false };
      }

      if (!getWebsiteContentCallable) {
        throw new Error("Staging endpoint is not available.");
      }
      const response = await getWebsiteContentCallable({ mode: "staging" });
      const payload = response?.data || null;
      if (!payload) {
        throw new Error("No staging content returned.");
      }
      setWebsiteContentPayload(payload);
      if (!silent) {
        hideStagingGate();
      }
      return { pendingAuth: false };
    };

    if (IS_STAGING_PAGE) {
      stagingRefreshHandler = async () => {
        const result = await ensureStagingContent({ silent: true });
        if (result?.pendingAuth) return;
        removeI18nEditAffordances();
        applyLanguage(currentLanguage, {
          skipPersist: true,
          skipUrlSync: true,
        });
        renderStagingModeToggle();
      };
      try {
        const result = await ensureStagingContent();
        if (result?.pendingAuth) {
          // Auth UI is visible, stop booting the site until the user signs in.
          return;
        }
      } catch (err) {
        // Gate UI already displayed. Do not continue booting the public site.
        console.warn("Staging boot halted", err);
        if (typeof window !== "undefined" && window.__ENTREPOT_STAGING_FLAGS__) {
          window.__ENTREPOT_STAGING_FLAGS__.stagingBootHalted = true;
          window.__ENTREPOT_STAGING_FLAGS__.stagingBootError = err?.message || String(err);
        }
        return;
      }
    }

    initFormStepper();
    handleContactForm();
    handleContractHelper();
    clearLanguageIndicators();
    applyLanguage(initialLanguage, {
      skipPersist: !urlLanguage,
      skipUrlSync: Boolean(urlLanguageRaw || hostLanguage),
    });
    initLanguageToggle();
  })();
};

// site.js can be loaded dynamically by /staging after DOMContentLoaded already fired.
// In that case, the event listener would never run, so we boot immediately.
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootEntrepotSite);
  } else {
    bootEntrepotSite();
  }
}
