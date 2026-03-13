const CINII_APPID = 'BThi3AXaul6E9ujuWhIh';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxByNm-erJ2hwt-nWZWe_WZz7a7zgzoe4pZnV6QC7lhV7VfWrC0cbeRUnT2KvhlO0Vk/exec'; // 取得したウェブアプリURLをここに貼り付け
const demoSources = [
    {
        id: 1,
        type: 'book',
        title: 'デジタル時代の教育心理学',
        author: '佐藤健一',
        year: '2023',
        publisher: '教育出版',
        apa: '佐藤健一(2023) 『デジタル時代の教育心理学』 教育出版.',
        status: 'used',
        quotes: [
            { id: 101, page: '45', line: '12-15', text: 'デジタルデバイスの利用時間は、集中力の持続時間に負の相関を示すことが明らかになった。' }
        ]
    },
    {
        id: 2,
        type: 'journal',
        title: '小学校家庭科における片づけの学習の検討',
        author: '古重奈央',
        year: '2019',
        journal: '日本教科教育学会誌',
        volume: '42',
        issue: '3',
        pages: '55-67',
        apa: '古重奈央(2019) 「小学校家庭科における片づけの学習の検討」『日本教科教育学会誌』 42巻, 3号, pp.55-67.',
        status: 'pending',
        quotes: []
    },
    {
        id: 3,
        type: 'web',
        title: '新しい時代の初等中等教育の在り方について',
        author: '中央教育審議会',
        year: '2019',
        sitename: '文部科学省',
        url: 'https://www.mext.go.jp/b_menu/shingi/chukyo/chukyo0/toushin/1415877.htm',
        accessDate: '2022-06-30',
        apa: '中央教育審議会(2019) 「新しい時代の初等中等教育の在り方について」. 文部科学省. https://www.mext.go.jp/b_menu/shingi/chukyo/chukyo0/toushin/1415877.htm, (参照 2022-06-30).',
        status: 'pending',
        quotes: []
    }
];

let sources = JSON.parse(localStorage.getItem('thesis_sources_v3')) || [];
let alumniData = [];
let allUsers = []; // 登録済みユーザーリスト
let currentUser = JSON.parse(localStorage.getItem('thesis_user')) || null;
let activeTab = 'dashboard';
let sourceFilterState = 'all';
let alumniFilterState = 'all';
let pendingExternalSource = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    updateAuthUI();
    if (GAS_URL) {
        await refreshFromGAS();
        await refreshAlumniFromGAS();
        await refreshUsersFromGAS();
    } else {
        renderDashboard();
        renderSourceList();
        renderAlumniList();
    }
    lucide.createIcons();
});

async function refreshUsersFromGAS() {
    try {
        const response = await fetch(`${GAS_URL}?action=getUsers`);
        const data = await response.json();
        allUsers = data;
        console.log('Users Loaded:', allUsers.length);
    } catch (e) {
        console.error('GAS Users fetch error:', e);
    }
}
async function refreshAlumniFromGAS() {
    if (!GAS_URL) return;
    try {
        const response = await fetch(`${GAS_URL}?action=getAlumni`);
        const text = await response.text();
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
            console.warn('GAS is returning HTML for alumni.');
            renderAlumniList();
            return;
        }
        alumniData = JSON.parse(text);
        renderAlumniList();
    } catch (e) {
        console.error('GAS Alumni fetch error:', e);
        renderAlumniList();
    }
}

async function refreshFromGAS() {
    if (!GAS_URL) return;

    try {
        const response = await fetch(`${GAS_URL}?action=getSources`, {
            method: 'GET',
            credentials: 'omit'
        });
        const text = await response.text();

        // HTMLが返ってきた（Googleのログイン画面やリダイレクト）場合は無視してLocalを利用
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
            console.warn('GAS is returning HTML. Using local data instead. This is normal for local file access.');
            renderDashboard();
            renderSourceList();
            return;
        }

        const data = JSON.parse(text);
        if (data && Array.isArray(data)) {
            sources = data;
            localStorage.setItem('thesis_sources_v3', JSON.stringify(sources));
        }
    } catch (e) {
        console.error('GAS fetch error:', e);
    }
    renderDashboard();
    renderSourceList();
}

function setupEventListeners() {
    // Tab Switching
    document.querySelectorAll('.nav-links .nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = item.getAttribute('data-tab');
            if (tab) switchTab(tab);
        });
    });

    // Form Submission
    document.getElementById('add-source-form').addEventListener('submit', (e) => {
        e.preventDefault();
        saveSource();
    });

    // Quote Form Submission
    document.getElementById('add-quote-form').addEventListener('submit', (e) => {
        e.preventDefault();
        saveQuote();
    });

    // PDF Upload Change
    document.getElementById('pdf-upload').addEventListener('change', handlePdfUpload);

    // Source Type Change
    document.getElementById('source-type').addEventListener('change', updateExtraFields);

    // Alumni Form Submission
    document.getElementById('add-alumni-form').addEventListener('submit', (e) => {
        e.preventDefault();
        saveAlumniByForm();
    });

    // Initial extra fields display
    updateExtraFields();
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    document.getElementById(tabId).style.display = 'block';

    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
        if (nav.getAttribute('data-tab') === tabId) nav.classList.add('active');
    });

    if (tabId === 'dashboard') renderDashboard();
    if (tabId === 'literature') renderSourceList();
    activeTab = tabId;
}

// Data Handling
function openSourceModal(id = null) {
    const modalTitle = document.getElementById('source-modal-title');
    const form = document.getElementById('add-source-form');
    form.reset();
    document.getElementById('source-id').value = '';

    if (id) {
        const source = sources.find(s => s.id == id);
        if (source) {
            modalTitle.textContent = '参考文献情報の編集';
            document.getElementById('source-id').value = source.id;
            document.getElementById('source-type').value = source.type || 'book';
            document.getElementById('source-title').value = source.title || '';
            document.getElementById('source-author').value = source.author || '';
            document.getElementById('source-year').value = source.year || '';
            document.getElementById('source-journal').value = source.journal || '';
            document.getElementById('source-volume').value = source.volume || '';
            document.getElementById('source-issue').value = source.issue || '';
            document.getElementById('source-pages').value = source.pages || '';
            document.getElementById('source-publisher').value = source.publisher || '';
            document.getElementById('source-book-pages').value = source.bookPages || '';
            document.getElementById('source-sitename').value = source.sitename || '';
            document.getElementById('source-url').value = source.url || '';
            document.getElementById('source-access-date').value = source.accessDate || '';
            document.getElementById('source-is-public').checked = source.isPublic === 'true';
            updateExtraFields();
        }
    } else {
        modalTitle.textContent = '参考文献情報の登録';
        updateExtraFields();
    }
    openModal('sourceModal');
}

function saveSource() {
    const id = document.getElementById('source-id').value || Date.now();
    const type = document.getElementById('source-type').value;
    const authorInput = document.getElementById('source-author').value;
    const author = authorInput.replace(/,\s*/, '');

    const existingIndex = sources.findIndex(s => s.id == id);
    let quotes = [];
    let status = 'pending';
    let userId = currentUser ? currentUser.studentId : '';

    if (existingIndex > -1) {
        quotes = sources[existingIndex].quotes || [];
        status = sources[existingIndex].status || 'pending';
        userId = sources[existingIndex].userId || userId;
    }

    const sourceData = {
        id: id,
        type: type,
        title: document.getElementById('source-title').value,
        author: author,
        year: document.getElementById('source-year').value,
        journal: document.getElementById('source-journal').value,
        volume: document.getElementById('source-volume').value,
        issue: document.getElementById('source-issue').value,
        pages: document.getElementById('source-pages').value,
        publisher: document.getElementById('source-publisher').value,
        bookPages: document.getElementById('source-book-pages').value,
        sitename: document.getElementById('source-sitename').value,
        url: document.getElementById('source-url').value,
        accessDate: document.getElementById('source-access-date').value,
        apa: '',
        status: status,
        quotes: quotes,
        userId: userId,
        isPublic: document.getElementById('source-is-public').checked ? 'true' : 'false'
    };

    sourceData.apa = generateAPAFromData(sourceData);

    if (existingIndex > -1) {
        sources[existingIndex] = sourceData;
    } else {
        sources.push(sourceData);
    }

    localStorage.setItem('thesis_sources_v3', JSON.stringify(sources));

    if (GAS_URL) {
        fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'saveSource', source: sourceData })
        }).catch(e => console.error('GAS save error:', e));
    }

    closeModal('sourceModal');
    renderSourceList();
    renderDashboard();
    document.getElementById('add-source-form').reset();
    updateExtraFields();
}

