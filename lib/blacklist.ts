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
const CACHE_TTL_LOCAL = 60 * 1000; // 1 minute

type BlacklistState = {
    cachedBlacklist: string[];
    cachedDictionary: string[];
    lastLoaded: number;
    schedulerStarted: boolean;
    instanceId: string;
    isLocalUpdateRunning: boolean;
    isApiUpdateRunning: boolean;
};

function getState(): BlacklistState {
    const g = globalThis as unknown as { __blacklistState?: BlacklistState };
    if (!g.__blacklistState) {
        g.__blacklistState = {
            cachedBlacklist: [],
            cachedDictionary: [],
            lastLoaded: 0,
            schedulerStarted: false,
            isLocalUpdateRunning: false,
            isApiUpdateRunning: false,
            instanceId: Math.random().toString(36).substring(2, 15)
        };
    }
    return g.__blacklistState;
}

export function startBlacklistScheduler() {
    const state = getState();
    if (state.schedulerStarted && state.cachedBlacklist?.length > 0) return;
    state.schedulerStarted = true;

    console.log('Starting Blacklist Scheduler...');
    getBlacklist();

    setInterval(() => {
        if (state.isApiUpdateRunning) {
            console.log('Delaying local blacklist update due to API update in progress');
            return;
        }
        state.isLocalUpdateRunning = true;
        try {
            console.log('Updating blacklist from local...');
            getBlacklist();
        } finally {
            state.isLocalUpdateRunning = false;
        }
    }, 60 * 1000);

    setInterval(() => {
        if (state.isLocalUpdateRunning) {
            console.log('Delaying API blacklist update due to local update in progress');
            return;
        }
        state.isApiUpdateRunning = true;
        try {
            console.log('Updating blacklist from Bsky...');
            getBlacklistFromBsky().catch(e => console.error(`Error updating blacklist from Bsky: ${e}`));
        } finally {
            state.isApiUpdateRunning = false;
        }
    }, 10 * 60 * 1000);
}

export function addBlacklist(word: string) {
    const state = getState();
    state.cachedBlacklist.push(word.toLowerCase());
    getBlacklistFromBsky().finally(() =>
        console.log(`Blacklist updated. Count: ${state.cachedBlacklist.length}`));
}

export function removeBlacklist(word: string) {
    const state = getState();
    getBlacklistFromBsky(true, word).finally(() =>
        console.log(`Blacklist updated. Count: ${state.cachedBlacklist.length}`));
}

export function getBlacklist(): string[] {
    const state = getState();
    const now = Date.now();
    if (now - state.lastLoaded > CACHE_TTL_LOCAL) {
        try {
            getBlacklistFromLocalAndMergeWithCache();
            state.lastLoaded = now;
        } catch (error) {
            console.error('Failed to load blacklist from list.json:', error);
        }
    }
    return state.cachedBlacklist;
}

export function getDictionary(): string[] {
    return getState().cachedDictionary;
}

export async function getBlacklistFromBsky(isRemove?: boolean, word?: string): Promise<void> {
    const state = getState();

    if (isRemove && word) {
        console.log(`Updating blacklist from Bsky, additionally removing word: ${word}`);
    } else {
        console.log(`Updating blacklist from Bsky`);
    }

    const agent = await getAgent();
    const preferences = await agent.app.bsky.actor.getPreferences().then(r => r.data.preferences);
    const mutedPref = preferences.filter(pref => pref.$type === 'app.bsky.actor.defs#mutedWordsPref');

    try {
        if (isMutedWordsPref(mutedPref[0])) {
            mutedPref[0].items.forEach((item: MutedWord) => {
                if (item.targets.length == 1) {
                    state.cachedBlacklist.push('#' + item.value.toLowerCase());
                } else {
                    state.cachedBlacklist.push(item.value.toLowerCase());
                }
            });
            state.cachedBlacklist = removeDuplicatesAndSort(state.cachedBlacklist);
            console.log(`Blacklist from Bsky merged with cache. Count: ${state.cachedBlacklist.length}`);
        } else {
            console.log('Fail to process muted words');
        }
    } catch (error) {
        console.error(`Error adding muted words to blacklist: ${error}`);
    }

    getBlacklistFromLocalAndMergeWithCache();

    if (isRemove && word) {
        state.cachedBlacklist = state.cachedBlacklist.filter(w => w.toLowerCase() !== word.toLowerCase());
        console.log(`Removed word from blacklist: ${word}`);
        console.log(`Blacklist from cache updated. Count: ${state.cachedBlacklist.length}`);
    }

    saveBlacklistToLocal({blacklist: state.cachedBlacklist, dictionary: state.cachedDictionary, ignoreList: []});
    saveBlacklistToBsky(agent, preferences);
}

function getBlacklistFromLocalAndMergeWithCache() {
    const state = getState();
    const data: ListData = readBlacklistFromLocal();
    console.log(`Blacklist from local count: ${data.blacklist.length}.`);
    console.log(`Blacklist from cache count: ${state.cachedBlacklist.length}. Merging with local data...`);

    state.cachedBlacklist.push(...data.blacklist);
    state.cachedBlacklist = removeDuplicatesAndSort(state.cachedBlacklist);

    state.cachedDictionary.push(...data.dictionary);
    state.cachedDictionary = removeDuplicatesAndSort(state.cachedDictionary);

    console.log(`Blacklist from cache updated. Count: ${state.cachedBlacklist.length}`);
}

function readBlacklistFromLocal(): ListData {
    const fileContent = fs.readFileSync(LIST_FILE_PATH, 'utf-8');
    return JSON.parse(fileContent);
}

function removeDuplicatesAndSort(array: string[]): string[] {
    array = array.filter(word => {
        word = word.toLowerCase();
        if (word.includes('#')) {
            const wordWithoutPrefix = word.replace('#', '');
            return !array.includes(wordWithoutPrefix);
        }
        return true;
    });
    return [...new Set(array)].sort((a, b) => b.localeCompare(a)).map(word => word.toLowerCase());
}

function saveBlacklistToLocal(data: ListData) {
    console.log(`Blacklist from cache count: ${data.blacklist.length}. Saving blacklist to local...`);
    fs.writeFileSync(LIST_FILE_PATH, JSON.stringify(data, null, 2));
}

function saveBlacklistToBsky(agent: AtpAgent, preferences: Preferences) {
    const state = getState();
    console.log(`Blacklist from cache count: ${state.cachedBlacklist.length}. Saving blacklist to Bsky...`);

    preferences.filter(pref => isMutedWordsPref(pref)).forEach(pref => {
        pref.items = [];
        for (let word of state.cachedBlacklist) {
            if (word.includes('#')) {
                word = word.replace('#', '');
                pref.items.push({value: word.toLowerCase(), targets: ["tag"], actorTarget: "all"});
            } else {
                pref.items.push({value: word.toLowerCase(), targets: ["tag", "content"], actorTarget: "all"});
            }
        }
        pref.items.sort((a: MutedWord, b: MutedWord) => b.value.localeCompare(a.value));
    });

    agent.app.bsky.actor.putPreferences({preferences: preferences})
        .then((response) => console.log(`Mutes added successfully: ${JSON.stringify(response)}`))
        .catch(e => console.error(`Error updating muted words list: ${e}`));
}