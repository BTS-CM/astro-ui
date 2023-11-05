import React, { useEffect, useState } from "react";
import { InView } from "react-intersection-observer";

import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/button";

import {
  Card,
  CardDescription,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import AccountSelect from "../AccountSelect.jsx";

export default function CurrentUser(properties) {
  const { usr } = properties;

  const [inView, setInView] = React.useState(false);
  if (!usr || !usr.id || !usr.id.length) {
    return null;
  }

  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (usr && usr.id && usr.id.length) {
      setOpen(false);
    }
  }, [usr]);

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
                        extra=""
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

        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
          }}
        >
          <DialogTrigger asChild>
            <Button className="h-5 p-3">Switch account/chain</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-white">
            <DialogHeader>
              <DialogTitle>Replacing current user</DialogTitle>
              <DialogDescription>
                Select a chain and account to proceed
              </DialogDescription>
            </DialogHeader>
            <AccountSelect />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
