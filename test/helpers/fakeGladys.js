// -----------------------------------------------------------------------------
// Minimal in-memory stand-in for the Gladys SDK object, for unit tests.
//
// It reproduces the only surface the modules rely on:
//   - externalIds(type, platformId) -> { device, feature(key) }
//   - publishStates / publishDiscoveredDevices / publishTransports /
//     setConnectionStatus -> recorded so tests can assert them
//   - publishSceneEvent / requestWidgetRefresh -> recorded (Gladys 5.1)
//   - httpClient.get('/house')     -> scriptable answer
// -----------------------------------------------------------------------------

export function createFakeGladys({ houses = [], sceneEventError = null } = {}) {
  const published = [];
  const batches = [];
  const transports = [];
  const connectionStatuses = [];
  const discovered = [];
  const httpCalls = [];
  const sceneEvents = [];
  const widgetRefreshes = [];

  return {
    published,
    batches,
    transports,
    connectionStatuses,
    discovered,
    httpCalls,
    houses,
    sceneEvents,
    widgetRefreshes,
    /** Set to an Error (with `status`) to make publishSceneEvent fail. */
    sceneEventError,

    externalIds(type, platformId) {
      const device = `${type}:${platformId}`;
      return {
        device,
        feature: (key) => `${device}:${key}`,
      };
    },

    async publishState(featureExternalId, state) {
      published.push({ featureExternalId, state });
    },

    async publishStates(states) {
      batches.push(states);
      for (const s of states) {
        published.push({
          featureExternalId: s.device_feature_external_id,
          state: s.state,
          text: s.text,
        });
      }
    },

    async publishTransports(entries) {
      transports.push(...entries);
    },

    async publishDiscoveredDevices(devices) {
      discovered.push(devices);
    },

    async setConnectionStatus(connected, message) {
      connectionStatuses.push({ connected, message });
    },

    async publishSceneEvent(key, data) {
      if (this.sceneEventError) {
        throw this.sceneEventError;
      }
      sceneEvents.push({ key, data });
      return { success: true };
    },

    requestWidgetRefresh(key) {
      widgetRefreshes.push(key);
    },

    httpClient: {
      async get(path) {
        httpCalls.push(path);
        if (path === '/house') {
          if (houses instanceof Error) {
            throw houses;
          }
          return houses;
        }
        throw new Error(`unexpected GET ${path}`);
      },
    },
  };
}
