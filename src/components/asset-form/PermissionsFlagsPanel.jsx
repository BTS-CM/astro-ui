import React from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { Separator } from "@/components/ui/separator";

import HoverInfo from "@/components/common/HoverInfo.tsx";
import AssetPermission from "@/components/common/AssetPermission.tsx";
import AssetFlag from "@/components/common/AssetFlag.tsx";

/**
 * Renders the Permissions and Flags panels side-by-side.
 *
 * @param {Object} props
 * @param {Array} props.permissions - Array of { id, alreadyDisabled?, perm, setPerm, flag, setFlag, forceDisabled? }
 * @param {Array} props.flags - Array of { id, alreadyDisabled?, flag, setFlag, permission }
 * @param {number} props.issuerPermissions - Computed issuer_permissions bitmask
 * @param {number} props.flagsValue - Computed flags bitmask
 * @param {Object} props.existingAssetData - Existing asset data (for edit mode display)
 */
export default function PermissionsFlagsPanel({
  permissions = [],
  flags = [],
  issuerPermissions,
  flagsValue,
  existingAssetData,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  return (
    <div className="col-span-2 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
        <div className="space-y-1.5">
          <HoverInfo
            content={t("AssetCommon:permissions.header_content")}
            header={t("AssetCommon:permissions.header")}
            type="header"
          />
          <div className="space-y-1 pt-1">
            {permissions.map((p) => (
              <AssetPermission
                key={p.id}
                alreadyDisabled={p.alreadyDisabled}
                forceDisabled={p.forceDisabled}
                id={p.id}
                allowedText={t(`AssetCommon:permissions.${p.id}.about`)}
                enabledInfo={t(`AssetCommon:permissions.${p.id}.enabledInfo`)}
                disabledText={t(`AssetCommon:permissions.${p.id}.about`)}
                disabledInfo={t(`AssetCommon:permissions.${p.id}.disabledInfo`)}
                permission={p.perm}
                setPermission={p.setPerm}
                flag={p.flag}
                setFlag={p.setFlag}
              />
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <HoverInfo
            content={t("AssetCommon:flags.header_content")}
            header={t("AssetCommon:flags.header")}
            type="header"
          />
          <div className="space-y-1 pt-1">
            {flags.map((f) => (
              <AssetFlag
                key={f.id}
                alreadyDisabled={f.alreadyDisabled}
                id={f.id}
                allowedText={t(`AssetCommon:flags.${f.key || f.id}.about`)}
                enabledInfo={t(`AssetCommon:flags.${f.key || f.id}.enabledInfo`)}
                disabledText={t(`AssetCommon:flags.${f.key || f.id}.about`)}
                disabledInfo={t(`AssetCommon:flags.${f.key || f.id}.disabledInfo`)}
                permission={f.permission}
                flag={f.flag}
                setFlag={f.setFlag}
              />
            ))}
          </div>
        </div>
      </div>

      {issuerPermissions !== undefined && flagsValue !== undefined && (
        <div className="text-sm leading-relaxed text-muted-foreground">
          <span className="font-mono">
            Issuer Permissions: {issuerPermissions}
          </span>
          {existingAssetData && (
            <span className="ml-3 font-mono">
              (existing: {existingAssetData.options?.issuer_permissions})
            </span>
          )}
          <br />
          <span className="font-mono">
            Flags: {flagsValue}
          </span>
          {existingAssetData && (
            <span className="ml-3 font-mono">
              (existing: {existingAssetData.options?.flags})
            </span>
          )}
        </div>
      )}

      <Separator className="mt-2 mb-1" />
    </div>
  );
}
