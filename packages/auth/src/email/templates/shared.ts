export const COLORS = {
  bg: '#F6F1E7',
  ink: '#1F2A24',
  inkSoft: '#4A5A52',
  inkFaint: '#8A9890',
  sage: '#7C9A82',
  line: '#1F2A2418',
  paper: '#FFFFFF'
}

export const FONT_DISPLAY = 'Fraunces, "Times New Roman", Georgia, serif'
export const FONT_BODY = '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif'
export const FONT_MONO = '"Geist Mono", "SF Mono", Menlo, Consolas, monospace'

export const FRAUNCES_FONTS = [
  {
    fontFamily: 'Fraunces' as const,
    fallbackFontFamily: 'serif' as const,
    webFont: {
      url: 'https://fonts.gstatic.com/s/fraunces/v37/6NUu8FyLNQOQZAnv9ZwNjOcKMmzGBt4.woff2',
      format: 'woff2' as const
    },
    fontWeight: 400 as const,
    fontStyle: 'normal' as const
  },
  {
    fontFamily: 'Fraunces' as const,
    fallbackFontFamily: 'serif' as const,
    webFont: {
      url: 'https://fonts.gstatic.com/s/fraunces/v37/6NUh8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk.woff2',
      format: 'woff2' as const
    },
    fontWeight: 400 as const,
    fontStyle: 'italic' as const
  }
]
