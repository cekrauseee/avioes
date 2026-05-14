import { getOnboardingState } from '@/actions'
import { OnboardingWizard } from '@/components/onboarding-wizard'
import { readLocale } from '@airplanes/auth/cookies'
import { requireUser } from '@airplanes/auth/guards'
import { readOnboardingStatus } from '@airplanes/db/store'
import { t } from '@airplanes/i18n'
import { redirect } from 'next/navigation'

export async function generateMetadata() {
  const locale = await readLocale()
  return { title: t(locale, 'onboarding.metaTitle') }
}

export default async function OnboardingPage() {
  const user = await requireUser('/onboarding')
  const status = await readOnboardingStatus(user.id)
  if (status === 'complete') redirect('/')
  const initial = await getOnboardingState()
  if (!initial) redirect('/auth')
  return <OnboardingWizard initial={initial} />
}
