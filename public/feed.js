let currentPage = parseInt(window.location.pathname.split('/')[2]);

function nextPage(e, prev) {
    e.preventDefault();
    // document.getElementById('loading').style.display = 'block';
    // try {
    //     for (let i = 0; i < 10; i++) {
    //         document.getElementById(`post-${i}`).remove();
    //     }
    // } catch (e) {}
    // window.location.href = `/feed/${currentPage + 1}`;
    // window.history.pushState({currentPage}, document.title, `/feed/${currentPage + 1}`);
    window.history.replaceState({}, document.title, !isForYou ? `/feed/${!prev ? currentPage + 1 : currentPage - 1}` : `/foryou/`);
    // console.log(window.location.href);
    // console.log(JSON.stringify(window.location));
    // console.log(JSON.stringify(window.history));
    loadPage().then(() => {
        initializeAuthorHover();
        currentPage++;
        if (currentPage > 1) {
            addPrevPageButton();
        } else {
            removePrevPageButton();
        }
    }).catch(e => console.error(`Error loading page: ${e}`));
}

function addNextPageButton() {
    try {
        // const currentPage = parseInt(window.location.pathname.split('/').filter(p => p)[1], 10);
        const nextElementButton = document.getElementById('next-page-bottom');
        nextElementButton.addEventListener('click', nextPage);
        // nextElementButton.href = `/feed/${currentPage + 1}/#`;
    } catch (e) {
    }
}

function removePrevPageButton() {
    try {
        const prevElementButton = document.getElementById('prev-page-bottom');
        prevElementButton.attributes.disabled = true;
        prevElementButton.removeEventListener('click', (e) => nextPage(e, true));
        prevElementButton.nodeType = 'span';
    } catch (e) {
    }
}

function addPrevPageButton() {
    try {
        const prevElementButton = document.getElementById('prev-page-bottom');
        prevElementButton.classList.remove('disabled');
        prevElementButton.addEventListener('click', (e) => nextPage(e, true));
        prevElementButton.nodeType = 'a';
        // prevElementButton.href = `/feed/${currentPage - 1}/#`;
    } catch (e) {
    }
}

window.addEventListener('load', () => {
    if (document.title.includes('For You') || window.location.pathname.includes('feed')) {
        addNextPageButton();
    }
})