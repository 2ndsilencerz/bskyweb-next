let cursor = null;
let loading = false;
const LIMIT = 10;
let forYouCursor = '';
let postIndex = -1;
const isForYou = window.location.pathname.includes('foryou');
const isFeed = window.location.pathname.includes('feed');
let currentContainerId = '';

const deletePost = async (e) => {
    try {
        const button = e.target.closest('button[data-post-index]');
        if (!button) return;

        let postIndex = button.getAttribute('data-post-index');
        // console.log(postIndex);
        const postUri = document.getElementById('post-' + postIndex).querySelector('#post-id-to-delete').textContent;
        // console.log(postUri);
        if (!isForYou) {
            await deletePostRequest(postUri);
        } else {
            await mutePostRequest(postUri);
        }
        document.getElementById('post-' + postIndex).remove();
    } catch (error) {
        console.error(`Error deleting post: ${error}`);
    }
}

const deletePostRequest = async (postUri) => {
    if (isForYou) return;
    const res = await fetch(`/delete/${encodeURIComponent(postUri)}`, {method: 'get'})
    if (!res.ok) throw new Error('Failed to delete post');
}

const mutePostRequest = async (postUri) => {
    const res = await fetch(`/api/post/mute/${encodeURIComponent(postUri)}`, {method: 'post'})
    if (!res.ok) throw new Error('Failed to mute post');
}

// function extractDid(uri) {
//     const match = uri.match(/did:plc:[a-z0-9]+/);
//     return match ? match[0] : 'Unknown';
// }

function getInitials(did) {
    const hash = did.split('').reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return letters[Math.abs(hash) % 26];
}

function formatTimeAgo(date) {
    const utcDate = new Date(date);
    const localDate = new Date(utcDate.toLocaleString());
    const now = new Date();

    const seconds = Math.floor((now - localDate) / 1000);
    if (seconds < 60) return seconds + 's';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h';
    return Math.floor(seconds / 86400) + 'd';
}