function saveQuote() {
    const idField = document.getElementById('current-source-id');
    const sourceId = idField.value;

    if (!sourceId) {
        console.error('Source ID is missing');
        return;
    }

    const page = document.getElementById('quote-page').value;
    const line = document.getElementById('quote-line').value;
    const text = document.getElementById('quote-text').value;

    if (!text) {
        alert('引用テキストを入力してください。');
        return;
    }

    const quote = {
        id: Date.now(),
        page: page,
        line: line,
        text: text
    };

    let found = false;
    sources = sources.map(s => {
        if (s.id == sourceId) {
            s.quotes = s.quotes || [];
            s.quotes.push(quote);
            found = true;
        }
        return s;
    });

    if (!found) {
        alert('対象の文献が見つかりませんでした。');
        return;
    }

    localStorage.setItem('thesis_sources_v3', JSON.stringify(sources));

    // GAS同期
    if (GAS_URL) {
        fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'saveQuote', sourceId: sourceId, quote: quote })
        }).catch(e => console.error('GAS quote save error:', e));
    }

    renderQuotes(sourceId);

    // フォームをリセットするが、sourceIdを保持するために手動でクリア
    document.getElementById('quote-page').value = '';
    document.getElementById('quote-line').value = '';
    document.getElementById('quote-text').value = '';

    renderDashboard();
    renderSourceList(); // 文献リスト側も一応更新
    alert('引用を記録しました！');
}

function generateAPA() {
    // This is used for preview if needed, but we'll use generateAPAFromData for saving
    const data = {
        type: document.getElementById('source-type').value,
        title: document.getElementById('source-title').value,
        author: document.getElementById('source-author').value,
        year: document.getElementById('source-year').value,
        journal: document.getElementById('source-journal').value,
        volume: document.getElementById('source-volume').value,
        issue: document.getElementById('source-issue').value,
        pages: document.getElementById('source-pages').value,
        publisher: document.getElementById('source-publisher').value,
        bookPages: document.getElementById('source-book-pages').value,
        sitename: document.getElementById('source-sitename').value,
        url: document.getElementById('source-url').value,
        accessDate: document.getElementById('source-access-date').value
    };
    return generateAPAFromData(data);
}

function generateAPAFromData(s) {
    if (s.type === 'journal') {
        const volume = s.volume ? `${s.volume}巻` : '';
        const issue = s.issue ? `${s.issue}号` : '';
        const pages = s.pages ? `, pp.${s.pages}` : '';
        return `${s.author}(${s.year}) 「${s.title}」『${s.journal}』 ${volume}, ${issue}${pages}.`;
    } else if (s.type === 'web') {
        const access = s.accessDate ? `, (参照 ${s.accessDate})` : '';
        return `${s.author}(${s.year}) 「${s.title}」. ${s.sitename}. ${s.url}${access}.`;
    } else {
        // Book style
        const pages = s.bookPages ? `, pp.${s.bookPages}` : '';
        return `${s.author}(${s.year}) 『${s.title}』 ${s.publisher}${pages}.`;
    }
}

// Rendering
function renderDashboard() {
    const totalQuotes = sources.reduce((acc, s) => acc + (s.quotes ? s.quotes.length : 0), 0);
    document.getElementById('stats-total').textContent = sources.length;
    document.getElementById('stats-used').textContent = sources.filter(s => s.status === 'used').length;
    document.getElementById('stats-quotes').textContent = totalQuotes;

    const recentList = document.getElementById('recent-sources-list');
    recentList.innerHTML = '';

    sources.slice(-3).reverse().forEach(source => {
        recentList.appendChild(createSourceItem(source));
    });
}

function renderSourceList() {
    const list = document.getElementById('full-source-list');
    if (!list) return;
    list.innerHTML = '';

    const sortEl = document.getElementById('sort-select');
    const sortBy = sortEl ? sortEl.value : 'newest';
    const query = (document.getElementById('search-input')?.value || '').toLowerCase();

    const filtered = sources.filter(s => {
        const s_uid = s.userId ? String(s.userId).trim() : '';
        const c_uid = currentUser && currentUser.studentId ? String(currentUser.studentId).trim() : '';
        const isMine = c_uid !== '' && s_uid === c_uid;

        const isLegacy = s_uid === '';
        const isShared = s.isPublic === 'true' || isLegacy;

        let visibilityMatch = false;
        if (sourceFilterState === 'mine') {
            visibilityMatch = isMine;
        } else {
            visibilityMatch = isMine || isShared;
        }

        if (!visibilityMatch) return false;

        if (query) {
            return (s.title && s.title.toLowerCase().includes(query)) ||
                (s.author && s.author.toLowerCase().includes(query)) ||
                (s.apa && s.apa.toLowerCase().includes(query));
        }
        return true;
    });

    console.log(`Debug Check: User=${currentUser?.studentId}, Total=${sources.length}, Filtered=${filtered.length}, State=${sourceFilterState}`);

    const sortedSources = [...filtered].sort((a, b) => {
        if (sortBy === 'newest') return b.id - a.id;
        if (sortBy === 'oldest') return a.id - b.id;
        if (sortBy === 'author') return (a.author || '').localeCompare(b.author || '', 'ja');
        if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '', 'ja');
        return 0;
    });

    if (sortedSources.length === 0) {
        list.innerHTML = `<div class="glass-card" style="padding: 2rem; text-align: center; color: var(--text-secondary);">一致する文献がありません。</div>`;
        return;
    }

    sortedSources.forEach(source => {
        list.appendChild(createSourceItem(source, true));
    });
    lucide.createIcons();
}

function searchSources() {
    renderSourceList();
}

function setSourceFilter(state) {
    sourceFilterState = state;
    document.getElementById('filter-source-mine').className = state === 'mine' ? 'nav-item active' : 'nav-item';
    document.getElementById('filter-source-all').className = state === 'all' ? 'nav-item active' : 'nav-item';
    renderSourceList();
}

function createSourceItem(source, full = false) {
    const isMine = currentUser && source.userId == currentUser.studentId;
    const isAdmin = currentUser && currentUser.role === 'admin';
    const canEdit = isMine || isAdmin;
    const shareBadge = source.isPublic === 'true' ? '<span class="badge badge-used" style="margin-left:8px; font-size:0.65rem;">公開</span>' : '';

    const div = document.createElement('div');
    div.className = 'glass-card source-item';
    div.style.cursor = 'pointer';
    div.onclick = (e) => {
        if (!e.target.closest('button') && !e.target.closest('.apa-copy-box')) {
            openQuoteModal(source.id);
        }
    };

    const isUsed = source.status === 'used';
    const isPending = !isUsed;

    div.innerHTML = `
        <div class="source-info" style="flex: 1;">
            <div style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 0.5rem;">
                <div style="width: 40px; height: 40px; border-radius: 12px; background: ${source.type === 'book' ? 'var(--pastel-peach)' : source.type === 'journal' ? 'var(--pastel-blue)' : 'var(--pastel-lavender)'}; display: flex; align-items: center; justify-content: center; color: var(--text-secondary);">
                    <i data-lucide="${source.type === 'book' ? 'book' : source.type === 'journal' ? 'file-text' : 'globe'}"></i>
                </div>
                <div>
                    <h3 style="margin-bottom: 0px; font-size: 1.15rem;">${source.title}${shareBadge}</h3>
                    <p class="source-meta" style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 2px;">${source.author} (${source.year}) ${!isMine ? `| 投稿者: ${source.userId || '不明'}` : ''}</p>
                </div>
            </div>
            
            <div class="apa-copy-box" style="margin-top: 0.8rem; display: flex; align-items: center; gap: 0.5rem; background: #fff; padding: 10px 14px; border-radius: 12px; border: 1px dashed var(--border-glass); cursor: pointer; transition: all 0.2s ease;" onclick="event.stopPropagation(); copyAPA(\`${source.apa}\`)" title="クリックしてコピー">
                <i data-lucide="copy" style="width: 14px; height: 14px; color: var(--text-muted);"></i>
                <code style="font-size: 0.8rem; color: var(--text-secondary); font-family: 'Zen Kaku Gothic New', sans-serif;">${source.apa}</code>
            </div>
        </div>
        
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 1rem; margin-left: 1.5rem;">
            ${canEdit ? `
                <div class="status-toggle-group" onclick="event.stopPropagation();">
                    <button class="status-btn ${isPending ? 'active pending' : ''}" onclick="setStatus('${source.id}', 'pending')">
                        キープ
                    </button>
                    <button class="status-btn ${isUsed ? 'active used' : ''}" onclick="setStatus('${source.id}', 'used')">
                        使用中
                    </button>
                </div>
            ` : `
                <span class="badge ${isUsed ? 'badge-used' : 'badge-pending'}">${isUsed ? '使用中' : 'キープ'}</span>
            `}
            
            <div style="display: flex; gap: 0.6rem;">
                <button onclick="event.stopPropagation(); openQuoteModal('${source.id}')" class="glass" style="width: 42px; height: 42px; border-radius: 12px; color: var(--accent-mint);" title="引用を記録">
                    <i data-lucide="quote" style="width: 18px; height: 18px;"></i>
                </button>
                ${source.url ? `
                    <button onclick="event.stopPropagation(); window.open('${source.url}', '_blank')" class="glass" style="width: 42px; height: 42px; border-radius: 12px; color: var(--accent-blue);" title="リンクを開く">
                        <i data-lucide="external-link" style="width: 18px; height: 18px;"></i>
                    </button>
                ` : ''}
                ${canEdit ? `
                    <button onclick="event.stopPropagation(); openSourceModal('${source.id}')" class="glass" style="width: 42px; height: 42px; border-radius: 12px; color: var(--text-secondary);" title="編集">
                        <i data-lucide="edit" style="width: 18px; height: 18px;"></i>
                    </button>
                    <button onclick="event.stopPropagation(); deleteSource('${source.id}')" class="glass" style="width: 42px; height: 42px; border-radius: 12px; color: #fb7185;" title="削除">
                        <i data-lucide="trash-2" style="width: 18px; height: 18px;"></i>
                    </button>
                ` : ''}
            </div>
        </div>
    `;
    return div;
}

