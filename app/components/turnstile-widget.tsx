"use client";

import { useEffect, useRef } from "react";

type TurnstileRenderOptions = {
  action?: string;
  callback?: (token: string) => void;
  "error-callback"?: () => void;
  "expired-callback"?: () => void;
  sitekey: string;
  size?: "compact" | "normal" | "flexible";
  theme?: "auto" | "dark" | "light";
};

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: TurnstileRenderOptions,
  ) => string;
  remove?: (widgetId: string) => void;
  reset: (widgetId?: string) => void;
};

type TurnstileWidgetRegistration = {
  action: string;
  containerId: string;
  onToken?: (token: string) => void;
  responseInput: HTMLInputElement;
  siteKey: string;
};

type TurnstileRegistry = {
  renderAll: () => void;
  reset: (containerId: string) => void;
  widgetIds: Map<string, string>;
  widgets: Map<string, TurnstileWidgetRegistration>;
};

declare global {
  interface Window {
    __timeRestrictedTurnstile?: TurnstileRegistry;
    onloadTurnstileCallback?: () => void;
    turnstile?: TurnstileApi;
  }
}

type TurnstileWidgetProps = {
  action: string;
  className?: string;
  containerId: string;
  onTokenChange?: (token: string) => void;
  resetSignal?: number;
  responseFieldName?: string;
  siteKey: string | undefined;
};

export function TurnstileWidget({
  action,
  className,
  containerId,
  onTokenChange,
  resetSignal,
  responseFieldName = "cf-turnstile-response",
  siteKey,
}: TurnstileWidgetProps) {
  const responseInputRef = useRef<HTMLInputElement>(null);
  const resetSignalRef = useRef(resetSignal);

  useEffect(() => {
    if (!siteKey || !responseInputRef.current) {
      return;
    }

    const registry = getTurnstileRegistry();

    registry.widgets.set(containerId, {
      action,
      containerId,
      onToken: onTokenChange,
      responseInput: responseInputRef.current,
      siteKey,
    });

    if (window.turnstile) {
      registry.renderAll();
    }

    return () => {
      const widgetId = registry.widgetIds.get(containerId);

      if (widgetId && window.turnstile?.remove) {
        window.turnstile.remove(widgetId);
      }

      registry.widgetIds.delete(containerId);
      registry.widgets.delete(containerId);
    };
  }, [action, containerId, onTokenChange, siteKey]);

  useEffect(() => {
    if (resetSignal === resetSignalRef.current) {
      return;
    }

    resetSignalRef.current = resetSignal;

    if (siteKey) {
      getTurnstileRegistry().reset(containerId);
    }
  }, [containerId, resetSignal, siteKey]);

  if (!siteKey) {
    return null;
  }

  return (
    <>
      <input ref={responseInputRef} name={responseFieldName} type="hidden" />
      <div id={containerId} className={className} />
    </>
  );
}

function getTurnstileRegistry(): TurnstileRegistry {
  if (window.__timeRestrictedTurnstile) {
    return window.__timeRestrictedTurnstile;
  }

  const registry: TurnstileRegistry = {
    renderAll: () => {
      if (!window.turnstile) {
        return;
      }

      for (const registration of registry.widgets.values()) {
        if (registry.widgetIds.has(registration.containerId)) {
          continue;
        }

        const container = document.getElementById(registration.containerId);

        if (!container) {
          continue;
        }

        const widgetId = window.turnstile.render(container, {
          action: registration.action,
          callback: (token: string) => {
            handleTurnstileToken(registration.containerId, token);
          },
          "error-callback": () => {
            handleTurnstileToken(registration.containerId, "");
          },
          "expired-callback": () => {
            handleTurnstileToken(registration.containerId, "");
          },
          sitekey: registration.siteKey,
          size: "compact",
          theme: "auto",
        });

        registry.widgetIds.set(registration.containerId, widgetId);
      }
    },
    reset: (containerId: string) => {
      const widgetId = registry.widgetIds.get(containerId);

      handleTurnstileToken(containerId, "");

      if (widgetId && window.turnstile) {
        window.turnstile.reset(widgetId);
      }
    },
    widgetIds: new Map(),
    widgets: new Map(),
  };

  window.__timeRestrictedTurnstile = registry;
  window.onloadTurnstileCallback = () => {
    registry.renderAll();
  };

  return registry;
}

function handleTurnstileToken(containerId: string, token: string) {
  const registration = window.__timeRestrictedTurnstile?.widgets.get(containerId);

  if (!registration) {
    return;
  }

  registration.responseInput.value = token;
  registration.onToken?.(token);
}
