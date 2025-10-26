import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';

// Spanish-speaking countries (ISO 3166-1 alpha-2 codes)
const SPANISH_SPEAKING_COUNTRIES = [
  'ES', // Spain
  'MX', // Mexico
  'AR', // Argentina
  'CO', // Colombia
  'PE', // Peru
  'VE', // Venezuela
  'CL', // Chile
  'EC', // Ecuador
  'GT', // Guatemala
  'CU', // Cuba
  'BO', // Bolivia
  'DO', // Dominican Republic
  'HN', // Honduras
  'PY', // Paraguay
  'SV', // El Salvador
  'NI', // Nicaragua
  'CR', // Costa Rica
  'PA', // Panama
  'UY', // Uruguay
  'GQ', // Equatorial Guinea
  'PR', // Puerto Rico
];

// Detect if user is in a Spanish-speaking country
const detectLanguageByCountry = (): string => {
  try {
    // Try to get the user's timezone
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Try to get country from locale
    const locale = navigator.language || navigator.languages?.[0] || 'en-US';
    const parts = locale.split('-');
    
    // Check if language is Spanish
    if (parts[0]?.toLowerCase() === 'es') {
      return 'es';
    }
    
    // Check if country code indicates Spanish-speaking country
    if (parts[1] && SPANISH_SPEAKING_COUNTRIES.includes(parts[1].toUpperCase())) {
      return 'es';
    }
    
    // Additional check for timezone-based detection
    if (timeZone) {
      // Common Spanish-speaking timezones
      if (timeZone.includes('Mexico') || 
          timeZone.includes('Argentina') || 
          timeZone.includes('Madrid') ||
          timeZone.includes('Bogota') ||
          timeZone.includes('Lima') ||
          timeZone.includes('Santiago') ||
          timeZone.includes('Caracas')) {
        return 'es';
      }
    }
  } catch (error) {
    console.warn('Error detecting language by country:', error);
  }
  
  return 'en'; // Default to English
};

// Custom language detector
const customLanguageDetector = {
  type: 'languageDetector' as const,
  async: false,
  detect: () => {
    // Check localStorage first
    const savedLanguage = localStorage.getItem('i18nextLng');
    if (savedLanguage) {
      return savedLanguage;
    }
    
    // Detect by country/locale
    return detectLanguageByCountry();
  },
  init: () => {},
  cacheUserLanguage: (lng: string) => {
    localStorage.setItem('i18nextLng', lng);
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations
      },
      es: {
        translation: esTranslations
      }
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'es'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    }
  });

// Set initial language based on detection
const detectedLanguage = detectLanguageByCountry();
if (!localStorage.getItem('i18nextLng')) {
  i18n.changeLanguage(detectedLanguage);
  localStorage.setItem('i18nextLng', detectedLanguage);
}

export default i18n;
