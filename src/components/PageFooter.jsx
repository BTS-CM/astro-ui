import React from "react";
import { useTranslation } from "react-i18next";

import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import ExternalLink from "./common/ExternalLink.jsx";

export default function PageFooter(properties) {
  const { sourceURL } = properties;
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });

  return (
    <div className="container mx-auto mt-5 mb-5">
      <div className="grid grid-cols-1 mt-3">
        <h4 className="text-center">
          <ExternalLink
            type="text"
            text={`MIT ${t("PageFooter:licensed")}`}
            gradient
            hyperlink={
              sourceURL && sourceURL.startsWith("https://github.com/")
                ? sourceURL
                : "#"
            }
          />
          {` ${t("PageFooter:built")} `}
          <ExternalLink
            type="text"
            text="Astro"
            gradient
            hyperlink={`https://astro.build/`}
          />
          {", "}
          <ExternalLink
            type="text"
            text="React"
            gradient
            hyperlink={`https://react.dev/`}
          />
          {" & "}
          <ExternalLink
            type="text"
            text="Electron"
            gradient
            hyperlink={`https://www.electronjs.org/`}
          />
        </h4>

        <h3 className="text-muted-foreground text-center">
          {t("PageHeader:usage")}
          <ExternalLink
            type="text"
            text="Beet"
            gradient
            hyperlink={"https://github.com/bitshares/beet"}
          />
          {` & `}
          <ExternalLink
            type="text"
            text="BeetEOS"
            gradient
            hyperlink="https://github.com/beetapp/beeteos"
          />
          .
        </h3>
      </div>
    </div>
  );
}
