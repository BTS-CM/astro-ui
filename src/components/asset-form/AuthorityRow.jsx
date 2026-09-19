import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
} from "@/components/ui/card";
import { Avatar } from "@/components/Avatar.tsx";

const AVATAR_COLORS = [
  "#92A1C6",
  "#146A7C",
  "#F0AB3D",
  "#C271B4",
  "#C20D90",
];

export const FeeSharingWhitelistRow = React.memo(({ index, style, items, onRemove }) => {
  const res = items[index];
  if (!res) return null;

  return (
    <div style={{ ...style, paddingBottom: 8, overflow: "hidden" }} key={`acard-${res.id}`}>
      <Card className="ml-2 mr-2 py-0 gap-0 h-full overflow-hidden justify-center">
        <CardHeader className="px-4 py-2.5">
          <span className="grid grid-cols-12 items-center gap-2">
            <span className="col-span-1 flex items-center justify-center">
              <Avatar
                size={36}
                name={res.name}
                extra="Borrower"
                expression={{ eye: "normal", mouth: "open" }}
                colors={AVATAR_COLORS}
              />
            </span>
            <span className="col-span-10 ml-3 flex items-center leading-relaxed">
              #{index + 1}: {res.name} ({res.id})
            </span>
            <span className="col-span-1 flex items-center justify-center">
              <Button
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  onRemove(res.id);
                }}
              >
                ❌
              </Button>
            </span>
          </span>
        </CardHeader>
      </Card>
    </div>
  );
});

export const WhitelistAuthorityRow = React.memo(({ index, style, items, onRemove }) => {
  const res = items[index];
  if (!res) return null;

  return (
    <div style={{ ...style, paddingBottom: 8, overflow: "hidden" }} key={`acard-${res.id}`}>
      <Card className="ml-2 mr-2 py-0 gap-0 h-full overflow-hidden justify-center">
        <CardHeader className="px-4 py-2.5">
          <span className="grid grid-cols-12 items-center gap-2">
            <span className="col-span-1 flex items-center justify-center">
              <Avatar
                size={36}
                name={res.name}
                extra="Borrower"
                expression={{ eye: "normal", mouth: "open" }}
                colors={AVATAR_COLORS}
              />
            </span>
            <span className="col-span-10 ml-3 flex items-center leading-relaxed">
              #{index + 1}: {res.name} ({res.id})
            </span>
            <span className="col-span-1 flex items-center justify-center">
              <Button
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  onRemove(res.id);
                }}
              >
                ❌
              </Button>
            </span>
          </span>
        </CardHeader>
      </Card>
    </div>
  );
});

export const BlacklistAuthorityRow = React.memo(({ index, style, items, onRemove }) => {
  const res = items[index];
  if (!res) return null;

  return (
    <div style={{ ...style, paddingBottom: 8, overflow: "hidden" }} key={`acard-${res.id}`}>
      <Card className="ml-2 mr-2 py-0 gap-0 h-full overflow-hidden justify-center">
        <CardHeader className="px-4 py-2.5">
          <span className="grid grid-cols-12 items-center gap-2">
            <span className="col-span-1 flex items-center justify-center">
              <Avatar
                size={36}
                name={res.name ? res.name : ""}
                extra="Borrower"
                expression={{ eye: "normal", mouth: "open" }}
                colors={AVATAR_COLORS}
              />
            </span>
            <span className="col-span-10 ml-3 flex items-center leading-relaxed">
              {res.name
                ? `#${index + 1}: ${res.name} (${res.id})`
                : `#${index + 1}: ${res.id}`}
            </span>
            <span className="col-span-1 flex items-center justify-center">
              <Button
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  onRemove(res.id);
                }}
              >
                ❌
              </Button>
            </span>
          </span>
        </CardHeader>
      </Card>
    </div>
  );
});