function extractPostId(uri) {
    const parts = uri.split('/');
    return parts[parts.length - 1];
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function fetchAuthorProfile(handle) {
    try {
        const response = await fetch(`/api/profile/${encodeURIComponent(handle)}`);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error('Error fetching author profile:', error);
        return null;
    }
}

function createAuthorPopup(profileData) {
    if (!profileData) return '';

    const initials = profileData.displayName
        ? profileData.displayName.substring(0, 1).toUpperCase()
        : getInitials(profileData.handle);

    return `
        <div class="author-popup">
            <!--div class="popup-header">
                <div class="popup-avatar" style="${profileData.avatar ? 'background: none;' : ''}">
                    ${profileData.avatar ?
        `<img src="${profileData.avatar}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" alt="${profileData.handle}-avatar">` :
        initials}
                </div>
                <div class="popup-info">
                    <div class="popup-name">${escapeHtml(profileData.displayName || profileData.handle)}</div>
                    <div class="popup-handle">@${profileData.handle}</div>
                </div>
            </div-->
            ${profileData.description ? `<div class="popup-description">${escapeHtml(profileData.description)}</div>` : ''}
            <!--div class="popup-stats">
                <span><strong>${profileData.followersCount || 0}</strong> Followers</span>
                <span><strong>${profileData.followsCount || 0}</strong> Following</span>
                <span><strong>${profileData.postsCount || 0}</strong> Posts</span>
            </div-->
        </div>
    `;
}

let currentPopup = null;
let popupTimeout = null;

function initializeAuthorHover() {
    document.addEventListener('mouseover', async (e) => {
        const authorElement = e.target.closest('.post-author');
        if (!authorElement) return;

        clearTimeout(popupTimeout);

        const handle = authorElement.getAttribute('data-handle');
        if (!handle) return;

        if (currentPopup) {
            currentPopup.remove();
            currentPopup = null;
        }

        popupTimeout = setTimeout(async () => {
            const profileData = await fetchAuthorProfile(handle);
            if (!profileData) return;

            // try {
            //     const translatedItems = await translateCall(profileData.description);
            //     if (translatedItems.from !== 'en') {
            //         profileData.description += ` || Translated from: ${translatedItems.from} - ${translatedItems.text}`;
            //     }
            // } catch (error) {
            //     console.error('Translation error:', error);
            // }
            const popup = document.createElement('div');
            popup.className = 'author-popup-container';
            popup.innerHTML = createAuthorPopup(profileData);
            popup.style.position = 'absolute';

            const rect = authorElement.getBoundingClientRect();
            popup.style.left = rect.left + 'px';
            popup.style.top = (rect.bottom + window.scrollY + 5) + 'px';

            document.body.appendChild(popup);
            currentPopup = popup;

            popup.addEventListener('mouseenter', () => {
                clearTimeout(popupTimeout);
            });

            popup.addEventListener('mouseleave', () => {
                popupTimeout = setTimeout(() => {
                    if (currentPopup) {
                        currentPopup.remove();
                        currentPopup = null;
                    }
                }, 200);
            });
        }, 500);
    });

    document.addEventListener('mouseout', (e) => {
        const authorElement = e.target.closest('.post-author');
        if (!authorElement) return;

        if (!e.relatedTarget || (!e.relatedTarget.closest('.post-author') && !e.relatedTarget.closest('.author-popup-container'))) {
            clearTimeout(popupTimeout);
            popupTimeout = setTimeout(() => {
                if (currentPopup && !currentPopup.matches(':hover')) {
                    currentPopup.remove();
                    currentPopup = null;
                }
            }, 200);
        }
    });
}

function convertHashtagsToLinks(text) {
    if (!text) return '';
    const hashtagRegex = /#[\p{L}\p{N}_]+/gu;
    return text.replace(hashtagRegex, (hashtag) => {
        const tag = hashtag.substring(1);
        return `<a href="https://bsky.app/hashtag/${encodeURIComponent(tag)}" target="_blank" rel="noopener noreferrer" style="color: #1d9bf0; text-decoration: none;">${hashtag}</a>`;
    });
}

async function translatePost(e, postIndex) {
    let elementOfText = document.getElementById(`post-content-${postIndex}`);
    let text = elementOfText.innerText;
    try {
        const translateResponse = await translateCall(text);
        elementOfText.innerHTML += `<div>Translated from: ${translateResponse.detectedLanguage.language}</div>${convertHashtagsToLinks(escapeHtml(translateResponse.translatedText))}`;
    } catch (error) {
        console.error('Translation error:', error);
    }
}

async function translateCall(text) {
    try {
        // libretranslate https://github.com/LibreTranslate/LibreTranslate or https://docker.io/LibreTranslate/LibreTranslate
        let url = `http://localhost:5000/translate`
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `q=${encodeURIComponent(text)}&source=auto&target=en&format=html`
        });
        return await response.json();
    } catch (e) {
        console.error('Translation error:', e);
    }
    // try {
    //     let url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t`;
    //     const response = await fetch(url, {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/x-www-form-urlencoded'
    //         },
    //         body: `q=${encodeURIComponent(text)}`
    //     });
    //     const data = await response.json();
    //     // console.log(JSON.stringify(data));
    //     return {text: data[0][0][0], from: data[2]};
    // } catch (error) {
    //     console.error('Error calling translation API:', error);
    //     throw error;
    // }
}

async function fetchPostDetails(uri) {
    try {
        uri = !isForYou ? `/api/post/${encodeURIComponent(uri)}` : `/foryou/api/post/${encodeURIComponent(uri)}`;
        const response = await fetch(uri);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error('Error fetching post details:', error);
        return null;
    }
}

async function fetchPostDetailsWithRetry(uri, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const result = await fetchPostDetails(uri);
        if (result !== null) {
            return result;
        }
        if (attempt < maxRetries) {
            console.log(`Retry attempt ${attempt} for post: ${uri}`);
        }
    }
    console.error(`Failed to fetch post after ${maxRetries} attempts: ${uri}`);
    return null;
}

