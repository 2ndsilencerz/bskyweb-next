import {AtpAgent} from '@atproto/api';

interface AgentConfig {
    agent: AtpAgent | null;
}

// Prevent multiple instances in development due to HMR
const globalForAgent = global as unknown as { agentConfig: AgentConfig };

export const agentConfig = globalForAgent.agentConfig || {
    agent: null,
};

if (process.env.NODE_ENV !== 'production') globalForAgent.agentConfig = agentConfig;

export async function getAgent() {
    if (agentConfig.agent && agentConfig.agent.hasSession && agentConfig.agent.session?.active) {
        return agentConfig.agent;
    }

    const agent = new AtpAgent({
        service: 'https://bsky.social',
    });

    // Perform the "startup task" (e.g., login)
    try {
        for (const retry in [1, 2, 3]) {
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