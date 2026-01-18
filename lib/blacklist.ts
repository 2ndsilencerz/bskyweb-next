import fs from 'fs';
import path from 'path';
import {getAgent} from './bsky';
import {isMutedWordsPref, MutedWord} from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import {Preferences} from "@atproto/api/src/client/types/app/bsky/actor/defs";
import {AtpAgent} from "@atproto/api";

interface ListData {
    blacklist: string[];
    dictionary: string[];
    ignoreList: string[];
}

const LIST_FILE_PATH = path.join(process.cwd(), 'list.json');

let cachedBlacklist: string[] = [];
let cachedDictionary: string[] = [];
let lastLoaded: number = 0;
const CACHE_TTL_LOCAL = 60 * 1000; // 1 minute

export function blacklist() {
    return cachedBlacklist;
}

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
            getBlacklistFromBsky().then().catch(e => console.error(`Error updating blacklist from Bsky: ${e}`));
        } finally {
            isApiUpdateRunning = false;
        }
    }, 600 * 1000);
}

export function addBlacklist(word: string) {
    cachedBlacklist.push(word.toLowerCase());
    getBlacklistFromBsky().finally(() =>
        console.log(`Blacklist updated at ${new Date().toISOString()}. Count: ${cachedBlacklist.length}`));
}

export function removeBlacklist(word: string) {
    cachedBlacklist = cachedBlacklist.filter(w => w.toLowerCase() !== word.toLowerCase());
    getBlacklistFromBsky().finally(() =>
        console.log(`Blacklist updated at ${new Date().toISOString()}. Count: ${cachedBlacklist.length}`));
}

export function getBlacklist(): string[] {
    const now = Date.now();
    if (now - lastLoaded > CACHE_TTL_LOCAL) {
        try {
            getBlacklistFromLocal();
            saveBlacklistToLocal({blacklist: cachedBlacklist, dictionary: cachedDictionary, ignoreList: []});
            console.log(
                `Blacklist from local file reloaded at ${new Date(now).toISOString()}. Count: ${cachedBlacklist.length}`
            )
            lastLoaded = now;
            console.log(`Blacklist reloaded at ${new Date(now).toISOString()}. Count: ${cachedBlacklist.length}`);
        } catch (error) {
            console.error('Failed to load blacklist from list.json:', error);
            // Return existing cache if it exists, otherwise empty
        }
    }
    return cachedBlacklist;
}

export async function getBlacklistFromBsky(): Promise<void> {
    const agent = await getAgent();
    const preferences = await agent.app.bsky.actor.getPreferences().then(r => r.data.preferences);
    const mutedPref = preferences.filter(pref => pref.$type === 'app.bsky.actor.defs#mutedWordsPref');
    if (mutedPref.length === 0) {
        console.log('No muted words found');
        return;
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
            cachedBlacklist = removeDuplicatesAndSort(cachedBlacklist);
            console.log(`Blacklist from Bsky updated at ${new Date().toISOString()}. Count: ${cachedBlacklist.length}`);
        } else {
            console.log('Fail to process muted words');
        }
    } catch (error) {
        console.error(`Error adding muted words to blacklist: ${error}`)
    }
    const data: ListData = readBlacklistFromLocal();
    data.blacklist.push(...cachedBlacklist);
    data.dictionary.push(...cachedDictionary);
    data.blacklist = removeDuplicatesAndSort(data.blacklist);
    data.dictionary = removeDuplicatesAndSort(data.dictionary);
    saveBlacklistToLocal(data);
    saveBlacklistToBsky(agent, preferences);
}

function getBlacklistFromLocal() {
    const data: ListData = readBlacklistFromLocal();
    cachedBlacklist.push(...data.blacklist);
    cachedBlacklist = removeDuplicatesAndSort(cachedBlacklist);
    cachedDictionary.push(...data.dictionary);
    cachedDictionary = removeDuplicatesAndSort(cachedDictionary);
}

function readBlacklistFromLocal(): ListData {
    const fileContent = fs.readFileSync(LIST_FILE_PATH, 'utf-8');
    return JSON.parse(fileContent);
}

function removeDuplicatesAndSort(array: string[]): string[] {
    array = array.filter(word => {
        word = word.toLowerCase();
        if (word.includes('#')) {
            const wordWithoutPrefix = word.replace('#', '')
            return !array.includes(wordWithoutPrefix)
        }
        return true
    });
    return [...new Set(array)].sort((a, b) => b.localeCompare(a)).map(word => word.toLowerCase());
}

function saveBlacklistToLocal(data: ListData) {
    fs.writeFileSync(LIST_FILE_PATH, JSON.stringify(data, null, 2));
}

function saveBlacklistToBsky(agent: AtpAgent, preferences: Preferences) {
    preferences.filter(pref => isMutedWordsPref(pref)).forEach(pref => {
        pref.items = []
        for (let word of cachedBlacklist) {
            if (word.includes('#')) {
                word = word.replace('#', '')
                pref.items.push({value: word.toLowerCase(), targets: ["tag"], actorTarget: "all"})
            } else {
                pref.items.push({value: word.toLowerCase(), targets: ["tag", "content"], actorTarget: "all"})
            }
        }
        pref.items.sort((a: MutedWord, b: MutedWord) => b.value.localeCompare(a.value))
    })
    agent.app.bsky.actor.putPreferences({preferences: preferences}).then((response) => {
        console.log(`[${new Date().toISOString()}] Mutes added successfully: ${JSON.stringify(response)}`)
    }).catch(e => console.error(`[${new Date().toISOString()}] Error updating muted words list: ${e}`))
}