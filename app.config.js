export default {
  expo: {
    name: "FinanceApp",
    slug: "finance-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#6366F1"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.financeapp.mobile",
      infoPlist: {
        NSFaceIDUsageDescription: "Usamos Face ID para proteger seus dados financeiros",
        NSCameraUsageDescription: "Usamos a câmera para escanear recibos e documentos"
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#6366F1"
      },
      package: "com.financeapp.mobile",
      permissions: [
        "USE_BIOMETRIC",
        "USE_FINGERPRINT",
        "CAMERA"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      supabaseUrl: process.env.SUPABASE_URL || "https://rsxrziczezxggpcoxcbu.supabase.co",
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzeHJ6aWN6ZXp4Z2dwY294Y2J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NDkzOTIsImV4cCI6MjA4NTEyNTM5Mn0.uGpgMbRi0g_qLmCShqLAo--9pnhN3t2gLR0zFmK15QY",
      openaiApiKey: process.env.OPENAI_API_KEY || "",
      eas: {
        projectId: "364becca-d5a5-4e95-8e4e-d7a51eca3aca"
      }
    },
    plugins: [
      "expo-secure-store",
      [
        "expo-local-authentication",
        {
          faceIDPermission: "Permitir $(PRODUCT_NAME) usar Face ID para autenticação segura."
        }
      ]
    ]
  }
};
