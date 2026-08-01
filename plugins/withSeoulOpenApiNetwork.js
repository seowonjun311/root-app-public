const {
  withAndroidManifest,
  withDangerousMod,
  withInfoPlist,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const NETWORK_SECURITY_FILE = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false" />
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">openapi.seoul.go.kr</domain>
  </domain-config>
</network-security-config>
`;

function withSeoulAndroidManifest(config) {
  return withAndroidManifest(config, (modConfig) => {
    const application =
      modConfig.modResults.manifest.application?.[0];

    if (!application) {
      throw new Error(
        'AndroidManifest application 항목을 찾지 못했습니다.'
      );
    }

    application.$ = application.$ || {};
    application.$['android:networkSecurityConfig'] =
      '@xml/seoul_open_api_network_security_config';

    return modConfig;
  });
}

function withSeoulAndroidNetworkFile(config) {
  return withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const xmlDirectory = path.join(
        modConfig.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml'
      );

      await fs.promises.mkdir(xmlDirectory, {
        recursive: true,
      });

      await fs.promises.writeFile(
        path.join(
          xmlDirectory,
          'seoul_open_api_network_security_config.xml'
        ),
        NETWORK_SECURITY_FILE,
        'utf8'
      );

      return modConfig;
    },
  ]);
}

function withSeoulIosNetworkException(config) {
  return withInfoPlist(config, (modConfig) => {
    const transportSecurity = {
      ...(modConfig.modResults.NSAppTransportSecurity || {}),
    };
    const exceptionDomains = {
      ...(transportSecurity.NSExceptionDomains || {}),
    };

    exceptionDomains['openapi.seoul.go.kr'] = {
      ...(exceptionDomains['openapi.seoul.go.kr'] || {}),
      NSIncludesSubdomains: true,
      NSTemporaryExceptionAllowsInsecureHTTPLoads: true,
      NSTemporaryExceptionMinimumTLSVersion: 'TLSv1.0',
    };

    transportSecurity.NSExceptionDomains =
      exceptionDomains;
    modConfig.modResults.NSAppTransportSecurity =
      transportSecurity;

    return modConfig;
  });
}

module.exports = function withSeoulOpenApiNetwork(config) {
  config = withSeoulAndroidManifest(config);
  config = withSeoulAndroidNetworkFile(config);
  config = withSeoulIosNetworkException(config);
  return config;
};