async function displayPageResults(containerId) {
    // console.log(`displayPageResults: ${containerId}`);
    const container = document.getElementById(containerId);
    if (container) {
        console.log(`displayPageResults: ${containerId} found`);
        container.style.display = 'none';
        try {
            await waitForMediaToLoad(container);
        } catch (error) {
            console.error('Error waiting for media to load:', error);
        }
        //     .then(() => {
        //     container.style.display = 'block';
        //     currentContainerId = containerId;
        // });
        hidePageResults(currentContainerId);
        document.getElementById('loading').style.display = 'none';
        container.style.display = 'block';
        window.scrollTo(0, 0);
        currentContainerId = containerId;
    }
    // console.log(`displayPageResults done: ${containerId}`);
}

function hidePageResults(containerId) {
    if (containerId === '') {
        return;
    }
    const container = document.getElementById(containerId);
    if (container) {
        container.style.display = 'none';
        container.parentElement.removeChild(container);
    }
}

function isImageLoaded(img) {
    if (img.readyState === undefined) return true;
    if (!img.complete) return false;
    return img.naturalWidth !== 0;
}

function isVideoLoaded(video) {
    return video.readyState >= 2;
}

async function waitForMediaToLoad(container) {
    const images = container.querySelectorAll('img');
    const videos = container.querySelectorAll('video');

    const imagePromises = Array.from(images).map(img => {
        if (isImageLoaded(img)) {
            // console.log(`Image loaded: ${img.src}`);
            return Promise.resolve().catch(e => console.error('Error waiting for image to load:', e));
        }
        return new Promise((resolve) => {
            // console.log(`Image readyState: ${img.readyState}`);
            const handler = () => {
                img.removeEventListener('load', handler);
                img.removeEventListener('error', handler);
                img.removeEventListener('readystatechange', handler);
                resolve();
            };
            img.addEventListener('load', handler);
            img.addEventListener('error', handler);
            img.addEventListener('readystatechange', handler);
            if (isImageLoaded(img)) {
                console.log(`Image loaded: ${img.src}`);
                handler();
            }
        }).catch(e => console.error('Error waiting for image to load:', e));
    });

    const videoPromises = Array.from(videos).map(video => {
        if (isVideoLoaded(video)) {
            return Promise.resolve().catch(e => console.error('Error waiting for video to load:', e));
        }
        return new Promise((resolve) => {
            // console.log(`Video readyState: ${video.readyState}`);
            const handler = () => {
                video.removeEventListener('loadeddata', handler);
                video.removeEventListener('error', handler);
                video.removeEventListener('readystatechange', handler);
                resolve();
            };
            video.addEventListener('loadeddata', handler);
            video.addEventListener('error', handler);
            video.addEventListener('readystatechange', handler);
            if (isVideoLoaded(video)) {
                handler();
            }
        }).catch(e => console.error('Error waiting for video to load:', e));
    });

    // Add a safety timeout of 5 seconds so the feed eventually shows up
    const safetyTimeout = new Promise(resolve => setTimeout(resolve, 5000));
    return Promise.all([...imagePromises, ...videoPromises], safetyTimeout);
    // return Promise.all([...imagePromises]);
}

