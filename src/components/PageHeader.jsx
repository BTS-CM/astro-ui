import React, { useState, useEffect, useMemo } from "react";

import {
  CalendarIcon,
  EnvelopeClosedIcon,
  FaceIcon,
  GearIcon,
  PersonIcon,
  RocketIcon,
  HamburgerMenuIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

function MenuRow(properties) {
  const { url, text, icon } = properties;

  const [hover, setHover] = useState(false);
  const [isCurrentPage, setIsCurrentPage] = useState(false);

  useEffect(() => {
    setIsCurrentPage(window.location.pathname === url);
  }, [url]);

  const [clicked, setClicked] = useState(false);

  return (
    <a
      href={url}
      onClick={() => {
        setClicked(true);
      }}
    >
      <CommandItem
        onMouseEnter={() => {
          setHover(true);
        }}
        onMouseLeave={() => {
          setHover(false);
        }}
        style={{
          backgroundColor: hover || isCurrentPage ? "#F1F1F1" : "",
        }}
      >
        <span className="grid grid-cols-8 w-full">
          <span className="col-span-1">{icon}</span>
          <span className="col-span-6">{text}</span>
          <span className="col-span-1 text-right">
            {clicked ? <ReloadIcon className="ml-2 mt-1 animate-spin" /> : ""}
          </span>
        </span>
      </CommandItem>
    </a>
  );
}

export default function PageHeader(properties) {
  const [cardOpen, setCardOpen] = useState(false);

  return (
    <>
      <div className="container mx-auto mb-3">
        <div className="grid grid-cols-12">
          <div className="col-span-3">
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button>
                  <HamburgerMenuIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="mt-10 p-0" side="end">
                <Command className="rounded-lg border shadow-md">
                  <CommandInput placeholder="Type a command or search..." />
                  <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup heading="Exchanging funds">
                      <MenuRow url="/dex/index.html" text="Dex limit orders" icon="📈" />
                      <MenuRow url="/pool/index.html" text="Pool exchange" icon="💱" />
                      <MenuRow url="/transfer/index.html" text="Transfer assets" icon="💸" />
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Forms of debt">
                      <MenuRow
                        url="/borrow/index.html"
                        text="Borrow funds (credit offers)"
                        icon="🏦"
                      />
                      <MenuRow
                        url="/smartcoins/index.html"
                        text="Create debt (smartcoins)"
                        icon="💵"
                      />
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Overviews">
                      <MenuRow url="/portfolio/index.html" text="Portfolio" icon="💰" />
                      <MenuRow url="/featured/index.html" text="Top markets" icon="🏆" />
                      <MenuRow url="/deals/index.html" text="Credit deals" icon="🤝" />
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Settings">
                      <MenuRow url="/ltm/index.html" text="Buy LTM" icon="🏅" />
                    </CommandGroup>
                  </CommandList>
                </Command>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="col-span-9">
            <h2>
              Welcome to the{" "}
              <span
                style={{
                  backgroundImage: "var(--accent-gradient)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundSize: "400%",
                  backgroundPosition: "0%",
                }}
              >
                Bitshares Beet Astro
              </span>{" "}
              UI
            </h2>
          </div>
        </div>
      </div>
    </>
  );
}
