import * as React from "react";
import type OneSignalType from "react-onesignal";
import { useConvexAuth, useQuery } from "convex/react";
import { z } from "zod";
import { api } from "../../convex/_generated/api";

declare global {
  var __oneSignalReadyPromise: Promise<typeof OneSignalType> | undefined;
}

export function OneSignalSync() {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  const tokenIdentifier = useQuery(api.auth.getMyTokenIdentifier);

  React.useEffect(() => {
    void getOneSignal();
  }, []);

  React.useEffect(() => {
    if (!isAuthLoading) {
      if (!isAuthenticated || tokenIdentifier === null) {
        void getOneSignal().then((OneSignal) => {
          void OneSignal.logout();
        });
      } else if (tokenIdentifier !== undefined) {
        void getOneSignal().then((OneSignal) => {
          void OneSignal.login(tokenIdentifier);
        });
      }
    }
  }, [isAuthLoading, isAuthenticated, tokenIdentifier]);

  return null;
}

export function getOneSignal() {
  globalThis.__oneSignalReadyPromise ??= initializeOneSignal().catch(
    (error) => {
      globalThis.__oneSignalReadyPromise = undefined;
      throw error;
    },
  );
  return globalThis.__oneSignalReadyPromise;
}

function initializeOneSignal() {
  return import("react-onesignal").then(({ default: OneSignal }) =>
    OneSignal.init({
      appId: getOneSignalAppId(),
      safari_web_id: `web.onesignal.auto.${getOneSignalAppId()}`,
      allowLocalhostAsSecureOrigin: true,
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
