import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { List } from "react-window";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import HoverInfo from "@/components/common/HoverInfo.tsx";
import ExternalLink from "@/components/common/ExternalLink.jsx";
import MediaRow from "./MediaRow.jsx";

export default function NFTSection({
  enabledNFT,
  setEnabledNFT,
  nftMedia,
  setNFTMedia,
  newMediaType,
  setNewMediaType,
  newMediaUrl,
  setNewMediaUrl,
  title,
  setTitle,
  artist,
  setArtist,
  narrative,
  setNarrative,
  tags,
  setTags,
  type,
  setType,
  attestation,
  setAttestation,
  acknowledgements,
  setAcknowledgements,
  holderLicense,
  setHolderLicense,
  license,
  setLicense,
  hideToggle,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  const mediaRowProps = useMemo(() => ({ nftMedia, setNFTMedia }), [nftMedia, setNFTMedia]);

  return (
    <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
      {!hideToggle && (
        <>
          <HoverInfo
            content={t("AssetCommon:nft.main_header_content")}
            header={t("AssetCommon:nft.main_header")}
            type="header"
          />
          <div className={`text-right mb-${!enabledNFT ? 5 : 1}`}>
            {!enabledNFT ? (
              <Button
                variant="outline"
                onClick={() => setEnabledNFT(true)}
                className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-background rounded-md group-hover:bg-opacity-0"
              >
                {t("AssetCommon:nft.disabled")}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setEnabledNFT(false)}
              >
                {t("AssetCommon:nft.enabled")}
              </Button>
            )}
          </div>
        </>
      )}
      {enabledNFT ? (
        <>
          <div className="col-span-2 mb-6 space-y-4">
            <Label>
              {t("AssetCommon:nft.currentIPFSFiles", {
                count: nftMedia.length,
              })}
            </Label>
            <Label>{t("AssetCommon:nft.supportedFiletypes")}</Label>
            <br />
            <Dialog
              onOpenChange={(open) => {
                if (!open) {
                  setNewMediaUrl("");
                }
              }}
            >
              <DialogTrigger>
                <Button className="h-8 mt-3" variant="outline">
                  {t("AssetCommon:nft.modifyMultimediaContents")}
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card w-full max-w-4xl">
                <DialogHeader>
                  <DialogTitle>
                    {t("AssetCommon:nft.modifyingMultimediaContents")}
                  </DialogTitle>
                </DialogHeader>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {t("AssetCommon:nft.currentIPFSMedia")}
                    </CardTitle>
                    <CardDescription>
                      {t("AssetCommon:nft.referencesIPFSObjects", {
                        count: nftMedia.length,
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!nftMedia || !nftMedia.length ? (
                      <p>{t("AssetCommon:nft.noIPFSMediaFound")}</p>
                    ) : (
                      <>
                        <div className="grid grid-cols-4">
                          <div className="col-span-1">
                            {t("AssetCommon:nft.type")}
                          </div>
                          <div className="col-span-1">
                            {t("AssetCommon:nft.contentIdentifier")}
                          </div>
                          <div className="col-span-1">
                            {t("AssetCommon:nft.filename")}
                          </div>
                          <div className="col-span-1">
                            {t("AssetCommon:nft.delete")}
                          </div>
                        </div>
                        <div className="w-full h-[300px]">
                          <List
                            height={300}
                            width="100%"
                            rowComponent={MediaRow}
                            rowCount={nftMedia.length}
                            rowHeight={25}
                            rowProps={mediaRowProps}
                          />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>
                      {t("AssetCommon:nft.addNewIPFSMedia")}
                    </CardTitle>
                    <CardDescription>
                      {t("AssetCommon:nft.noIPFSGateway")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4">
                      <div className="col-span-3 mr-3">
                        <Input
                          placeholder={t(
                            "AssetCommon:nft.mediaURLPlaceholder"
                          )}
                          type="text"
                          onInput={(e) =>
                            setNewMediaUrl(e.currentTarget.value)
                          }
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter" &&
                              newMediaUrl &&
                              newMediaType
                            ) {
                              const temp_urls = nftMedia.map(
                                (x) => x.url
                              );
                              if (temp_urls.includes(newMediaUrl)) {
                                setNewMediaUrl("");
                                return;
                              }

                              setNFTMedia(
                                nftMedia && nftMedia.length
                                  ? [
                                      ...nftMedia,
                                      {
                                        url: newMediaUrl,
                                        type: newMediaType,
                                      },
                                    ]
                                  : [
                                      {
                                        url: newMediaUrl,
                                        type: newMediaType,
                                      },
                                    ]
                              );
                              setNewMediaUrl("");
                            }
                          }}
                          value={newMediaUrl}
                        />
                      </div>
                      <div className="col-span-1">
                        <Select onValueChange={setNewMediaType}>
                          <SelectTrigger className="w-[105px]">
                            <SelectValue
                              placeholder={t(
                                "AssetCommon:nft.fileTypePlaceholder"
                              )}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>
                                {t("AssetCommon:nft.imageFormats")}
                              </SelectLabel>
                              <SelectItem value="PNG">PNG</SelectItem>
                              <SelectItem value="WEBP">WEBP</SelectItem>
                              <SelectItem value="JPEG">JPEG</SelectItem>
                              <SelectItem value="GIF">GIF</SelectItem>
                              <SelectItem value="TIFF">TIFF</SelectItem>
                              <SelectItem value="BMP">BMP</SelectItem>
                              <SelectLabel>
                                {t("AssetCommon:nft.audioFormats")}
                              </SelectLabel>
                              <SelectItem value="MP3">MP3</SelectItem>
                              <SelectItem value="MP4">MP4</SelectItem>
                              <SelectItem value="M4A">M4A</SelectItem>
                              <SelectItem value="OGG">OGG</SelectItem>
                              <SelectItem value="FLAC">FLAC</SelectItem>
                              <SelectItem value="WAV">WAV</SelectItem>
                              <SelectItem value="WMA">WMA</SelectItem>
                              <SelectItem value="AAC">AAC</SelectItem>
                              <SelectLabel>
                                {t("AssetCommon:nft.videoFormats")}
                              </SelectLabel>
                              <SelectItem value="WEBM">WEBM</SelectItem>
                              <SelectItem value="MOV">MOV</SelectItem>
                              <SelectItem value="QT">QT</SelectItem>
                              <SelectItem value="AVI">AVI</SelectItem>
                              <SelectItem value="WMV">WMV</SelectItem>
                              <SelectItem value="MPEG">MPEG</SelectItem>
                              <SelectLabel>
                                {t("AssetCommon:nft.documentFormats")}
                              </SelectLabel>
                              <SelectItem value="PDF">PDF</SelectItem>
                              <SelectItem value="DOCX">DOCX</SelectItem>
                              <SelectItem value="ODT">ODT</SelectItem>
                              <SelectItem value="XLSX">XLSX</SelectItem>
                              <SelectItem value="ODS">ODS</SelectItem>
                              <SelectItem value="PPTX">PPTX</SelectItem>
                              <SelectItem value="TXT">TXT</SelectItem>
                              <SelectLabel>
                                {t("AssetCommon:nft.threeDFormats")}
                              </SelectLabel>
                              <SelectItem value="OBJ">OBJ</SelectItem>
                              <SelectItem value="FBX">FBX</SelectItem>
                              <SelectItem value="GLTF">GLTF</SelectItem>
                              <SelectItem value="3DS">3DS</SelectItem>
                              <SelectItem value="STL">STL</SelectItem>
                              <SelectItem value="COLLADA">COLLADA</SelectItem>
                              <SelectItem value="3MF">3MF</SelectItem>
                              <SelectItem value="BLEND">BLEND</SelectItem>
                              <SelectItem value="SKP">SKP</SelectItem>
                              <SelectItem value="VOX">VOX</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-4">
                        {newMediaType &&
                        newMediaType.length &&
                        newMediaUrl &&
                        newMediaUrl.length ? (
                          <Button
                            className="mt-3"
                            onClick={() => {
                              const temp_urls = nftMedia.map(
                                (x) => x.url
                              );
                              if (temp_urls.includes(newMediaUrl)) {
                                setNewMediaUrl("");
                                return;
                              }

                              setNFTMedia([
                                ...nftMedia,
                                {
                                  url: newMediaUrl,
                                  type: newMediaType,
                                },
                              ]);
                              setNewMediaUrl("");
                            }}
                          >
                            {t("AssetCommon:nft.submit")}
                          </Button>
                        ) : (
                          <Button className="mt-3" disabled>
                            {t("AssetCommon:nft.submit")}
                          </Button>
                        )}
                        <Dialog>
                          <DialogTrigger>
                            <Button className="mt-3 ml-3">
                              {t(
                                "AssetCommon:nft.ipfsHostingSolutions"
                              )}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-card">
                            <DialogHeader>
                              <DialogTitle>
                                {t(
                                  "AssetCommon:nft.ipfsHostingSolutions"
                                )}
                              </DialogTitle>
                              <DialogDescription>
                                {t(
                                  "AssetCommon:nft.ipfsHostingDescription"
                                )}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid grid-cols-3 gap-3">
                              <ExternalLink
                                classnamecontents="hover:text-[hsl(var(--accent-1-fg))] dark:hover:text-[hsl(var(--accent-1-fg))]"
                                type="button"
                                text={"Pinata.cloud"}
                                hyperlink={
                                  "https://www.pinata.cloud/"
                                }
                              />
                              <ExternalLink
                                classnamecontents="hover:text-[hsl(var(--accent-1-fg))] dark:hover:text-[hsl(var(--accent-1-fg))]"
                                type="button"
                                text={"NFT.storage"}
                                hyperlink={"https://nft.storage/"}
                              />
                              <ExternalLink
                                classnamecontents="hover:text-[hsl(var(--accent-1-fg))] dark:hover:text-[hsl(var(--accent-1-fg))]"
                                type="button"
                                text={"Web3.storage"}
                                hyperlink={"https://web3.storage/"}
                              />
                              <ExternalLink
                                classnamecontents="hover:text-[hsl(var(--accent-1-fg))] dark:hover:text-[hsl(var(--accent-1-fg))]"
                                type="button"
                                text={"Fleek.co"}
                                hyperlink={
                                  "https://fleek.co/ipfs-gateway/"
                                }
                              />
                              <ExternalLink
                                classnamecontents="hover:text-[hsl(var(--accent-1-fg))] dark:hover:text-[hsl(var(--accent-1-fg))]"
                                type="button"
                                text={"Infura.io"}
                                hyperlink={
                                  "https://infura.io/product/ipfs"
                                }
                              />
                              <ExternalLink
                                classnamecontents="hover:text-[hsl(var(--accent-1-fg))] dark:hover:text-[hsl(var(--accent-1-fg))]"
                                type="button"
                                text={"StorJ"}
                                hyperlink={
                                  "https://landing.storj.io/permanently-pin-with-storj-dcs"
                                }
                              />
                              <ExternalLink
                                classnamecontents="hover:text-[hsl(var(--accent-1-fg))] dark:hover:text-[hsl(var(--accent-1-fg))]"
                                type="button"
                                text={"Eternum.io"}
                                hyperlink={"https://www.eternum.io/"}
                              />
                              <ExternalLink
                                classnamecontents="hover:text-[hsl(var(--accent-1-fg))] dark:hover:text-[hsl(var(--accent-1-fg))]"
                                type="button"
                                text={"IPFS Docs"}
                                hyperlink={
                                  "https://blog.ipfs.io/2021-04-05-storing-nfts-on-ipfs/"
                                }
                              />
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </DialogContent>
            </Dialog>
          </div>
          <div className="col-span-2 mb-6 space-y-5">
            <HoverInfo
              content={t("AssetCommon:nft.header_content")}
              header={t("AssetCommon:nft.header")}
              type="header"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1 space-y-5">
                <div className="space-y-2">
                  <HoverInfo
                    content={t("AssetCommon:nft.NFTTitleContent")}
                    header={t("AssetCommon:nft.NFTTitleHeader")}
                  />
                  <Input
                    placeholder={t("AssetCommon:nft.TitlePlaceholder")}
                    value={title}
                    type="text"
                    onInput={(e) => setTitle(e.currentTarget.value)}
                  />
                </div>
                <div className="space-y-2">
                  <HoverInfo
                    content={t("AssetCommon:nft.NFTArtistContent")}
                    header={t("AssetCommon:nft.NFTArtistHeader")}
                  />
                  <Input
                    placeholder={t("AssetCommon:nft.ArtistPlaceholder")}
                    value={artist}
                    type="text"
                    onInput={(e) => setArtist(e.currentTarget.value)}
                  />
                </div>
                <div className="space-y-2">
                  <HoverInfo
                    content={t("AssetCommon:nft.NFTNarrativeContent")}
                    header={t("AssetCommon:nft.NFTNarrativeHeader")}
                  />
                  <Input
                    placeholder={t(
                      "AssetCommon:nft.NarrativePlaceholder"
                    )}
                    value={narrative}
                    type="text"
                    onInput={(e) => setNarrative(e.currentTarget.value)}
                  />
                </div>
                <div className="space-y-2">
                  <HoverInfo
                    content={t("AssetCommon:nft.NFTTagsContent")}
                    header={t("AssetCommon:nft.NFTTagsHeader")}
                  />
                  <Input
                    placeholder={t("AssetCommon:nft.TagsPlaceholder")}
                    value={tags}
                    type="text"
                    onInput={(e) => setTags(e.currentTarget.value)}
                  />
                </div>
                <div className="space-y-2">
                  <HoverInfo
                    content={t("AssetCommon:nft.NFTTypeContent")}
                    header={t("AssetCommon:nft.NFTTypeHeader")}
                  />
                  <Input
                    placeholder={t("AssetCommon:nft.TypePlaceholder")}
                    value={type}
                    type="text"
                    onInput={(e) => setType(e.currentTarget.value)}
                  />
                </div>
              </div>
              <div className="col-span-1 space-y-5">
                <div className="space-y-2">
                  <HoverInfo
                    content={t("AssetCommon:nft.NFTAttestationContent")}
                    header={t("AssetCommon:nft.NFTAttestationHeader")}
                  />
                  <Input
                    placeholder={t(
                      "AssetCommon:nft.AttestationPlaceholder"
                    )}
                    value={attestation}
                    type="text"
                    onInput={(e) =>
                      setAttestation(e.currentTarget.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <HoverInfo
                    content={t(
                      "AssetCommon:nft.NFTAcknowledgementsContent"
                    )}
                    header={t(
                      "AssetCommon:nft.NFTAcknowledgementsHeader"
                    )}
                  />
                  <Input
                    placeholder={t(
                      "AssetCommon:nft.AcknowledgementsPlaceholder"
                    )}
                    value={acknowledgements}
                    type="text"
                    onInput={(e) =>
                      setAcknowledgements(e.currentTarget.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <HoverInfo
                    content={t(
                      "AssetCommon:nft.NFTHolderLicenseContent"
                    )}
                    header={t("AssetCommon:nft.NFTHolderLicenseHeader")}
                  />
                  <Input
                    placeholder={t(
                      "AssetCommon:nft.HolderLicensePlaceholder"
                    )}
                    value={holderLicense}
                    type="text"
                    onInput={(e) =>
                      setHolderLicense(e.currentTarget.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <HoverInfo
                    content={t("AssetCommon:nft.NFTLicenseContent")}
                    header={t("AssetCommon:nft.NFTLicenseHeader")}
                  />
                  <Input
                    placeholder={t(
                      "AssetCommon:nft.LicensePlaceholder"
                    )}
                    value={license}
                    type="text"
                    onInput={(e) => setLicense(e.currentTarget.value)}
                  />
                </div>
              </div>
            </div>
            <Separator className="mt-6 mb-1" />
          </div>
        </>
      ) : null}
    </div>
  );
}
