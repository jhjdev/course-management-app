module.exports = {
name: "female-invest",
slug: "female-invest",
version: "1.0.0",
orientation: "portrait",
scheme: "female-invest",
extra: {
    eas: {
    projectId: "female-invest"
    }
},
updates: {
    url: "https://u.expo.dev/your-project-id"
},
runtimeVersion: {
    policy: "appVersion"
},
assetBundlePatterns: ["**/*"],
ios: {
    supportsTablet: true,
    bundleIdentifier: "com.femaleinvest.app"
},
android: {
    package: "com.femaleinvest.app"
}
};
