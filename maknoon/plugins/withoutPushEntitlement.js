// Prayer alerts are LOCAL notifications scheduled on the device: no server sends anything, so the
// app needs no remote-push capability. expo-notifications adds the `aps-environment` entitlement by
// default, which also requires a provisioning profile with Push Notifications; this removes it.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (c) => {
    delete c.modResults['aps-environment'];
    return c;
  });
};