async function createPostCard(post, postIndex) {
    const postData = await fetchPostDetailsWithRetry(post);

    if (!postData) {
        deletePostRequest(post).then(() => {
        });
        return ''
    }

    // console.log(`postData: ${postData}`);
    // console.log(`${JSON.stringify(postData, null, 2)}`)
    const timeAgo = formatTimeAgo(postData.createdAt);
    const initials = postData.authorDisplayName
        ? postData.authorDisplayName.substring(0, 1).toUpperCase()
        : getInitials(postData.authorHandle);

    // const authorBasePicUrl = postData.authorAvatar
    //     ? postData.authorAvatar.replace(/\/[^\/]+@\w+$/, '')
    //     : null;
    // 
    // const authorDid = authorBasePicUrl
    //     ? (authorBasePicUrl.match(/did:plc:[a-z0-9]+/) || [])[0] || null
    //     : null;

    const postId = extractPostId(postData.uri);
    const liked = postData.like || false;
    const bookmarked = postData.bookmark || false;
    return `
    <div class="post-card" id="post-${postIndex}">
      <div class="post-header">
        <a href="https://bsky.app/profile/${postData.authorHandle}" target="_blank" rel="noopener noreferrer">
        <div class="post-avatar" style="${postData.authorAvatar ? 'background: none;' : ''}">
          ${postData.authorAvatar ?
        `<img src="${postData.authorAvatar}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" alt="${postData.authorHandle + "-avatar"}" >`
        : initials}
        </div>
        </a>
        <div class="post-info">
          <div>
            <div style="display: inline-grid">
            <a href="https://bsky.app/profile/${postData.authorHandle}" target="_blank" rel="noopener noreferrer" style="color: white; text-decoration: unset">
                <span class="post-author" data-handle="${postData.authorHandle}">${escapeHtml(postData.authorDisplayName)}</span>
            </a>
            <div style="position: absolute; right: 10px;">
            <button id="translate-post-${postIndex}" onclick="translatePost(event, ${postIndex})" style="color: white; background: none; border: none; cursor: pointer; padding: 4px;" title="Translate">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
            </button>
            <button id="mute-author-${postIndex}" onclick="muteAuthor(event, '${postData.authorHandle}')" style="color: white; background: none; border: none; cursor: pointer; padding: 4px;" title="Mute Author">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <line x1="23" y1="9" x2="17" y2="15"></line>
                    <line x1="17" y1="9" x2="23" y2="15"></line>
                </svg>
            </button>
            <button id="block-author-${postIndex}" onclick="blockAuthor(event, '${postData.authorDid}')" style="color: white; background: none; border: none; cursor: pointer; padding: 4px;" title="Block Author">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                </svg>
            </button>
            <button id="delete-post-${postIndex}" onclick="deletePost(event)" data-post-index="${postIndex}" style="color: white; background: none; border: none; cursor: pointer; padding: 4px;" title="Delete">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
            </div>
            </div>
            <br>
            <span class="post-handle">@${postData.authorHandle}</span>
            <a href="https://bsky.app/profile/${postData.authorHandle}/post/${postId}" target="_blank" rel="noopener noreferrer" style="text-decoration: unset">
                <span class="post-time">· ${timeAgo}</span>
            </a>
          </div>
        </div>
      </div>
      <div class="post-content">
        <div hidden="" id="post-id-to-delete">${post}</div>
        <div hidden="" id="post-data">${escapeHtml(JSON.stringify(postData))}</div>
        <div id="post-content-${postIndex}">${convertHashtagsToLinks(escapeHtml(postData.postText))}</div>
        ${postData.postImage && postData.postImage.length > 0 ?
        postData.postImage.map(img => `
            <!--a href="https://bsky.app/profile/${postData.authorHandle}/post/${postId}" target="_blank" rel="noopener noreferrer"-->
                ${!postData.nsfwPost ?
            `<img src="${img.fullsize}" loading="lazy" style="width: 100%; height: auto; border-radius: 8px; margin-top: 10px;" alt="${img.alt || ''}">` :
            `<img src="${img.fullsize}" loading="lazy" style="width: 100%; height: auto; border-radius: 8px; margin-top: 10px; filter: blur(5px);" alt="${img.alt || ''}" onclick="this.style.filter = ''">`
        }
            <!--/a-->
        `).join('') : ''}
        ${postData.embedVideoUri ? `
            ${!postData.nsfwPost ?
        `<video src="${postData.embedVideoUri}" controls style="width: 100%; height: auto; border-radius: 8px; margin-top: 10px;"></video>` :
        `<video src="${postData.embedVideoUri}" controls style="width: 100%; height: auto; border-radius: 8px; margin-top: 10px; filter: blur(5px);" onclick="this.style.filter = ''"></video>`}
        ` : ''}
        ${postData.embedExternalUri ? `
        <a href="${postData.embedExternalUri}" target="_blank" rel="noopener noreferrer" class="external-link-preview" style="display: block; margin-top: 12px; border: 1px solid #e1e8ed; border-radius: 12px; overflow: hidden; text-decoration: none; color: inherit;">
        ${postData.embedExternalThumb ? `
            <img src="${postData.embedExternalThumb}" loading="lazy" style="width: 100%; height: 200px; object-fit: cover;" alt="${postData.embedExternalTitle || ''}">` : ''}
            <div style="padding: 12px;">
                <div style="font-size: 15px; font-weight: 600; color: white; margin-bottom: 4px;">${postData.embedExternalTitle || ''}</div>
                <div style="font-size: 14px; color: #536471; margin-bottom: 4px;">${postData.embedExternalDescription.length > 100 ? postData.embedExternalDescription.substring(0, 100) + '...' : postData.embedExternalDescription || ''}</div>
                <div style="font-size: 13px; color: #536471;">🔗 ${new URL(postData.embedExternalUri).hostname}</div>
            </div>
        </a>
        ` : ''}
        <div class="post-actions" style="display: flex; justify-content: flex-end; padding: 5px 5px">
          <button class="action-button" onclick="likePost(event, ${postIndex}, '${post}')" style="color: ${liked ? '#e0245e' : 'white'}; background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 0 5px">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${liked ? '#e0245e' : 'none'}" stroke="currentColor" stroke-width="2" >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span>Like</span>
          </button>
          <button class="action-button" onclick="bookmarkPost(event, ${postIndex}, '${post}')" style="color: ${bookmarked ? '#1d9bf0' : 'white'}; background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 4px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${bookmarked ? '#1d9bf0' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>Bookmark</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

// async function loadPosts() {
//     if (loading || !hasMore) return;
//
//     loading = true;
//     document.getElementById('loading').style.display = 'block';
//     document.getElementById('error').style.display = 'none';
//
//     const feedElement = document.getElementById('feed');
//     const scrollHeightBefore = feedElement.scrollHeight;
//     const scrollTopBefore = window.scrollY || document.documentElement.scrollTop;
//
//     try {
//         const url = `/xrpc/app.bsky.feed.getFeedSkeleton?feed=at://${encodeURIComponent('did:plc:dyxukde6k2muyhg2waekj2rx')}/app.bsky.feed.generator/whats-alf&limit=${LIMIT}${cursor ? '&cursor=' + cursor : ''}`;
//         const response = await fetch(url);
//
//         if (!response.ok) {
//             throw new Error('Failed to load feed');
//         }
//
//         const data = await response.json();
//
//         if (data.feed && data.feed.length > 0) {
//             for (const post of data.feed) {
//                 const postCard = await createPostCard(post);
//                 feedElement.innerHTML += postCard;
//             }
//             cursor = data.cursor;
//             hasMore = !!data.cursor;
//
//             const scrollHeightAfter = feedElement.scrollHeight;
//             const heightDifference = scrollHeightAfter - scrollHeightBefore;
//
//             if (feedElement.children.length > LIMIT) {
//                 window.scrollTo(0, scrollTopBefore + heightDifference);
//             }
//         } else {
//             hasMore = false;
//             if (feedElement.children.length === 0) {
//                 feedElement.innerHTML = '<div class="empty-state">No posts available yet.</div>';
//             }
//         }
//     } catch (error) {
//         console.error('Error loading posts:', error);
//         document.getElementById('error').textContent = 'Failed to load posts. Please try again.';
//         document.getElementById('error').style.display = 'block';
//     } finally {
//         loading = false;
//         document.getElementById('loading').style.display = 'none';
//     }
// }
// 
// const observer = new IntersectionObserver((entries) => {
//     if (entries[0].isIntersecting) {
//         loadPosts().then(() => {
//         });
//     }
// }, {threshold: 0.1});
//
// observer.observe(document.getElementById('load-trigger'));
//
// loadPosts().then(() => {
//     observer.disconnect();
// });

const loadPage = async () => {
    document.getElementById('loading').style.display = 'block';
    let page = 1;
    try {
        // console.log(window.location.pathname)
        const pathParts = window.location.pathname.split('/').filter(p => p);
        const pageInUrl = isFeed ? 1 : 0;
        // console.log(pageInUrl)
        page = pathParts.length > 0 ? parseInt(pathParts[pageInUrl], 10) : 1;
        // console.log(page)
    } catch (e) {
        console.error(e);
    }
    const feedElement = document.getElementById('feed');
    try {
        const url = !isForYou ? `/api/posts/${page}` : `/foryou/api/posts/${forYouCursor ? encodeURIComponent(forYouCursor) : ''}`;
        console.log(url);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to load feed');
        }

        const data = await response.json();
        if (isForYou) {
            forYouCursor = data.cursor;
            console.log(forYouCursor);
            // console.log(JSON.stringify(data.feed));
        }
        // console.log(data);
        try {
            const lastPage = !isForYou ? Math.ceil(data.total.count / LIMIT) : 0;
            document.getElementById('last-page-bottom').href = '/' + lastPage;
        } catch (e) {
        }
        let dataToLoad = !isForYou ? data.posts : data.feed;
        if (dataToLoad.length > 0) {
            let postCards;
            // console.log(dataToLoad);
            const postCardPromises = dataToLoad.map(post => {
                // console.log(post);
                postIndex++;
                return createPostCard(!isForYou ? post.uri : post.post.uri, postIndex);
            });
            // console.log(`postCard created`);
            const postCardsArray = await Promise.all(postCardPromises);
            // console.log(`postCard array created`);
            postCards = postCardsArray.join('');
            // console.log(`postCards joined`);
            const containerId = crypto.randomUUID();
            feedElement.innerHTML += `<div id="${containerId}">${postCards}</div>`;
            displayPageResults(containerId);
            // console.log(`feedElement updated`);
        }
        // else {
        //     hasMore = false;
        //     if (feedElement.children.length === 0) {
        //         feedElement.innerHTML = '<div class="empty-state">No posts available yet.</div>';
        //     }
        // }
    } catch (error) {
        console.error(`Error loading posts:, ${error}`);
        document.getElementById('error').textContent = 'Failed to load posts. Please try again.';
        document.getElementById('error').style.display = 'block';
    } finally {
        loading = false;
        document.getElementById('loading').style.display = 'none';
    }
    // document.getElementById('loading').style.display = 'none';
}