function openQuoteModal(id) {
    console.log('Opening quote modal for ID:', id);
    // 型の違いを許容するため == を使用
    const source = sources.find(s => s.id == id);

    if (!source) {
        console.warn('Source not found for ID:', id, 'Available IDs:', sources.map(s => s.id));
        alert('文献データが見つかりませんでした。再読み込みをお試しください。');
        return;
    }

    // モーダルの準備
    const modal = document.getElementById('quoteModal');
    const titleField = document.getElementById('quote-modal-title');
    const idField = document.getElementById('current-source-id');

    idField.value = id;
    titleField.textContent = `「${source.title}」の引用記録`;

    // 表示
    modal.style.display = 'flex';

    // リストの描画
    renderQuotes(id);

    // アイコンの初期化
    if (window.lucide) {
        lucide.createIcons();
    }
}

function renderQuotes(sourceId) {
    const source = sources.find(s => s.id == sourceId);
    const container = document.getElementById('existing-quotes');

    if (!source) return;

    container.innerHTML = '';

    if (source.quotes && source.quotes.length > 0) {
        source.quotes.forEach(q => {
            const qDiv = document.createElement('div');
            qDiv.className = 'glass';
            qDiv.style.padding = '10px';
            qDiv.style.marginBottom = '8px';
            qDiv.style.fontSize = '0.85rem';
            qDiv.innerHTML = `
                <strong>${q.page}ページ, ${q.line}行目</strong>: "${q.text.substring(0, 50)}..."
            `;
            container.appendChild(qDiv);
        });
    } else {
        container.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.8rem;">まだ引用が記録されていません。</p>';
    }
}

// Helpers
// API Search Logic
async function searchExternalAPI() {
    const query = document.getElementById('api-search-query').value;
    const btn = document.getElementById('api-search-btn');
    const resultsContainer = document.getElementById('api-search-results');

    if (!query) {
        alert('検索キーワードを入力してください。');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="spin"></i> 検索中...';
    lucide.createIcons();

    resultsContainer.innerHTML = '';
    resultsContainer.style.display = 'block';

    try {
        // NDLサーチは安定しており、CiNiiの論文データも多く含んでいます。
        // CiNii直接APIはCORS制限が厳しいため、NDLサーチをメインに、 CiNiiをサブとして並列実行します。
        const results = await fetchNDL(query);

        if (results.length === 0) {
            resultsContainer.innerHTML = '<p style="padding: 1rem; color: var(--text-secondary); text-align: center;">該当する文献が見つかりませんでした。NDLサーチ経由で検索しています。</p>';
        } else {
            results.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = 'glass';
                itemEl.style.padding = '10px';
                itemEl.style.marginBottom = '8px';
                itemEl.style.cursor = 'pointer';
                itemEl.style.transition = 'var(--transition-smooth)';
                itemEl.style.borderLeft = `4px solid ${item.source === 'NDL' ? '#40c057' : '#20c997'}`;

                itemEl.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="flex: 1;">
                            <span style="font-size: 0.7rem; color: var(--text-secondary);">[${item.source}] ${item.type === 'book' ? '書籍' : '論文/記事'}</span>
                            <h4 style="font-size: 0.9rem; margin: 2px 0;">${item.title}</h4>
                            <p style="font-size: 0.8rem; color: var(--text-secondary);">${item.author} (${item.year})</p>
                        </div>
                        <button class="btn-primary" style="padding: 4px 8px; font-size: 0.75rem;">反映</button>
                    </div>
                `;
                itemEl.onclick = () => fillFormFromAPI(item);
                resultsContainer.appendChild(itemEl);
            });
        }

        // CiNii直接もバックグラウンドで試行（エラーでも表示を妨げない）
        fetchCiNii(query).then(ciniiResults => {
            if (ciniiResults && ciniiResults.length > 0) {
                // 重複も考慮しつつ、もし新しい結果があれば追加
                ciniiResults.forEach(item => {
                    if (!results.some(r => r.title === item.title)) {
                        const itemEl = document.createElement('div');
                        itemEl.className = 'glass';
                        itemEl.style.padding = '10px';
                        itemEl.style.marginBottom = '8px';
                        itemEl.style.cursor = 'pointer';
                        itemEl.style.borderLeft = '4px solid #20c997';
                        itemEl.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <div style="flex: 1;">
                                    <span style="font-size: 0.7rem; color: var(--text-secondary);">[CiNii] 論文</span>
                                    <h4 style="font-size: 0.9rem; margin: 2px 0;">${item.title}</h4>
                                    <p style="font-size: 0.8rem; color: var(--text-secondary);">${item.author} (${item.year})</p>
                                </div>
                                <button class="btn-primary" style="padding: 4px 8px; font-size: 0.75rem;">反映</button>
                            </div>
                        `;
                        itemEl.onclick = () => fillFormFromAPI(item);
                        resultsContainer.appendChild(itemEl);
                    }
                });
            }
        });

    } catch (error) {
        console.error('Search error:', error);
        resultsContainer.innerHTML = '<p style="padding: 1rem; color: #fb7185; text-align: center;">検索に失敗しました。キーワードを変えてお試しください。</p>';
    } finally {
        btn.disabled = false;
        btn.textContent = '検索実行';
        lucide.createIcons();
    }
}

async function fetchNDL(query) {
    try {
        const baseUrl = `https://ndlsearch.ndl.go.jp/api/opensearch?any=${encodeURIComponent(query)}&cnt=15`;
        const url = GAS_URL ? `${GAS_URL}?action=proxy&url=${encodeURIComponent(baseUrl)}` : baseUrl;

        const response = await fetch(url);
        if (!response.ok) return [];

        const text = await response.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');
        const items = xml.querySelectorAll('item');

        return Array.from(items).map(item => {
            const title = item.querySelector('title')?.textContent || '不明';
            let author = item.querySelector('author')?.textContent || item.querySelector('creator')?.textContent || '著者不明';
            const publisher = item.querySelector('publisher')?.textContent || '';
            const pubDate = item.querySelector('pubDate')?.textContent || '';
            const yearMatch = pubDate.match(/\d{4}/);
            const year = yearMatch ? yearMatch[0] : '不明';

            // カテゴリやタイトルから書籍か論文か推測
            const category = item.querySelector('category')?.textContent || '';
            const isJournal = category.includes('論文') || category.includes('記事') || title.includes('論文');

            return {
                source: 'NDL',
                type: isJournal ? 'journal' : 'book',
                title: title.replace(/^[\[\(].*?[\]\)]\s*/, ''), // [ ] や ( ) で始まる分類ラベルを除去
                author: author.replace(/[\s　]+/g, '').replace(/[著編]/g, '').split(';')[0].split(',')[0],
                year: year,
                publisher: publisher,
                journal: publisher // NDLでは雑誌名がpublisherに入ることが多い
            };
        });
    } catch (e) {
        console.error('NDL Fetch Error:', e);
        console.warn('CiNii fetch failed, trying fallback...');
        return [];
    }
}

