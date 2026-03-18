import * as React from "react";
import type OneSignalType from "react-onesignal";
import { useUser } from "@clerk/tanstack-react-start";
import { z } from "zod";

declare global {
  var __oneSignalReadyPromise: Promise<typeof OneSignalType> | undefined;
}

export function OneSignalSync() {
  const { isLoaded, user } = useUser();

  // Eagerly start init on mount so it's ready before auth resolves.
  React.useEffect(() => {
    void getOneSignal();
  }, []);

  React.useEffect(() => {
    if (isLoaded) {
      void getOneSignal().then((OneSignal) => {
        if (user !== null) {
          void OneSignal.login(user.id);
        } else {
          void OneSignal.logout();
        }
      });
    }
  }, [isLoaded, user]);

  return null;
}

function getOneSignal() {
  // Keep init state on globalThis so StrictMode remounts and HMR reuse one init.
  globalThis.__oneSignalReadyPromise ??= initializeOneSignal().catch((error) => {
    globalThis.__oneSignalReadyPromise = undefined;
    throw error;
  });
  return globalThis.__oneSignalReadyPromise;
}

function initializeOneSignal() {
  return import("react-onesignal").then(({ default: OneSignal }) =>
    OneSignal.init({
      appId: getOneSignalAppId(),
      allowLocalhostAsSecureOrigin: true,
      notifyButton: { enable: true } as NonNullable<
        Parameters<typeof OneSignal.init>[0]["notifyButton"]
      >,
    }).then(() => OneSignal),
  );
}

function getOneSignalAppId() {
  const key = "VITE_ONESIGNAL_APP_ID";
  return z
    .string({ message: `${key} is required` })
    .nonempty()
    .parse(import.meta.env[key]);
}
