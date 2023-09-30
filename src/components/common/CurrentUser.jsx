import React, { useEffect, useState } from "react";
import { InView } from "react-intersection-observer";

import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { $currentUser } from "../../stores/users";

import {
  Card,
  CardDescription,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function CurrentUser(properties) {
  const { resetCallback } = properties;

  const [usr, setUsr] = useState();
  useEffect(() => {
    const unsubscribe = $currentUser.subscribe((value) => {
      setUsr(value);
    });
    return unsubscribe;
  }, [$currentUser]);

  const [inView, setInView] = React.useState(false);
  if (!usr || !usr.id || !usr.id.length) {
    return null;
  }

  return (
    <div className="flex justify-center">
      <div className="grid grid-cols-1 mt-3">
        <Card
          key={usr.id}
          className="w-full"
          style={{ transform: "scale(0.75)" }}
        >
          <CardHeader>
            <CardTitle
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              <div className="grid grid-cols-3">
                <div className="col-span-1 pr-3 pt-3">
                  <InView onChange={setInView}>
                    {inView ? (
                      <Avatar
                        size={50}
                        name={usr.username}
                        expression={{
                          eye: "normal",
                          mouth: "open",
                        }}
                        colors={[
                          "#92A1C6",
                          "#146A7C",
                          "#F0AB3D",
                          "#C271B4",
                          "#C20D90",
                        ]}
                      />
                    ) : null}
                  </InView>
                </div>
                <div className="col-span-2 pl-3">
                  <span className="text-xl">{usr.username}</span>
                  <br />
                  <span className="text-sm">
                    {usr.chain}
                    <br />
                    {usr.id}
                  </span>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>
        <Button
          className="mt-1"
          onClick={() => {
            resetCallback();
          }}
        >
          Switch account/chain
        </Button>
      </div>
    </div>
  );
}
