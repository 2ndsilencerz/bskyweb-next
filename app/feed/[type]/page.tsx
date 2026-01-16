'use client'

import LoadPost from "@/app/feed/loadPost";
import {use} from "react";

export default function ForYou({params}: { params: { type: string } }) {
    // const path = req.url.split('/');
    // console.log(`Path: ${path}`);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const { type: rawType } = use(params);
    const type = rawType || 'foryou';

    return LoadPost(type);
}