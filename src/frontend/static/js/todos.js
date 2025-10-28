let availableTags = [];
let currentTodos = [];

document.addEventListener('DOMContentLoaded', function() {
    loadTags();
    loadTodos();
    setupEventListeners();
});

function setupEventListeners() {
    // TODO追加
    document.getElementById('addButton').addEventListener('click', addTodo);
    document.getElementById('todoInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addTodo();
        }
    });

    // クイックタグ追加
    document.getElementById('quickAddTagButton').addEventListener('click', quickAddTag);
    document.getElementById('quickTagInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            quickAddTag();
        }
    });

    // TODO編集モーダル
    document.querySelector('.close-todo-modal').addEventListener('click', closeEditModal);
    document.getElementById('cancel-edit-todo').addEventListener('click', closeEditModal);
    
    // モーダル内削除ボタン
    document.getElementById('delete-todo-in-modal').addEventListener('click', function() {
        const id = document.getElementById('edit-todo-id').value;
        deleteTodoFromModal(parseInt(id));
    });
    
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('edit-todo-modal');
        if (e.target === modal) {
            closeEditModal();
        }
    });

    document.getElementById('edit-todo-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        await updateTodo();
    });
}

// タグを読み込み
async function loadTags() {
    try {
        const response = await fetch('/v1/tag');
        if (!response.ok) throw new Error('タグの読み込みに失敗しました');
        
        availableTags = await response.json();
        displayTagSelection();
    } catch (error) {
        console.error('Error loading tags:', error);
        showNotification('タグの読み込みに失敗しました', 'danger');
    }
}

// タグ選択エリアを表示
function displayTagSelection() {
    const tagSelection = document.getElementById('tagSelection');
    
    if (availableTags.length === 0) {
        tagSelection.innerHTML = '<p style="color: #999; margin: 0;">タグがありません。下のフォームから追加できます。</p>';
        return;
    }

    tagSelection.innerHTML = availableTags.map(tag => `
        <label class="tag-checkbox" style="--tag-color: ${tag.color}">
            <input type="checkbox" value="${tag.id}" data-tag-name="${escapeHtml(tag.name)}">
            <span>${escapeHtml(tag.name)}</span>
        </label>
    `).join('');

    // チェックボックスの変更イベント
    const checkboxes = tagSelection.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const label = this.closest('.tag-checkbox');
            if (this.checked) {
                label.classList.add('checked');
            } else {
                label.classList.remove('checked');
            }
        });
    });
}

// クイックタグ追加
async function quickAddTag() {
    const input = document.getElementById('quickTagInput');
    const colorInput = document.getElementById('quickTagColor');
    const name = input.value.trim();
    const color = colorInput.value;
    
    // 未入力チェック
    if (!name) {
        input.classList.add('field-error-highlight');
        showNotification('タグ名を入力してください', 'warning');
        
        // 強調表示を3秒後に解除
        setTimeout(() => {
            input.classList.remove('field-error-highlight');
        }, 3000);
        
        input.focus();
        return;
    }

    // エラー表示をクリア
    input.classList.remove('field-error-highlight');

    try {
        const response = await fetch('/v1/tag/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, color })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'タグの追加に失敗しました');
        }

        const newTag = await response.json();
        
        // タグリストを再読み込み
        await loadTags();
        
        // 追加したタグを自動的にチェック
        const checkbox = document.querySelector(`input[type="checkbox"][value="${newTag.id}"]`);
        if (checkbox) {
            checkbox.checked = true;
            checkbox.closest('.tag-checkbox').classList.add('checked');
        }
        
        input.value = '';
        colorInput.value = '#667eea';
        
        showNotification(`タグ「${name}」を追加しました`);
    } catch (error) {
        console.error('Error adding tag:', error);
        showNotification(error.message, 'danger');
    }
}

// 通知を表示
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 2000);
}

// TODOを読み込み
async function loadTodos() {
    try {
        const response = await fetch('/v1/todo');
        if (!response.ok) throw new Error('TODOの読み込みに失敗しました');
        
        currentTodos = await response.json();
        displayTodos(currentTodos);
    } catch (error) {
        console.error('Error loading todos:', error);
        showNotification('TODOの読み込みに失敗しました', 'danger');
    }
}

// TODOを表示
function displayTodos(todos) {
    const todoList = document.getElementById('todoList');
    
    if (todos.length === 0) {
        todoList.innerHTML = '<div class="empty-state">TODOがありません。上のフォームから追加できます。</div>';
        return;
    }

    todoList.innerHTML = todos.map(todo => {
        const tagsHtml = todo.tags && todo.tags.length > 0 
            ? `<div class="todo-tags">${todo.tags.map(tag => 
                `<span class="tag" style="background-color: ${tag.color}">${escapeHtml(tag.name)}</span>`
              ).join('')}</div>`
            : '';
        
        return `
            <li class="todo-item ${todo.completed ? 'completed' : ''}">
                <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} 
                       onchange="toggleComplete(${todo.id}, this.checked)">
                <span class="todo-content">${escapeHtml(todo.content)}</span>
                ${tagsHtml}
                <button class="edit-todo-button" onclick="openEditModal(${todo.id})">編集</button>
            </li>
        `;
    }).join('');
}

