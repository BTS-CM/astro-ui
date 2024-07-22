import React, { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";

import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { $currentUser } from "@/stores/users.ts";

import CurrentUser from "./common/CurrentUser.jsx";

export default function PageFooter(properties) {
  const { sourceURL } = properties;
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);

  const gradient = {
    backgroundImage: "var(--accent-gradient)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundSize: "400%",
    backgroundPosition: "0%",
  };

  return (
    <div className="container mx-auto mt-5 mb-5">
      <div className="grid grid-cols-1 mt-5">
        {usr && usr.username && usr.username.length ? <CurrentUser usr={usr} /> : null}
      </div>

      <div className="grid grid-cols-1 mt-3">
        <h4 className="text-center">
          <a
            style={gradient}
            href={sourceURL && sourceURL.startsWith("https://github.com/") ? sourceURL : "#"}
          >
            MIT {t("PageFooter:licensed")}
          </a>{" "}
          {t("PageFooter:built")}{" "}
          <a style={gradient} href="https://astro.build/">
            Astro
          </a>
          ,{" "}
          <a style={gradient} href="https://react.dev/">
            React
          </a>
          ,{" "}
          <a style={gradient} href="https://elysiajs.com/">
            ElysiaJS
          </a>{" "}
          &amp;{" "}
          <a style={gradient} href="https://bun.sh/">
            Bun
          </a>
          .
        </h4>
      </div>
    </div>
  );
}
