import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hasActivePremiumSubscription } from "@/utils/subscription";

const TAWK_SCRIPT_ID = "tawk-chat-widget";
const TAWK_SRC = "https://embed.tawk.to/68fd5017511129194ce14d9a/1j8eo1nmv";

const MESSAGE_REGEX = /\d+\s*(message|new)/i;

const removeExistingWidget = () => {
  const script = document.getElementById(TAWK_SCRIPT_ID);
  if (script) {
    script.remove();
  }

  const container = document.getElementById("tawkchat-container");
  if (container) {
    container.remove();
  }

  const wrappers = document.querySelectorAll("[id^='tawkchat-']");
  wrappers.forEach((node) => node.parentElement?.removeChild(node));

  if ((window as any).Tawk_API) {
    delete (window as any).Tawk_API;
  }
  if ((window as any).Tawk_LoadStart) {
    delete (window as any).Tawk_LoadStart;
  }
};

const installTitleGuard = () => {
  const titleElement = document.querySelector("title");
  if (!titleElement) return () => {};

  let originalTitle = titleElement.textContent || document.title;
  const originalDescriptor = Object.getOwnPropertyDescriptor(document, "title");

  const descriptor: PropertyDescriptor = {
    configurable: true,
    get() {
      return titleElement.textContent || "";
    },
    set(val: string) {
      if (!val.includes("message") && !MESSAGE_REGEX.test(val)) {
        titleElement.textContent = val;
        originalTitle = val;
      }
    },
  };

  Object.defineProperty(document, "title", descriptor);

  const observer = new MutationObserver(() => {
    const newTitle = titleElement.textContent || "";
    if (newTitle.includes("message") || MESSAGE_REGEX.test(newTitle)) {
      titleElement.textContent = originalTitle;
    } else {
      originalTitle = newTitle;
    }
  });

  observer.observe(titleElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  return () => {
    observer.disconnect();
    if (originalDescriptor) {
      Object.defineProperty(document, "title", originalDescriptor);
    } else {
      delete (document as any).title;
    }
  };
};

const loadWidget = () => {
  if (document.getElementById(TAWK_SCRIPT_ID)) {
    return;
  }

  (window as any).Tawk_LoadStart = new Date();

  const script = document.createElement("script");
  script.id = TAWK_SCRIPT_ID;
  script.async = true;
  script.src = TAWK_SRC;
  script.charset = "UTF-8";
  script.setAttribute("crossorigin", "*");
  document.body.appendChild(script);
};

const TawkWidget = () => {
  const cleanupTitleGuardRef = useRef<() => void>(() => {});
  const loadingRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const checkAndToggleWidget = async () => {
      if (!isMounted || loadingRef.current) return;
      loadingRef.current = true;

      try {
        const isPremium = await hasActivePremiumSubscription();
        if (isPremium) {
          if (!document.getElementById(TAWK_SCRIPT_ID)) {
            cleanupTitleGuardRef.current = installTitleGuard();
            loadWidget();
          }
        } else {
          cleanupTitleGuardRef.current();
          cleanupTitleGuardRef.current = () => {};
          removeExistingWidget();
        }
      } finally {
        loadingRef.current = false;
      }
    };

    checkAndToggleWidget();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAndToggleWidget();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      cleanupTitleGuardRef.current();
      removeExistingWidget();
    };
  }, []);

  return null;
};

export default TawkWidget;

