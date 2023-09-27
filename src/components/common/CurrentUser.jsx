import React, { useState, useEffect } from "react";
import { Moodie } from 'moodie';

import {
  Card,
  CardDescription,
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
                    <div className="grid grid-cols-4">
                        <div className="col-span-1 pt-9 pl-4">
                            <Moodie
                                size={40}
                                name={usr.username}
                                expression={{
                                    eye: 'normal',
                                    mouth: 'open',
                                }}
                                colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
                            />
                        </div>
                        <div className="col-span-3">
                            <CardHeader>
                            <CardTitle style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {usr.username}
                            </CardTitle>
                            <CardDescription>
                                {usr.chain}<br/>
                                {usr.id}
                            </CardDescription>
                            </CardHeader>
                        </div>
                    </div>
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