async function fetchCiNii(query) {
    if (!GAS_URL) return [];

    const baseUrl = `https://ci.nii.ac.jp/opensearch/article?q=${encodeURIComponent(query)}&format=json&appid=${CINII_APPID}`;
    const url = `${GAS_URL}?action=proxy&url=${encodeURIComponent(baseUrl)}`;

    try {
        const response = await fetch(url);
        const text = await response.text();

        // HTMLが返ってきた場合はGASプロキシを通さず直接アクセスを試行（フォールバック）
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
            console.warn('GAS proxy returned HTML, falling back to direct fetch...');
            return fetchCiNiiDirect(query);
        }

        // JSONかどうかチェック
        if (!text.trim().startsWith('{') && !text.trim().startsWith('[')) {
            console.error('GASから不正なデータ（HTML等）が返されました。設定を確認してください。内容の冒頭:', text.substring(0, 100));
            return [];
        }

        const data = JSON.parse(text);

        const items = data['@graph']?.[0]?.['items'] || [];
        return items.map(item => {
            const title = item['title'] || '不明';
            let author = item['dc:creator'] || '著者不明';
            if (Array.isArray(author)) author = author[0];
            if (typeof author === 'object' && author['@value']) author = author['@value'];

            const pubDate = item['dc:date'] || '';
            const year = pubDate.substring(0, 4) || '不明';

            return {
                source: 'CiNii',
                type: 'journal',
                title: title,
                author: String(author).replace(/[\s　]+/g, ''),
                year: year,
                journal: item['prism:publicationName'] || '',
                volume: item['prism:volume'] || '',
                issue: item['prism:number'] || '',
                pages: item['prism:startingPage'] ? `${item['prism:startingPage']}-${item['prism:endingPage']}` : ''
            };
        });
    } catch (e) {
        console.warn('CiNii (GAS proxy) fetch failed, trying direct fallback...');
        return fetchCiNiiDirect(query);
    }
}

// GASが使えない場合のバックアップ（JSONP）
async function fetchCiNiiDirect(query) {
    return new Promise((resolve) => {
        const callbackName = 'cinii_callback_' + Math.floor(Math.random() * 1000000);
        const script = document.createElement('script');
        window[callbackName] = function (data) {
            cleanup();
            const items = data['@graph']?.[0]?.['items'] || [];
            resolve(items.map(item => parseCiNiiItem(item)));
        };
        const cleanup = () => {
            if (document.body.contains(script)) document.body.removeChild(script);
            delete window[callbackName];
        };
        script.src = `https://ci.nii.ac.jp/opensearch/article?q=${encodeURIComponent(query)}&format=json&appid=${CINII_APPID}&callback=${callbackName}`;
        script.onerror = () => { cleanup(); resolve([]); };
        document.body.appendChild(script);
        setTimeout(() => { if (window[callbackName]) { cleanup(); resolve([]); } }, 5000);
    });
}

function parseCiNiiItem(item) {
    const title = item['title'] || '不明';
    let author = item['dc:creator'] || '著者不明';
    if (Array.isArray(author)) author = author[0];
    if (typeof author === 'object' && author['@value']) author = author['@value'];
    const pubDate = item['dc:date'] || '';
    return {
        source: 'CiNii',
        type: 'journal',
        title: title,
        author: String(author).replace(/[\s　]+/g, ''),
        year: pubDate.substring(0, 4) || '不明',
        journal: item['prism:publicationName'] || '',
        volume: item['prism:volume'] || '',
        issue: item['prism:number'] || '',
        pages: item['prism:startingPage'] ? `${item['prism:startingPage']}-${item['prism:endingPage']}` : ''
    };
}

function fillFormFromAPI(item) {
    document.getElementById('source-type').value = item.type;
    document.getElementById('source-title').value = item.title;
    document.getElementById('source-author').value = item.author;
    document.getElementById('source-year').value = item.year;

    // Reset all extra fields first
    document.querySelectorAll('#extra-fields input').forEach(input => input.value = '');

    if (item.type === 'journal') {
        document.getElementById('source-journal').value = item.journal || '';
        document.getElementById('source-volume').value = item.volume || '';
        document.getElementById('source-issue').value = item.issue || '';
        document.getElementById('source-pages').value = item.pages || '';
    } else if (item.type === 'book') {
        document.getElementById('source-publisher').value = item.publisher || '';
    }

    updateExtraFields();
    // 検索結果を閉じる
    document.getElementById('api-search-results').style.display = 'none';
    // スムーズにスクロール
    document.getElementById('add-source-form').scrollIntoView({ behavior: 'smooth' });
}

function openModal(id) {
    document.getElementById(id).style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

// PDFアップロード処理
async function handlePdfUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById('pdf-status');
    statusEl.innerHTML = '<i data-lucide="loader" class="spin"></i> PDFを解析中...';
    lucide.createIcons();

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
            statusEl.textContent = `解析中... (${i} / ${pdf.numPages} ページ)`;
        }

        document.getElementById('thesis-input').value = fullText;
        statusEl.style.color = 'var(--accent-green)';
        statusEl.textContent = '解析完了！本文を反映しました。';
        checkConsistency(); // 自動的にチェックを実行
    } catch (error) {
        console.error('PDF parsing error:', error);
        statusEl.style.color = '#fb7185';
        statusEl.textContent = 'PDFの解析に失敗しました。テキストを直接貼り付けてください。';
    }
}

function copyAPA(text) {
    navigator.clipboard.writeText(text);
    alert('APAスタイルをクリップボードにコピーしました！');
}

function copyAllAPA() {
    // 使用中（used）の文献のみを抽出するか、すべてか
    // ここでは「すべて」を対象とし、著者名順に並べてコピーします
    const allApa = [...sources]
        .sort((a, b) => a.author.localeCompare(b.author, 'ja'))
        .map(s => s.apa)
        .join('\n');

    if (allApa.length === 0) {
        alert('登録されている文献がありません。');
        return;
    }

    navigator.clipboard.writeText(allApa);
    alert('すべての参考文献リストをコピーしました！（著者名順）');
}

function toggleStatus(id) {
    const s = sources.find(s => String(s.id) === String(id));
    if (s) {
        setStatus(id, s.status === 'used' ? 'pending' : 'used');
    }
}

function setStatus(id, status) {
    const s = sources.find(src => String(src.id) === String(id));
    if (s) {
        if (s.status === status) return; // 変更なしならスキップ
        s.status = status;
        localStorage.setItem('thesis_sources_v3', JSON.stringify(sources));

        // GAS同期
        if (GAS_URL) {
            fetch(GAS_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'updateStatus', id: id, status: status })
            }).catch(e => console.error('GAS status update error:', e));
        }
        renderSourceList();
        renderDashboard();
    }
}

function updateExtraFields() {
    const type = document.getElementById('source-type').value;
    const journalFields = document.querySelector('.journal-fields');
    const webFields = document.querySelector('.web-fields');
    const bookFields = document.querySelector('.book-fields');

    journalFields.style.display = type === 'journal' ? 'block' : 'none';
    webFields.style.display = type === 'web' ? 'block' : 'none';
    bookFields.style.display = type === 'book' ? 'block' : 'none';
}

