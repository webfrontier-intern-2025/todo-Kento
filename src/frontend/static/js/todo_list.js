// 全体概要（処理の流れ）:
// - ページ読み込み時にタグとTODOを取得 -> 表示と統計を初期化。
// - フィルター操作（状態・タグ）はクライアント側で実行し、表示を更新。
// - 完了切替時はサーバーへ PUT を送り、成功後に再取得して表示を最新化。

let allTodos = [];
let allTags = [];
let currentStatusFilter = 'all';
let currentTagFilter = 'all';

document.addEventListener('DOMContentLoaded', function() {
    // 初期化: タグとTODOの取得、イベントリスナー登録
    loadTags();
    loadTodos();
    setupEventListeners();
});

function setupEventListeners() {
    // フィルター操作のイベント登録
    // 流れ: select の change を監視 -> フィルター条件を更新 -> 表示を再描画
    document.getElementById('statusFilter').addEventListener('change', function(e) {
        currentStatusFilter = e.target.value;
        filterAndDisplayTodos();
    });

    document.getElementById('tagFilter').addEventListener('change', function(e) {
        currentTagFilter = e.target.value;
        filterAndDisplayTodos();
    });
}

// タグを読み込み（API 呼び出し）
// 流れ: GET /v1/tag -> allTags を更新 -> タグフィルターを構築
async function loadTags() {
    try {
        const response = await fetch('/v1/tag');
        if (!response.ok) throw new Error('タグの取得に失敗しました');
        
        allTags = await response.json();
        populateTagFilter();
    } catch (error) {
        console.error('Error loading tags:', error);
        // UI 側で軽いフォールバック（console のみ）
    }
}

// タグフィルターを設定（描画ロジック）
// 流れ: allTags を option 要素に変換して select に追加
function populateTagFilter() {
    const tagFilter = document.getElementById('tagFilter');
    
    // 既存のオプションをクリア（必要時）
    // tagFilter.innerHTML = '<option value="all">すべて</option>'; // 初期 HTML によっては不要

    allTags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag.id;
        option.textContent = tag.name;
        tagFilter.appendChild(option);
    });
}

// TODOを読み込み（API 呼び出し）
// 流れ: GET /v1/todo -> allTodos を更新 -> フィルタ適用と統計更新
async function loadTodos() {
    try {
        const response = await fetch('/v1/todo');
        if (!response.ok) throw new Error('TODOの取得に失敗しました');
        
        allTodos = await response.json();
        filterAndDisplayTodos();
        updateStats();
    } catch (error) {
        console.error('Error loading todos:', error);
        alert('TODOの読み込みに失敗しました');
    }
}

// フィルタリングと表示（状態・タグの組合せ）
// 流れ: 現在のフィルター条件で allTodos を絞り -> displayTodos に渡す
function filterAndDisplayTodos() {
    let filteredTodos = allTodos;

    // 状態フィルター: 未完了 / 完了 / 全て
    if (currentStatusFilter === 'active') {
        filteredTodos = filteredTodos.filter(todo => !todo.completed);
    } else if (currentStatusFilter === 'completed') {
        filteredTodos = filteredTodos.filter(todo => todo.completed);
    }

    // タグフィルター: 特定のタグIDが選択されている場合に絞り込み
    if (currentTagFilter !== 'all') {
        const tagId = parseInt(currentTagFilter);
        filteredTodos = filteredTodos.filter(todo => 
            todo.tags && todo.tags.some(tag => tag.id === tagId)
        );
    }

    displayTodos(filteredTodos);
}

// TODOを表示（テーブル描画）
// 流れ: 各 TODO を行要素に変換して table body に挿入
function displayTodos(todos) {
    const tableBody = document.getElementById('todoTableBody');
    
    if (todos.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="empty-state">該当するTODOがありません</td></tr>';
        return;
    }

    tableBody.innerHTML = todos.map(todo => {
        // タグの HTML 生成（存在しない場合は「なし」を表示）
        const tagsHtml = todo.tags && todo.tags.length > 0 
            ? `<div class="todo-tags">${todo.tags.map(tag => 
                `<span class="tag" style="background-color: ${tag.color}">${escapeHtml(tag.name)}</span>`
              ).join('')}</div>`
            : '<span style="color: #999;">なし</span>';
        
        // 作成日時をローカル表示形式に整形
        const createdDate = new Date(todo.created_at).toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <tr class="${todo.completed ? 'completed' : ''}">
                <td class="td-center">
                    <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} 
                           onchange="toggleComplete(${todo.id}, this.checked)">
                </td>
                <td class="${todo.completed ? 'text-strike' : ''}">${escapeHtml(todo.content)}</td>
                <td>${tagsHtml}</td>
                <td>${createdDate}</td>
            </tr>
        `;
    }).join('');
}

// 完了状態を切り替え（API 呼び出し）
// 流れ: PUT /v1/todo/{id} に completed を送信 -> 成功時に loadTodos で再取得
async function toggleComplete(id, completed) {
    try {
        const response = await fetch(`/v1/todo/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ completed })
        });

        if (!response.ok) throw new Error('更新に失敗しました');
        
        await loadTodos();
    } catch (error) {
        console.error('Error updating todo:', error);
        alert(error.message);
        await loadTodos(); // UI を最新状態に戻す（ロールバック表示）
    }
}

// 統計情報を更新（表示）
// 流れ: 全 TODO を元に total/active/completed と完了率を計算して DOM に反映
function updateStats() {
    const total = allTodos.length;
    const completed = allTodos.filter(todo => todo.completed).length;
    const active = total - completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    document.getElementById('totalCount').textContent = total;
    document.getElementById('activeCount').textContent = active;
    document.getElementById('completedCount').textContent = completed;
    document.getElementById('completionRate').textContent = `${completionRate}%`;
}

// HTMLエスケープ（XSS対策の簡易実装）
// 流れ: DOM の textContent を使って安全にエスケープした値を返す
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}