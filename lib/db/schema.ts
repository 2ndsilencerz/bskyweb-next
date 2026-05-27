export type DatabaseSchema = {
    posts: Posts
    last_state: LastState
}

export type Posts = {
    createdAt: string
    indexedAt: string
    uri: string
    cid: string
    tag: string
}

export type LastState = {
    q: string
    cursor: string
}
