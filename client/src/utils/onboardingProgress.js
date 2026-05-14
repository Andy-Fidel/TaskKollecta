const PREFIX = 'taskkollecta_onboarding_progress';

const storageKey = (organizationId = 'global') => `${PREFIX}:${organizationId || 'global'}`;

export function getOnboardingProgress(organizationId) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(organizationId)) || '{}');
  } catch {
    return {};
  }
}

export function markOnboardingMilestone(organizationId, milestone) {
  const current = getOnboardingProgress(organizationId);
  if (current[milestone]) return false;

  localStorage.setItem(storageKey(organizationId), JSON.stringify({
    ...current,
    [milestone]: new Date().toISOString(),
  }));
  return true;
}

export function isOnboardingMilestoneComplete(organizationId, milestone) {
  return Boolean(getOnboardingProgress(organizationId)[milestone]);
}
