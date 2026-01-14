import fs from 'fs';
import path from 'path';
import { getAgent } from './bsky';
import {isMutedWordsPref, MutedWord} from "@atproto/api/dist/client/types/app/bsky/actor/defs";

interface ListData {
    blacklist: string[];
    dictionary: string[];
    ignoreList: string[];
}

const LIST_FILE_PATH = path.join(process.cwd(), 'list.json');

let cachedBlacklist: string[] = [];
let lastLoaded: number = 0;
const CACHE_TTL_LOCAL = 60 * 1000; // 1 minute
const CACHE_TTL_API = 600 * 1000;

export function startBlacklistScheduler() {
    console.log('Starting Blacklist Scheduler...');

    // Initial load
    getBlacklist();

    // Schedule periodic updates (every 1 minute)
    let isLocalUpdateRunning = false;
    let isApiUpdateRunning = false;

    setInterval(async () => {
        if (isApiUpdateRunning) {
            console.log('Delaying local blacklist update due to API update in progress');
            return;
        }
        isLocalUpdateRunning = true;
        try {
            getBlacklist();
        } finally {
            isLocalUpdateRunning = false;
        }
    }, 60 * 1000);

    setInterval(async () => {
        if (isLocalUpdateRunning) {
            console.log('Delaying API blacklist update due to local update in progress');
            return;
        }
        isApiUpdateRunning = true;
        try {
            await getBlacklistFromBsky();
        } finally {
            isApiUpdateRunning = false;
        }
    }, 600 * 1000);
}

export function getBlacklist(): string[] {
    const now = Date.now();
    if (now - lastLoaded > CACHE_TTL_LOCAL) {
        try {
            const fileContent = fs.readFileSync(LIST_FILE_PATH, 'utf-8');
            const data: ListData = JSON.parse(fileContent);
            if (cachedBlacklist.length === 0 || cachedBlacklist.length < data.blacklist.length) {
                cachedBlacklist = data.blacklist || [];
            }
            lastLoaded = now;
            console.log(`Blacklist reloaded at ${new Date(now).toISOString()}. Count: ${cachedBlacklist.length}`);
        } catch (error) {
            console.error('Failed to load blacklist from list.json:', error);
            // Return existing cache if it exists, otherwise empty
        }
    }
    return cachedBlacklist;
}

export async function getBlacklistFromBsky() {
    const now = Date.now();
    if (now - lastLoaded > CACHE_TTL_API) {
        const agent = await getAgent();
        const preferences = await agent.app.bsky.actor.getPreferences().then(r => r.data.preferences);
        const mutedPref = preferences.filter(pref => pref.$type === 'app.bsky.actor.defs#mutedWordsPref');
        if (mutedPref.length === 0) {
            console.log('No muted words found');
            return cachedBlacklist;
        }
        console.log('Muted words found:', isMutedWordsPref(mutedPref[0]) ? mutedPref[0].items.length : 0);

        try {
            if (isMutedWordsPref(mutedPref[0])) {
                mutedPref[0].items.forEach((item: MutedWord) => {
                    if (item.targets.length == 1) {
                        cachedBlacklist.push('#' + item.value.toLowerCase());
                    } else {
                        cachedBlacklist.push(item.value.toLowerCase());
                    }
                });
                cachedBlacklist = [...new Set(cachedBlacklist)];
                cachedBlacklist = cachedBlacklist.filter(word => {
                    if (word.includes('#')) {
                        const wordWithoutPrefix = word.replace('#', '');
                        return !cachedBlacklist.includes(wordWithoutPrefix);
                    }
                    return true;
                })
                cachedBlacklist = cachedBlacklist.map(word => word.toLowerCase().trim()).sort((a, b) => b.localeCompare(a));
                console.log(`Blacklist updated at ${new Date(now).toISOString()}. Count: ${cachedBlacklist.length}`);
            }
        } catch (error) {
            console.error(`Error adding muted words to blacklist: ${error}`)
        }
        const fileContent = fs.readFileSync(LIST_FILE_PATH, 'utf-8');
        const data: ListData = JSON.parse(fileContent);
        data.blacklist = cachedBlacklist;
        fs.writeFileSync(LIST_FILE_PATH, JSON.stringify(data, null, 2));
    }
    return cachedBlacklist;
}