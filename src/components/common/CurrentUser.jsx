import React, { useState, useEffect } from "react";
import { Moodie } from 'moodie';

import {
  Card,
  CardDescription,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

import { eraseCurrentUser } from '../../stores/users.ts'

export default function CurrentUser(properties) {
    const { usr, resetCallback } = properties;

    return (
        <div className="flex justify-center">
            <div className="grid grid-cols-1 mt-3">
                <Card key={usr.id} className="w-full" style={{ transform: 'scale(0.75)' }}>
                    <CardHeader>
                        <CardTitle
                            style={{
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis' 
                            }}
                        >
                            <div className="grid grid-cols-3">
                                <div className="col-span-1 pr-3 pt-3">
                                    <Moodie
                                        size={50}
                                        name={usr.username}
                                        expression={{
                                            eye: 'normal',
                                            mouth: 'open',
                                        }}
                                        colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
                                    />
                                </div>
                                <div className="col-span-2 pl-3">
                                    <span className="text-xl">
                                        {usr.username}
                                    </span><br/>
                                    <span className="text-sm">
                                        {usr.chain}<br/>
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
    )
}