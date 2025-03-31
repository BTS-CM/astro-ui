// src/components/CustomAuthority/ExistingAuthoritiesList.jsx
import React from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js"; // Use standard import
import { FixedSizeList as List } from "react-window";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import ExternalLink from "../common/ExternalLink.jsx";

export default function ExistingAuthoritiesList({
  authorities,
  selectedAuthorityId,
  setSelectedAuthorityId,
  opTypes,
}) {
  // Use standard hook instance
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });

  const AuthorityRow = ({ index, style }) => {
    const auth = authorities[index];
    if (!auth) return null;
    const operationName =
      opTypes[auth.operation_type] || `Unknown (${auth.operation_type})`;
    const isValidDate =
      auth.valid_to && !isNaN(new Date(auth.valid_to + "Z").getTime());
    const validToStr = isValidDate
      ? new Date(auth.valid_to + "Z").toLocaleDateString()
      : "Invalid Date";

    return (
      <div
        style={{ ...style, paddingRight: "8px", boxSizing: "border-box" }}
        className="flex items-center space-x-2 border-b"
      >
        <RadioGroupItem
          value={auth.id}
          id={auth.id}
          checked={selectedAuthorityId === auth.id}
        />
        <Label htmlFor={auth.id} className="flex-grow cursor-pointer p-2">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-x-2 gap-y-1">
            <span className="truncate text-xs sm:text-sm" title={auth.id}>
              {typeof ExternalLink !== "undefined" ? (
                <ExternalLink
                  classnamecontents="text-blue-500 hover:underline"
                  type="text"
                  text={auth.id}
                  hyperlink={`https://blocksights.info/#/objects/${auth.id}`}
                />
              ) : (
                auth.id
              )}
            </span>
            <span className="text-xs truncate" title={operationName}>
              {operationName}
            </span>
            {/* Use namespaced keys */}
            <span className="text-xs">
              {t("CustomAuthority:listEnabled")}: {auth.enabled ? "Yes" : "No"}
            </span>
            <span className="text-xs truncate" title={auth.valid_to}>
              {t("CustomAuthority:listValidTo")}: {validToStr}
            </span>
          </div>
        </Label>
      </div>
    );
  };

  return (
    <div className="mb-4">
      {/* Use namespaced keys */}
      <Label className="text-lg font-semibold">
        {t("CustomAuthority:selectAuthorityLabel")}
      </Label>
      <ScrollArea className="h-48 w-full rounded-md border mt-2 bg-muted/30">
        <RadioGroup
          value={selectedAuthorityId || ""}
          onValueChange={setSelectedAuthorityId}
        >
          {authorities.length > 0 ? (
            <List
              height={190}
              itemCount={authorities.length}
              itemSize={48}
              width="100%"
            >
              {AuthorityRow}
            </List>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="p-4 text-sm text-muted-foreground">
                {t("CustomAuthority:noExistingAuthorities")}
              </p>
            </div>
          )}
        </RadioGroup>
      </ScrollArea>
    </div>
  );
}