// TODOを追加
async function addTodo() {
    const input = document.getElementById('todoInput');
    const content = input.value.trim();
    
    // 未入力チェック
    if (!content) {
        input.classList.add('field-error-highlight');
        showNotification('TODOを入力してください', 'warning');
        
        // 強調表示を3秒後に解除
        setTimeout(() => {
            input.classList.remove('field-error-highlight');
        }, 3000);
        
        input.focus();
        return;
    }

    // エラー表示をクリア
    input.classList.remove('field-error-highlight');

    // 選択されたタグIDを取得
    const selectedTags = Array.from(document.querySelectorAll('#tagSelection input[type="checkbox"]:checked'))
        .map(cb => parseInt(cb.value));

    try {
        const response = await fetch('/v1/todo/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content,
                tag_ids: selectedTags
            })
        });

        if (!response.ok) throw new Error('TODOの追加に失敗しました');

        input.value = '';
        
        // チェックボックスをリセット
        document.querySelectorAll('#tagSelection input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
            cb.closest('.tag-checkbox').classList.remove('checked');
        });
        
        await loadTodos();
        showNotification('TODOを追加しました');
    } catch (error) {
        console.error('Error adding todo:', error);
        showNotification(error.message, 'danger');
    }
}

// 編集モーダルを開く
function openEditModal(id) {
    const todo = currentTodos.find(t => t.id === id);
    if (!todo) return;

    document.getElementById('edit-todo-id').value = id;
    const contentInput = document.getElementById('edit-todo-content');
    contentInput.value = todo.content;
    
    // エラー表示をクリア
    contentInput.classList.remove('field-error-highlight');

    // タグ選択を表示
    const editTagSelection = document.getElementById('edit-tag-selection');
    editTagSelection.innerHTML = availableTags.map(tag => {
        const isChecked = todo.tags && todo.tags.some(t => t.id === tag.id);
        return `
            <label class="tag-checkbox ${isChecked ? 'checked' : ''}" style="--tag-color: ${tag.color}">
                <input type="checkbox" value="${tag.id}" ${isChecked ? 'checked' : ''}>
                <span>${escapeHtml(tag.name)}</span>
            </label>
        `;
    }).join('');

    // チェックボックスの変更イベント
    const checkboxes = editTagSelection.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const label = this.closest('.tag-checkbox');
            if (this.checked) {
                label.classList.add('checked');
            } else {
                label.classList.remove('checked');
            }
        });
    });

    document.getElementById('edit-todo-modal').style.display = 'flex';
}

// 編集モーダルを閉じる
function closeEditModal() {
    document.getElementById('edit-todo-modal').style.display = 'none';
    document.getElementById('edit-todo-form').reset();
    
    // エラー表示をクリア
    const contentInput = document.getElementById('edit-todo-content');
    contentInput.classList.remove('field-error-highlight');
}

// TODOを更新
async function updateTodo() {
    const id = document.getElementById('edit-todo-id').value;
    const contentInput = document.getElementById('edit-todo-content');
    const content = contentInput.value.trim();

    // 未入力チェック
    if (!content) {
        contentInput.classList.add('field-error-highlight');
        showNotification('内容を入力してください', 'warning');
        
        // 強調表示を3秒後に解除
        setTimeout(() => {
            contentInput.classList.remove('field-error-highlight');
        }, 3000);
        
        contentInput.focus();
        return;
    }

    // エラー表示をクリア
    contentInput.classList.remove('field-error-highlight');

    // 選択されたタグIDを取得
    const selectedTags = Array.from(document.querySelectorAll('#edit-tag-selection input[type="checkbox"]:checked'))
        .map(cb => parseInt(cb.value));

    try {
        const response = await fetch(`/v1/todo/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content,
                tag_ids: selectedTags
            })
        });

        if (!response.ok) throw new Error('更新に失敗しました');

        closeEditModal();
        await loadTodos();
        showNotification('TODOを更新しました');
    } catch (error) {
        console.error('Error updating todo:', error);
        showNotification(error.message, 'danger');
    }
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
        console.error('Error toggling complete:', error);
        showNotification('更新に失敗しました', 'danger');
    }
}

// モーダル内からTODOを削除
async function deleteTodoFromModal(id) {
    if (!confirm('このTODOを削除しますか?')) {
        return;
    }

    try {
        const response = await fetch(`/v1/todo/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('削除に失敗しました');

        closeEditModal();
        await loadTodos();
        showNotification('TODOを削除しました', 'danger');
    } catch (error) {
        console.error('Error deleting todo:', error);
        showNotification(error.message, 'danger');
    }
}

// HTMLエスケープ
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}