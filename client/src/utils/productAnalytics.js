import api from '../api/axios';

export function trackProductEvent(eventName, payload = {}) {
  const { organizationId, projectId, metadata = {}, source = 'web' } = payload;

  return api.post('/analytics/events', {
    eventName,
    organizationId,
    projectId,
    source,
    metadata,
  }).catch(() => {});
}
