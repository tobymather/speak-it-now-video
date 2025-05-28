import posthog from 'posthog-js';

// Initialize PostHog
export const initAnalytics = () => {
  if (typeof window !== 'undefined') {
    posthog.init('phc_gPJ3nbBDLh1s0JpRT0mTVO9bjCyDhdpngVWoVYxAFwg', {
      api_host: 'https://eu.i.posthog.com',
      person_profiles: 'always', // Track anonymous users as requested
      capture_pageview: 'history_change', // For SPA navigation
      autocapture: false, // Disable autocapture to use explicit events only
      disable_session_recording: true, // Focus on events only
    });
  }
};

// Analytics event tracking functions
export const analytics = {
  // Page visit tracking
  pageView: (page: string, language: string) => {
    posthog.capture('app:page_view', {
      page,
      language,
      timestamp: new Date().toISOString(),
    });
  },

  // Audio recording started
  recordAudio: (language: string) => {
    posthog.capture('voice:audio_record', {
      action: 'start',
      language,
      timestamp: new Date().toISOString(),
    });
  },

  // Voice generation initiated
  generateVoice: (language: string, favouriteFood?: string, favouriteSport?: string) => {
    posthog.capture('voice:ai_generate', {
      language,
      favourite_food: favouriteFood,
      favourite_sport: favouriteSport,
      timestamp: new Date().toISOString(),
    });
  },

  // Audio playback/listening
  listenRecording: (audioType: 'original' | 'generated', language: string) => {
    posthog.capture('voice:audio_listen', {
      audio_type: audioType,
      language,
      timestamp: new Date().toISOString(),
    });
  },

  // Trial lesson link clicked
  clickTrialLink: (language: string, source: string = 'cta_button') => {
    posthog.capture('trial:link_click', {
      language,
      source,
      timestamp: new Date().toISOString(),
    });
  },

  // Error tracking
  error: (errorType: string, errorMessage: string, context?: Record<string, unknown>) => {
    posthog.capture('app:error', {
      error_type: errorType,
      error_message: errorMessage,
      context,
      timestamp: new Date().toISOString(),
    });
  },

  // Voice cleanup events
  voiceCleanup: (deletedCount: number, errorCount: number) => {
    posthog.capture('voice:cleanup', {
      deleted_count: deletedCount,
      error_count: errorCount,
      timestamp: new Date().toISOString(),
    });
  },
};

export default posthog; 