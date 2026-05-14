export const KNOWN_FEATURE_FLAGS = ['backoffice'] as const

export type FeatureFlag = (typeof KNOWN_FEATURE_FLAGS)[number]
