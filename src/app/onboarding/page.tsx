import { getOnboardingState } from '@/actions'
import { OnboardingWizard } from '@/components/onboarding-wizard'
import { requireUser } from '@/lib/auth-guards'
import { readLocale } from '@/lib/cookies'
import { t } from '@/lib/i18n'
import { readOnboardingStatus } from '@/lib/store'
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