async function likePost(e, postIndex, postUri) {
    try {
        const button = e.currentTarget;
        const response = await fetch(`/api/post/like/${encodeURIComponent(postUri)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to like post');
        }

        button.style.color = '#e0245e';
        button.querySelector('svg').style.fill = '#e0245e';
    } catch (error) {
        console.error('Error liking post:', error);
        alert('Failed to like post. Please try again.');
    }
}

async function bookmarkPost(e, postIndex, postUri) {
    try {
        const button = e.currentTarget;
        const response = await fetch(`/api/post/bookmark/${encodeURIComponent(postUri)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to bookmark post');
        }

        button.style.color = '#1d9bf0';
        button.querySelector('svg').style.fill = '#1d9bf0';
    } catch (error) {
        console.error('Error bookmarking post:', error);
        alert('Failed to bookmark post. Please try again.');
    }
}

async function muteAuthor(e, authorHandle) {
    try {
        const button = e.currentTarget;
        const response = await fetch(`/api/profile/mute/add/${encodeURIComponent(authorHandle)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to mute author');
        }

        try {
            let postIndex = button.id.split('-')[2];
            document.getElementById('post-' + postIndex).remove();
        } catch (e) {
        }
    } catch (error) {
        console.error('Error muting author:', error);
        alert('Failed to mute author. Please try again.');
    }
}

async function blockAuthor(e, authorDid) {
    try {
        const button = e.currentTarget;
        const response = await fetch(`/api/profile/block/add/${encodeURIComponent(authorDid)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to block author');
        }

        try {
            let postIndex = button.id.split('-')[2];
            document.getElementById('post-' + postIndex).remove();
        } catch (e) {
        }
    } catch (error) {
        console.error('Error blocking author:', error);
        alert('Failed to block author. Please try again.');
    }
}

window.addEventListener('load', () => {
    loadPage(isForYou ? true : null).then(() => {
        initializeAuthorHover();
    }).catch(e => console.error(`Error loading page: ${e}`));
    document.getElementById('next-page-bottom').addEventListener('click', () => {
        document.getElementById('error').style.display = 'none';
    });
})