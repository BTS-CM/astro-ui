import React from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function CardRowPlaceholder(properties) {
  return (
    <div className="col-span-1" key={`${properties.dialogtitle}`}>
      <div className="grid grid-cols-10">
        <div className="col-span-4">{properties.title}:</div>
        <div className="col-span-5 mr-2">
          <Badge variant="outline" className="pl-2 pb-1 w-full">
            {" "}
          </Badge>
        </div>
        <div className="col-span-1">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 text-gray-400"
          >
            ?
          </Button>
        </div>
      </div>
    </div>
  );
}
