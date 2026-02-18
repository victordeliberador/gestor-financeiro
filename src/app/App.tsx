import React, { useState, useEffect } from "react";
import AppProvider from "./AppProvider";
import ErrorBoundary from "./ErrorBoundary";
import UnlockScreen from "../ui/UnlockScreen";
import { StorageManager, setSessionPassword } from "../data/storage";
import type { EncryptionConfig } from "../domain/types";

async function loadEncConfig(): Promise<EncryptionConfig | undefined> {
  try {
    const sm2 = new StorageManager();
    await sm2.initialize();
    const s = await sm2.loadSettings();
    return s.encryptionConfig;
  } catch { return undefined; }
}

const MainLayout = React.lazy(() => import("./MainLayout"));

export default function App() {
  const [cryptoState, setCryptoState] = useState<"loading"|"locked"|"unlocked">("loading");
  const [encConfig, setEncConfig] = useState<EncryptionConfig | undefined>();

  useEffect(() => {
    loadEncConfig().then(cfg => {
      setEncConfig(cfg);
      setCryptoState(cfg?.enabled ? "locked" : "unlocked");
    });
  }, []);

  const handleForgot = async () => {
    const sm2 = new StorageManager();
    await sm2.initialize();
    await sm2.clear();
    setSessionPassword(null);
    window.location.reload();
  };

  if (cryptoState === "loading") {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#94a3b8" }}>â³ Iniciando...</div>;
  }
  if (cryptoState === "locked" && encConfig) {
    return (
      <ErrorBoundary>
        <UnlockScreen saltHex={encConfig.saltHex} testToken={encConfig.testToken} onUnlock={() => setCryptoState("unlocked")} onForgotPassword={handleForgot} />
      </ErrorBoundary>
    );
  }
  return (
    <ErrorBoundary>
      <AppProvider>
        <React.Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#94a3b8" }}>Carregando...</div>}>
          <MainLayout />
        </React.Suspense>
      </AppProvider>
    </ErrorBoundary>
  );
}
