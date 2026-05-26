import {AtpAgent} from '@atproto/api';

interface AgentConfig {
    agent: AtpAgent | null;
    agentPromise: Promise<AtpAgent> | null;
}

// Prevent multiple instances in development due to HMR
const globalForAgent = global as unknown as { agentConfig: AgentConfig };

export const agentConfig = globalForAgent.agentConfig || {
    agent: null,
    agentPromise: null,
};

if (process.env.NODE_ENV !== 'production') globalForAgent.agentConfig = agentConfig;

export async function getAgent() {
    if (agentConfig.agent && agentConfig.agent.hasSession && agentConfig.agent.session?.active) {
        return agentConfig.agent;
    }

    if (agentConfig.agentPromise) {
        return agentConfig.agentPromise;
    }

    agentConfig.agentPromise = initializeAgent();

    try {
        agentConfig.agent = await agentConfig.agentPromise;
        return agentConfig.agent;
    } finally {
        agentConfig.agentPromise = null;
    }
}

async function initializeAgent() {
    const agent = new AtpAgent({
        service: 'https://bsky.social',
    });

    // Perform the "startup task" (e.g., login)
    try {
        for (let attempt = 1; attempt <= 3; attempt++) {
            const res = await agent.login({
                identifier: process.env.USER_HANDLE!,
                password: process.env.USER_PASSWORD!,
            });
            if (res.success) break;
        }
    } catch (error) {
        console.error('Failed to login to Bluesky:', error);
        // Consider throwing the error or handling it in a way that makes sense for your application
        throw error;
    }

    agentConfig.agent = agent;
    console.log('Bluesky Agent initialized');
    return agent;
}