// 整合性チェックロジック
function checkConsistency() {
    const text = document.getElementById('thesis-input').value;
    const resultsDiv = document.getElementById('check-results');
    resultsDiv.innerHTML = '<h3>分析結果</h3>';

    if (!text) {
        alert('解析するテキストを入力してください。');
        return;
    }

    const usedInText = sources.filter(s => {
        // 簡易チェック: 著者名がテキストに含まれているか（苗字）
        const nameParts = s.author.split(',');
        const lastName = nameParts[0].trim();
        return text.includes(lastName) && text.includes(s.year);
    });

    const resultsCard = document.createElement('div');
    resultsCard.className = 'glass-card';
    resultsCard.style.padding = '1.5rem';
    resultsCard.style.marginTop = '1rem';

    let html = `<p>登録されている <strong>${sources.length}</strong> 件の文献のうち、<strong>${usedInText.length}</strong> 件の引用（著者名, 年）が本文中で検出されました。</p>`;

    // 引用句のチェック
    const foundQuotes = [];
    sources.forEach(s => {
        if (s.quotes) {
            s.quotes.forEach(q => {
                if (text.includes(q.text)) foundQuotes.push({ source: s, quote: q });
            });
        }
    });

    html += `<p style="margin-top: 0.5rem;">登録済みの引用フレーズが <strong>${foundQuotes.length}</strong> 箇所で一致しました。</p>`;

    const markedUsed = sources.filter(s => s.status === 'used').length;
    if (usedInText.length < markedUsed) {
        html += `<p style="color: #fb7185; margin-top: 1rem;"><i data-lucide="alert-triangle"></i> <strong>注意:</strong> 「使用済み」としてマークされている文献の一部が、本文のテキストから検出されませんでした。引用漏れがないか確認してください。</p>`;
    } else {
        html += `<p style="color: var(--accent-green); margin-top: 1rem;"><i data-lucide="check-circle"></i> 全ての「使用済み」文献が正しく参照されています。</p>`;
    }

    resultsCard.innerHTML = html;
    resultsDiv.appendChild(resultsCard);
    lucide.createIcons();
}

function syncAlumniAuthorWithUser() {
    const userIdInput = document.getElementById('alumni-author-id').value;
    if (!userIdInput) return;

    const targetId = String(userIdInput).trim();
    const user = allUsers.find(u => String(u.studentId).trim() === targetId);

    if (user) {
        document.getElementById('alumni-author').value = user.name;
        document.getElementById('alumni-cohort').value = user.cohort;
        console.log(`Synced author: ${user.name} (Cohort ${user.cohort})`);

        // 名前だけでなく、その学生が「使用済み」にしている文献を自動で紐付ける提案（新規登録時のみ）
        const alumniId = document.getElementById('alumni-id').value;
        if (!alumniId) {
            autoLinkUserReferences(targetId);
        }
    } else {
        console.warn(`User NOT found for sync: ${targetId}`);
    }
}

function switchAlumniRefTab(tab) {
    const panels = ['linked', 'suggest', 'search'];
    panels.forEach(p => {
        document.getElementById(`ref-panel-${p}`).style.display = p === tab ? 'block' : 'none';
        document.getElementById(`ref-tab-${p}`).className = p === tab ? 'nav-item active' : 'nav-item';
    });
}

function filterAlumniRefSuggestions() {
    updateAlumniReferenceList();
}

function searchExternalForAlumni() {
    const query = document.getElementById('alumni-api-search-input').value;
    const btn = document.getElementById('alumni-api-search-btn');
    const resultsDiv = document.getElementById('alumni-api-results');

    if (!query) return;

    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="spin" style="width:16px;height:16px;"></i>';
    lucide.createIcons();

    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = '<p style="text-align:center;padding:1rem;font-size:0.8rem;">検索中...</p>';

    // Reuse existing fetchNDL
    fetchNDL(query).then(results => {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="search" style="width:16px;height:16px;"></i>';
        lucide.createIcons();

        if (results.length === 0) {
            resultsDiv.innerHTML = '<p style="text-align:center;padding:1rem;font-size:0.8rem;">見つかりませんでした</p>';
            return;
        }

        resultsDiv.innerHTML = results.map(item => `
            <div onclick='addExternalToLibraryAndLink(${JSON.stringify(item).replace(/'/g, "&apos;")})' 
                 style="padding: 10px; border-bottom: 1px solid #eee; cursor: pointer; transition: background 0.2s;" 
                 onmouseover="this.style.background='rgba(45, 201, 138, 0.05)'" onmouseout="this.style.background='white'">
                <div style="font-weight: 600; font-size: 0.8rem; color: var(--text-primary); line-height: 1.2;">${item.title}</div>
                <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 4px;">
                    ${item.author} (${item.year}) <span style="color:var(--accent-green);font-weight:bold;float:right;">+ 追加して紐付け</span>
                </div>
            </div>
        `).join('');
    }).catch(err => {
        console.error(err);
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="search" style="width:16px;height:16px;"></i>';
        lucide.createIcons();
        resultsDiv.innerHTML = '<p style="text-align:center;padding:1rem;font-size:0.8rem;color:red;">エラーが発生しました</p>';
    });
}

async function addExternalToLibraryAndLink(item) {
    // 1. 文献データベースに追加 (ID生成)
    const newSource = {
        ...item,
        id: Date.now(),
        status: 'used', // 卒業論文の参考文献なので基本的に「使用済み」
        userId: currentUser ? currentUser.studentId : '',
        quotes: []
    };

    sources.push(newSource);
    localStorage.setItem('thesis_sources_v3', JSON.stringify(sources));

    // 2. GAS同期（非同期でOK）
    if (GAS_URL) {
        fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'saveSource', source: newSource })
        }).catch(e => console.error('Silent source save error:', e));
    }

    // 3. この卒業論文に紐付け
    addAlumniReference(newSource.id);

    // 4. 通知とタブ切り替え
    alert(`「${item.title}」をライブラリに追加し、この論文に紐付けました。`);
    document.getElementById('alumni-api-search-input').value = '';
    document.getElementById('alumni-api-results').style.display = 'none';
    switchAlumniRefTab('linked');
}

function openManualSourceAddFromAlumni() {
    // 現在の入力を保存して sourceModal を開く（簡略化：そのまま開く）
    openSourceModal();
    // ここで保存後に紐付けるためのフラグを立てることも可能だが、一旦は手動追加のみ案内
}

