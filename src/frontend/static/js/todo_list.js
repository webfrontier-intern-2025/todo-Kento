let allTodos = [];
let allTags = [];
let currentStatusFilter = 'all';
let currentTagFilter = 'all';

document.addEventListener('DOMContentLoaded', function() {
    loadTags();
    loadTodos();
    setupEventListeners();
});

function setupEventListeners() {
    // フィルター変更
    document.getElementById('statusFilter').addEventListener('change', function(e) {
        currentStatusFilter = e.target.value;
        filterAndDisplayTodos();
    });

    document.getElementById('tagFilter').addEventListener('change', function(e) {
        currentTagFilter = e.target.value;
        filterAndDisplayTodos();
    });
}

// タグを読み込み
async function loadTags() {
    try {
        const response = await fetch('/v1/tag');
        if (!response.ok) throw new Error('タグの取得に失敗しました');
        
        allTags = await response.json();
        populateTagFilter();
    } catch (error) {
        console.error('Error loading tags:', error);
    }
}

// タグフィルターを設定
function populateTagFilter() {
    const tagFilter = document.getElementById('tagFilter');
    
    allTags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag.id;
        option.textContent = tag.name;
        tagFilter.appendChild(option);
    });
}

// TODOを読み込み
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

// フィルタリングして表示
function filterAndDisplayTodos() {
    let filteredTodos = allTodos;

    // 状態フィルター
    if (currentStatusFilter === 'active') {
        filteredTodos = filteredTodos.filter(todo => !todo.completed);
    } else if (currentStatusFilter === 'completed') {
        filteredTodos = filteredTodos.filter(todo => todo.completed);
    }

    // タグフィルター
    if (currentTagFilter !== 'all') {
        const tagId = parseInt(currentTagFilter);
        filteredTodos = filteredTodos.filter(todo => 
            todo.tags && todo.tags.some(tag => tag.id === tagId)
        );
    }

    displayTodos(filteredTodos);
}

// TODOを表示
function displayTodos(todos) {
    const tableBody = document.getElementById('todoTableBody');
    
    if (todos.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="empty-state">該当するTODOがありません</td></tr>';
        return;
    }

    tableBody.innerHTML = todos.map(todo => {
        const tagsHtml = todo.tags && todo.tags.length > 0 
            ? `<div class="todo-tags">${todo.tags.map(tag => 
                `<span class="tag" style="background-color: ${tag.color}">${escapeHtml(tag.name)}</span>`
              ).join('')}</div>`
            : '<span style="color: #999;">なし</span>';
        
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

// 完了状態を切り替え
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
        await loadTodos(); // ロールバック表示
    }
}

// 統計情報を更新
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

// HTMLエスケープ
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}