function updateAlumniReferenceList() {
    const rawVal = document.getElementById('alumni-reference-ids').value || '';
    const selectedIds = String(rawVal).split(',').filter(id => id !== '');

    // 1. Linked List Rendering
    const linkedContainer = document.getElementById('selected-references-list');
    if (selectedIds.length === 0) {
        linkedContainer.innerHTML = '<div class="glass" style="padding: 1.5rem; text-align: center; color: var(--text-secondary); font-size: 0.8rem; border-style: dashed;">文献が選択されていません。「選ぶ」または「検索」から追加してください。</div>';
    } else {
        linkedContainer.innerHTML = selectedIds.map(id => {
            const s = sources.find(src => String(src.id).trim() === String(id).trim());
            if (!s) return '';
            return `
                <div class="glass" style="padding: 12px; display: flex; justify-content: space-between; align-items: center; background: white; border-radius: 12px; margin-bottom: 4px;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.title}</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px;">
                            ${s.author} (${s.year || '-'})
                            ${s.url ? `<a href="${s.url}" target="_blank" style="margin-left: 8px; color: var(--accent-blue); text-decoration: none;" onclick="event.stopPropagation();"><i data-lucide="external-link" style="width: 12px; height: 12px; vertical-align: middle;"></i></a>` : ''}
                        </div>
                    </div>
                    <div style="display: flex; gap: 4px;">
                        <button type="button" onclick="openSourceDetail('${id}')" title="詳細を表示" style="background: none; border: none; color: var(--accent-green); cursor: pointer; padding: 6px; border-radius: 6px; transition: 0.2s;" onmouseover="this.style.background='rgba(45, 201, 138, 0.1)'" onmouseout="this.style.background='none'">
                            <i data-lucide="info" style="width: 18px; height: 18px;"></i>
                        </button>
                        <button type="button" onclick="removeAlumniReference('${id}')" title="紐付けを解除" style="background: none; border: none; color: #ff6b6b; cursor: pointer; padding: 6px; border-radius: 6px; transition: 0.2s;" onmouseover="this.style.background='rgba(255, 107, 107, 0.1)'" onmouseout="this.style.background='none'">
                            <i data-lucide="trash-2" style="width: 18px; height: 18px;"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 2. Suggestions / Library List Rendering
    const suggestContainer = document.getElementById('suggested-references-list');
    const filterQuery = (document.getElementById('lib-search-input')?.value || '').toLowerCase();

    // ユーザーの「使用済み」かつ「まだ紐付いていない」ものを優先表示
    const authorId = document.getElementById('alumni-author-id').value;
    const authorRefs = sources.filter(s => {
        const isMine = String(s.userId).trim() === String(authorId).trim();
        const isNotLinked = !selectedIds.includes(String(s.id));
        const matchesSearch = s.title.toLowerCase().includes(filterQuery) || s.author.toLowerCase().includes(filterQuery);
        return isNotLinked && matchesSearch && (isMine || s.isPublic === 'true');
    }).sort((a, b) => (a.userId === authorId ? -1 : 1));

    if (authorRefs.length === 0) {
        suggestContainer.innerHTML = '<p style="text-align:center;padding:1rem;font-size:0.75rem;color:var(--text-secondary);">該当する文献がライブラリにありません</p>';
    } else {
        suggestContainer.innerHTML = authorRefs.slice(0, 15).map(s => `
            <div onclick="addAlumniReference('${s.id}')" class="glass" style="padding: 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: 0.2s;" onmouseover="this.style.transform='translateX(5px)'" onmouseout="this.style.transform='none'">
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; font-size: 0.8rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.title}</div>
                    <div style="font-size: 0.7rem; color: var(--text-secondary);">
                        ${s.author} ${s.userId === authorId ? '<span style="color:var(--accent-green);">(あなたの文献)</span>' : ''}
                    </div>
                </div>
                <div style="color: var(--accent-green);"><i data-lucide="plus-circle" style="width: 18px; height: 18px;"></i></div>
            </div>
        `).join('');
    }

    document.getElementById('alumni-ref-count').value = selectedIds.length;
    lucide.createIcons();
}

function addAlumniReference(sourceId) {
    const idsInput = document.getElementById('alumni-reference-ids');
    let ids = idsInput.value ? idsInput.value.split(',') : [];
    const sidStr = String(sourceId).trim();

    if (!ids.includes(sidStr)) {
        ids.push(sidStr);
        idsInput.value = ids.filter(id => id !== '').join(',');
        updateAlumniReferenceList();
    }
}

function renderAlumniReferenceListForView(referenceIds) {
    const listContainer = document.getElementById('view-alumni-references');
    if (!listContainer) return;

    const refIds = String(referenceIds || '').split(',').filter(id => id !== '');
    if (refIds.length === 0) {
        listContainer.innerHTML = '<p style="color:var(--text-secondary); font-size:0.8rem;">引用文献はありません</p>';
        return;
    }

    listContainer.innerHTML = refIds.map(id => {
        const s = sources.find(src => String(src.id).trim() === String(id).trim());
        if (!s) return '';
        return `
            <div class="glass" style="padding: 10px; display: flex; justify-content: space-between; align-items: center; background: white; border-radius: 12px; margin-bottom: 4px;">
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 700; font-size: 0.8rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.title}</div>
                    <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 2px;">${s.author} (${s.year || '-'})</div>
                </div>
                <button type="button" onclick="openSourceDetail('${id}')" class="btn-primary" style="padding: 4px 8px; font-size: 0.7rem;">詳細</button>
            </div>
        `;
    }).join('');
}

function removeAlumniReference(sourceId) {
    const idsInput = document.getElementById('alumni-reference-ids');
    let ids = idsInput.value ? idsInput.value.split(',') : [];
    const sidStr = String(sourceId).trim();

    ids = ids.filter(id => id !== sidStr);
    idsInput.value = ids.join(',');
    updateAlumniReferenceList();
}

// ALUMNI MANAGEMENT
function openAlumniModal(id = null) {
    // 編集権限の事前チェック
    if (id) {
        const alumni = alumniData.find(a => a.id == id);
        if (alumni) {
            const current_uid = currentUser && currentUser.studentId ? String(currentUser.studentId).trim() : '';
            const uploader_uid = alumni.userId ? String(alumni.userId).trim() : '';
            const author_uid = alumni.authorId ? String(alumni.authorId).trim() : '';
            const isAdmin = currentUser && currentUser.role === 'admin';
            const isMine = current_uid !== '' && (uploader_uid === current_uid || author_uid === current_uid);

            if (!isMine && !isAdmin) {
                console.warn('Unauthorized edit attempt prevented:', id);
                viewAlumniDetail(id);
                return;
            }
        }
    }

    const modal = document.getElementById('alumniModal');
    const form = document.getElementById('add-alumni-form');
    form.reset();
    document.getElementById('alumni-id').value = '';
    document.getElementById('alumni-file-status').style.display = 'none';
    document.getElementById('alumni-reference-ids').value = '';
    document.getElementById('alumni-is-public').checked = true; // デフォルトで共有にチェック

    // 検索入力のクリア（新しいIDを使用）
    const libSearch = document.getElementById('lib-search-input');
    if (libSearch) libSearch.value = '';

    const apiSearch = document.getElementById('alumni-api-search-input');
    if (apiSearch) apiSearch.value = '';

    const apiResults = document.getElementById('alumni-api-results');
    if (apiResults) apiResults.style.display = 'none';

    // タブを初期位置（紐付け中）に戻す
    switchAlumniRefTab('suggest');
    updateAlumniReferenceList();

    // ユーザーリストの更新（セレクトボックス）
    const userSelect = document.getElementById('alumni-author-id');
    if (userSelect) {
        userSelect.innerHTML = '<option value="">-- 登録済みの学生から選択 (推奨) --</option>';
        allUsers.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.studentId;
            opt.textContent = `${u.name} (第${u.cohort}期)`;
            userSelect.appendChild(opt);
        });
    }

    // ログイン済みならデフォルト値をセット
    if (!id && currentUser) {
        document.getElementById('alumni-author').value = currentUser.name || '';
        document.getElementById('alumni-cohort').value = currentUser.cohort || '';
        if (userSelect) userSelect.value = currentUser.studentId;
        // 在学生が自分の卒論を登録する場合、自分が「使用中」にしている文献を自動で紐付ける
        autoLinkUserReferences(currentUser.studentId);
    }

    if (id) {
        const alumni = alumniData.find(a => a.id == id);
        if (alumni) {
            switchAlumniRefTab('linked');
            document.getElementById('alumni-id').value = alumni.id || '';
            document.getElementById('alumni-year').value = alumni.year || '';
            document.getElementById('alumni-cohort').value = alumni.cohort || '';
            document.getElementById('alumni-author').value = alumni.author || '';

            // 紐付けユーザーの選択状態を復元
            if (userSelect && alumni.authorId) {
                userSelect.value = String(alumni.authorId).trim();
            }

            document.getElementById('alumni-title').value = alumni.title || '';
            document.getElementById('alumni-keywords').value = alumni.keywords || '';
            document.getElementById('alumni-ref-count').value = alumni.referenceCount || '';
            document.getElementById('alumni-abstract').value = alumni.abstract || '';
            document.getElementById('alumni-reference-ids').value = alumni.referenceIds || '';
            document.getElementById('alumni-is-public').checked = (alumni.isPublic === 'true' || alumni.isPublic === true);
            document.getElementById('alumni-modal-title').textContent = '卒業生データの編集';
            updateAlumniReferenceList();

            if (alumni.driveUrl) {
                document.getElementById('alumni-file-status').style.display = 'block';
                document.getElementById('alumni-file-status').innerHTML = `<a href="${alumni.driveUrl}" target="_blank" style="color:var(--accent-green);">アップロード済みファイルを表示</a>`;
            }
        }
    } else {
        document.getElementById('alumni-modal-title').textContent = '卒業生データの登録';
    }

    modal.style.display = 'flex';
}

function viewAlumniDetail(id) {
    const alumni = alumniData.find(a => a.id == id);
    if (!alumni) return;

    document.getElementById('view-alumni-title').textContent = alumni.title || '無題';
    document.getElementById('view-alumni-author').textContent = `${alumni.author || '不明'} (第 ${alumni.cohort || '--'} 期)`;
    document.getElementById('view-alumni-year').textContent = `${alumni.year || '不明'}年 卒業`;
    document.getElementById('view-alumni-abstract').textContent = alumni.abstract || '要旨なし';

    const fileLink = document.getElementById('view-alumni-file-link');
    if (alumni.driveUrl) {
        fileLink.style.display = 'inline-flex';
        fileLink.href = alumni.driveUrl;
    } else {
        fileLink.style.display = 'none';
    }

    renderAlumniReferenceListForView(alumni.referenceIds);
    openModal('viewAlumniModal');
}

function renderAlumniList(filter = '') {
    const container = document.getElementById('alumni-list');
    container.innerHTML = '';

    const query = filter.toLowerCase();
    const filtered = alumniData.filter(a => {
        const uploader_uid = a.userId ? String(a.userId).trim() : '';
        const author_uid = a.authorId ? String(a.authorId).trim() : '';
        const current_uid = currentUser && currentUser.studentId ? String(currentUser.studentId).trim() : '';

        // 自分がアップロードしたか、著者として紐付いている場合
        const isMine = current_uid !== '' && (uploader_uid === current_uid || author_uid === current_uid);

        // 公開設定の判定（より確実に判定する）
        const rawPublic = a.isPublic;
        const publicVal = String(rawPublic || '').toLowerCase().trim();
        const isPublicKeyExplicit = publicVal === 'true';

        // 以前の不具合でデータがずれていた場合などの考慮
        const isLegacyOrShifted = uploader_uid === 'true' || uploader_uid === 'TRUE';

        // 公開されている、または明示的に false となっていないものは共有対象とする（寛容な判定）
        const isShared = isPublicKeyExplicit || isLegacyOrShifted || publicVal === '' || publicVal === 'undefined' || publicVal === 'null';

        const matchesQuery = (a.title || '').toLowerCase().includes(query) ||
            (a.author || '').toLowerCase().includes(query) ||
            (a.keywords || '').toLowerCase().includes(query);

        if (alumniFilterState === 'mine') {
            return isMine && matchesQuery;
        } else {
            return (isMine || isShared) && matchesQuery;
        }
    });

    console.log(`Debug Alumni: User=${currentUser?.studentId}, Total=${alumniData.length}, Shown=${filtered.length}, Filter=${alumniFilterState}`);

    if (filtered.length === 0) {
        container.innerHTML = '<div class="glass-card" style="padding: 3rem; text-align: center; color: var(--text-secondary);">卒業生データが見つかりませんでした。</div>';
        return;
    }

    filtered.forEach(a => {
        try {
            const uploader_uid = a.userId ? String(a.userId).trim() : '';
            const author_uid = a.authorId ? String(a.authorId).trim() : '';
            const current_uid = currentUser && currentUser.studentId ? String(currentUser.studentId).trim() : '';

            const isMine = current_uid !== '' && (uploader_uid === current_uid || author_uid === current_uid);
            const isAdmin = currentUser && currentUser.role === 'admin';
            const canEdit = isMine || isAdmin;

            const shareBadge = a.isPublic === 'true' ? '<span class="badge badge-used" style="margin-left:8px; font-size:0.65rem;">公開中</span>' : '';
            const userLinkBadge = a.authorId ? `<span title="登録ユーザーと紐付け済み" style="margin-left:4px; color:var(--accent-green);"><i data-lucide="user-check" style="width:14px; height:14px; vertical-align:middle;"></i></span>` : '';

            const refIds = String(a.referenceIds || '').split(',').filter(id => id !== '');
            const refBadge = refIds.length > 0 ? `<span class="badge" title="紐付け参考文献: ${refIds.length}件" style="margin-left:8px; font-size:0.65rem; background: rgba(0, 122, 255, 0.1); color: var(--accent-blue);"><i data-lucide="link" style="width:10px; height:10px; margin-right:2px;"></i>${refIds.length}</span>` : '';

            const rawAbstract = (a.abstract || '').toString();
            const escapedAbstract = rawAbstract.replace(/`/g, "'").substring(0, 150);
            const showMore = rawAbstract.length > 150 ? '...' : '';

            const div = document.createElement('div');
            div.className = 'glass-card stats-card';
            div.style.textAlign = 'left';
            div.style.cursor = 'pointer';
            div.onclick = () => {
                if (canEdit) openAlumniModal(a.id);
                else viewAlumniDetail(a.id);
            };

            let refsHtml = '';
            if (refIds.length > 0) {
                const items = refIds.map(rid => {
                    const s = sources.find(src => String(src.id).trim() === String(rid).trim());
                    if (!s || !s.title) return '';
                    const safeTitle = s.title.toString().replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
                    return `<span class="badge" onclick="event.stopPropagation(); openSourceDetail('${rid}')" 
                                  style="font-size: 0.65rem; background: #f0f4f8; color: #4a5568; cursor: pointer; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border: 1px solid #e2e8f0;">
                                ${safeTitle}
                            </span>`;
                }).join('');

                refsHtml = items ? `
                    <div style="margin-top: 0.8rem;">
                        <div style="font-size: 0.75rem; font-weight: 700; color: var(--accent-blue); margin-bottom: 4px;">引用文献 (${refIds.length})</div>
                        <div style="display: flex; flex-wrap: wrap; gap: 4px;">${items}</div>
                    </div>
                ` : '';
            }

            const safeAlumniTitle = (a.title || '無題').toString().replace(/</g, "&lt;").replace(/>/g, "&gt;");

            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <h3 style="margin-bottom: 0.5rem; color: var(--text-primary); flex: 1;">${safeAlumniTitle}${shareBadge}${userLinkBadge}${refBadge}</h3>
                    <div style="display: flex; gap: 0.5rem;">
                        ${a.driveUrl ? `
                            <a href="${a.driveUrl}" target="_blank" onclick="event.stopPropagation();" class="glass" style="padding: 4px; color: var(--accent-green); display: flex;" title="PDFを開く">
                                <i data-lucide="file-text" style="width: 16px; height: 16px;"></i>
                            </a>
                        ` : ''}
                        ${canEdit ? `
                        <button onclick="event.stopPropagation(); deleteAlumni('${a.id}')" style="background:none; border:none; color: #fb7185; padding: 4px;">
                            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                        </button>
                        ` : ''}
                    </div>
                </div>
                <p class="source-meta">第 ${a.cohort || '--'} 期生 | 著者: ${a.author || '不明'} | 卒業年: ${a.year || '不明'} | 参考文献数: ${a.referenceCount || 0}</p>
                <p style="font-size: 0.85rem; margin-top: 0.5rem; color: var(--text-secondary);">キーワード: ${a.keywords || 'なし'}</p>
                <div style="margin-top: 1rem; padding: 10px; background: rgba(0,0,0,0.02); border-radius: 8px; font-size: 0.8rem; line-height: 1.4; color: var(--text-primary);">
                    <div style="font-weight: 700; margin-bottom: 4px; color: var(--accent-green);">論文要旨</div>
                    ${escapedAbstract}${showMore}
                </div>
                ${refsHtml}
            `;
            container.appendChild(div);
        } catch (e) {
            console.error('Alumni card render error:', e, a);
        }
    });
    lucide.createIcons();
}

function setAlumniFilter(state) {
    alumniFilterState = state;
    document.getElementById('filter-alumni-mine').className = state === 'mine' ? 'nav-item active' : 'nav-item';
    document.getElementById('filter-alumni-all').className = state === 'all' ? 'nav-item active' : 'nav-item';
    renderAlumniList();
}

async function saveAlumniByForm() {
    const id = document.getElementById('alumni-id').value || Date.now().toString();
    const existingAlumni = alumniData.find(a => a.id == id);

    const alumni = {
        id: id,
        year: document.getElementById('alumni-year').value,
        cohort: document.getElementById('alumni-cohort').value,
        author: document.getElementById('alumni-author').value,
        authorId: document.getElementById('alumni-author-id').value,
        title: document.getElementById('alumni-title').value,
        keywords: document.getElementById('alumni-keywords').value,
        referenceCount: document.getElementById('alumni-ref-count').value,
        abstract: document.getElementById('alumni-abstract').value,
        referenceIds: document.getElementById('alumni-reference-ids').value,
        driveUrl: existingAlumni ? existingAlumni.driveUrl : '',
        userId: (existingAlumni && existingAlumni.userId) ? existingAlumni.userId : (currentUser ? currentUser.studentId : ''),
        isPublic: document.getElementById('alumni-is-public').checked ? 'true' : 'false'
    };

    const fileInput = document.getElementById('alumni-file');
    const file = fileInput.files[0];
    let payload = { action: 'saveAlumni', alumni: alumni };

    if (file) {
        // ファイルをBase64に変換
        const reader = new FileReader();
        const base64Promise = new Promise((resolve) => {
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(file);
        });
        payload.fileData = await base64Promise;
        payload.fileName = `${alumni.author}_${alumni.year}_thesis.pdf`;
    }

    // 保存中の通知（簡易）
    const btn = document.querySelector('#add-alumni-form button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = '保存中...';
    btn.disabled = true;

    // UI更新 (暫定)
    const index = alumniData.findIndex(a => a.id == id);
    if (index > -1) alumniData[index] = alumni;
    else alumniData.push(alumni);
    renderAlumniList();

    // GAS同期
    if (GAS_URL) {
        try {
            await fetch(GAS_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(payload)
            });

            // サーバー側の処理（フォルダ作成等）に少し余裕を持たせる
            setTimeout(async () => {
                alert('保存が完了しました。');
                if (GAS_URL) await refreshAlumniFromGAS();
            }, 1500);

        } catch (e) {
            console.error('GAS Alumni Save Error:', e);
            alert('保存中にエラーが発生しました。コンソールを確認してください。');
        }
    }

    btn.textContent = originalText;
    btn.disabled = false;
    closeModal('alumniModal');
}

async function deleteAlumni(id) {
    if (!confirm('このデータを削除しますか？')) return;

    alumniData = alumniData.filter(a => a.id != id);
    renderAlumniList();

    if (GAS_URL) {
        try {
            await fetch(GAS_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'deleteAlumni', id: id })
            });
        } catch (e) {
            console.error('GAS Alumni Delete Error:', e);
        }
    }
}

async function deleteSource(id) {
    if (!confirm('この文献を削除しますか？関連する引用記録も消去されます。')) return;
    sources = sources.filter(s => s.id != id);
    localStorage.setItem('thesis_sources_v3', JSON.stringify(sources));
    renderSourceList();
    renderDashboard();
    if (GAS_URL) {
        fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'deleteSource', id: id })
        });
    }
}

function searchAlumni() {
    const query = document.getElementById('alumni-search').value;
    renderAlumniList(query);
}
// AUTH & USER MANAGEMENT
function toggleAuthView(view) {
    document.getElementById('login-form-view').style.display = view === 'login' ? 'block' : 'none';
    document.getElementById('register-form-view').style.display = view === 'register' ? 'block' : 'none';
}

async function handleLogin(e) {
    e.preventDefault();
    const sid = document.getElementById('login-student-id').value;
    const pass = document.getElementById('login-password').value;

    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = '認証中...';
    btn.disabled = true;

    try {
        const response = await fetch(`${GAS_URL}?action=login&studentId=${sid}&password=${pass}`);
        const data = await response.json();
        if (data.status === 'success') {
            currentUser = data.user;
            localStorage.setItem('thesis_user', JSON.stringify(currentUser));
            updateAuthUI();
            closeModal('authModal');
            // サクセス時のアラートをカットし、即座に遷移後のUIを表示
        } else {
            alert('学籍番号またはパスワードが正しくありません。');
            btn.textContent = originalText;
            btn.disabled = false;
        }
    } catch (e) {
        console.error('Login error:', e);
        alert('ログイン処理中にエラーが発生しました。');
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const user = {
        name: document.getElementById('reg-name').value,
        studentId: document.getElementById('reg-student-id').value,
        cohort: document.getElementById('reg-cohort').value,
        role: document.getElementById('reg-role').value,
        password: document.getElementById('reg-password').value,
        createdAt: new Date().toISOString()
    };

    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = '登録中...';
    btn.disabled = true;

    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'registerUser', user: user })
        });

        // 登録完了後、アラートを待たずにログイン画面へ切り替え
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
            toggleAuthView('login');
        }, 1000);
    } catch (e) {
        console.error('Register error:', e);
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

function updateAuthUI() {
    const navName = document.getElementById('user-display-name');
    const loggedOutView = document.getElementById('logged-out-view');
    const loggedInView = document.getElementById('logged-in-view');
    const authView = document.getElementById('initial-auth-view');
    const appContent = document.getElementById('app-content');

    if (currentUser) {
        if (navName) navName.textContent = currentUser.name;
        if (loggedOutView) loggedOutView.style.display = 'none';
        if (loggedInView) {
            loggedInView.style.display = 'block';
            const pName = document.getElementById('profile-name');
            const pSid = document.getElementById('profile-student-id');
            const pCoh = document.getElementById('profile-cohort');
            if (pName) pName.textContent = currentUser.name;
            if (pSid) pSid.textContent = currentUser.studentId;
            if (pCoh) pCoh.textContent = currentUser.cohort;

            const roleEl = document.getElementById('profile-role');
            if (roleEl) {
                roleEl.textContent = currentUser.role === 'admin' ? '管理者' : 'ゼミ生';
                roleEl.className = `badge ${currentUser.role === 'admin' ? 'badge-used' : 'badge-pending'}`;
            }
        }
        // Show app, hide initial auth with animation
        if (authView) authView.style.display = 'none';
        if (appContent) {
            appContent.style.display = 'block';
            setTimeout(() => appContent.style.opacity = '1', 50);
        }
    } else {
        if (navName) navName.textContent = 'ログイン';
        if (loggedOutView) loggedOutView.style.display = 'block';
        if (loggedInView) loggedInView.style.display = 'none';

        // Hide app, show initial auth
        if (appContent) {
            appContent.style.display = 'none';
            appContent.style.opacity = '0';
        }
        if (authView) authView.style.display = 'flex';
    }
}

function openAuthModal(view = 'login') {
    toggleAuthView(view);
    openModal('authModal');
}

function logout() {
    if (confirm('ログアウトしますか？')) {
        currentUser = null;
        localStorage.removeItem('thesis_user');
        updateAuthUI();
        switchTab('dashboard');
    }
}

async function deleteAccount() {
    if (confirm('本当に退会しますか？この操作は取り消せません。')) {
        const sid = currentUser.studentId;
        try {
            await fetch(GAS_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'deleteUser', studentId: sid })
            });
            currentUser = null;
            localStorage.removeItem('thesis_user');
            updateAuthUI();
            switchTab('dashboard');
            alert('退会処理が完了しました。');
        } catch (e) {
            alert('エラーが発生しました。');
        }
    }
}

function openSourceDetail(id) {
    const s = sources.find(src => String(src.id).trim() === String(id).trim());
    if (!s) {
        alert('文献データが見つかりませんでした。');
        return;
    }

    let url = (s.url || '').trim();
    if (url && !url.startsWith('http')) {
        url = 'https://' + url;
    }

    if (url) {
        // Confirm before opening URL
        if (confirm(`【${s.title}】\n\n登録済みのURLを開きますか？`)) {
            window.open(url, '_blank');
        }
    } else {
        // URLがない場合、カスタムモーダルを表示
        pendingExternalSource = s;
        document.getElementById('sl-title').textContent = s.title;
        document.getElementById('sl-meta').textContent = `${s.author || '著者不明'} (${s.year || '-'})`;
        openModal('sourceLinkModal');
    }
}

function executeExternalJump(type) {
    if (!pendingExternalSource) return;
    const s = pendingExternalSource;
    const query = encodeURIComponent(s.title + ' ' + (s.author || ''));

    if (type === 'ndl') {
        // NDLサーチの検索結果画面へ直接ジャンプ
        const ndlUrl = `https://ndlsearch.ndl.go.jp/search?keyword=${query}`;
        window.open(ndlUrl, '_blank');
    } else {
        // CiNii Research (最新の統合検索) の検索結果画面へ直接ジャンプ
        const ciniiUrl = `https://cir.nii.ac.jp/all?q=${query}`;
        window.open(ciniiUrl, '_blank');
    }

    closeModal('sourceLinkModal');
    pendingExternalSource = null;
}

function openEditProfile() {
    alert('プロフィールの直接編集機能は開発中です。現在は再登録で上書きできます。');
}

// UI Utilities
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
        // Ensure icons are rendered inside the modal
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
}

function autoLinkUserReferences(studentId) {
    if (!studentId || !sources || sources.length === 0) return;

    const targetId = String(studentId).toLowerCase().trim();
    // 自分の文献かつ、ステータスが「使用済み (used)」のものを探す
    const userRefs = sources.filter(s => {
        const s_uid = s.userId ? String(s.userId).toLowerCase().trim() : '';
        const s_status = s.status ? String(s.status).toLowerCase().trim() : '';
        return s_uid === targetId && s_status === 'used';
    });

    if (userRefs.length > 0) {
        const currentIdsRaw = document.getElementById('alumni-reference-ids').value;
        const currentIds = currentIdsRaw ? currentIdsRaw.split(',') : [];
        const newIds = [...new Set([...currentIds, ...userRefs.map(s => String(s.id))])].filter(id => id !== '');
        document.getElementById('alumni-reference-ids').value = newIds.join(',');
        updateAlumniReferenceList();
        console.log(`Auto-linked ${userRefs.length} references for user: ${studentId}`);
    }
}
