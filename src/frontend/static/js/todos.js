// 全体概要（処理の流れ）:
// - ページ読み込み後にタグとTODOをサーバーから取得して描画する。
// - ユーザー操作（追加・編集・削除・完了切替・タグ追加）は各イベントで API を呼び出し、完了後に一覧を再取得して UI を更新する。
// - 通知は showNotification で表示し、フォームの簡易バリデーションや視覚フィードバックを行う。

let availableTags = [];
let currentTodos = [];

document.addEventListener('DOMContentLoaded', function() {
    // ページ初期化: タグ・TODOの読み込みとイベントリスナー設定
    loadTags();
    loadTodos();
    setupEventListeners();
});

function setupEventListeners() {
    // 各種 UI のイベントをまとめて登録する（初期表示時に一度だけ呼ぶ）
    const addBtn = document.getElementById('addButton');
    if (addBtn) addBtn.addEventListener('click', addTodo);

    const todoInput = document.getElementById('todoInput');
    if (todoInput) {
        todoInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addTodo();
            }
        });
    }

    const quickAddBtn = document.getElementById('quickAddTagButton');
    if (quickAddBtn) quickAddBtn.addEventListener('click', quickAddTag);

    const quickTagInput = document.getElementById('quickTagInput');
    if (quickTagInput) {
        quickTagInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') quickAddTag();
        });
    }

    const closeModalBtns = document.querySelectorAll('.close-todo-modal');
    closeModalBtns.forEach(btn => btn.addEventListener('click', closeEditModal));
    const cancelEdit = document.getElementById('cancel-edit-todo');
    if (cancelEdit) cancelEdit.addEventListener('click', closeEditModal);

    const deleteInModal = document.getElementById('delete-todo-in-modal');
    if (deleteInModal) {
        deleteInModal.addEventListener('click', function() {
            const id = document.getElementById('edit-todo-id').value;
            deleteTodoFromModal(parseInt(id, 10));
        });
    }

    const editForm = document.getElementById('edit-todo-form');
    if (editForm) {
        editForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await updateTodo();
        });
    }

    // モーダル外クリックで閉じる
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('edit-todo-modal');
        if (e.target === modal) {
            closeEditModal();
        }
    });
}

// タグを読み込み（API 呼び出し）
// 流れ: GET /v1/tag -> availableTags を更新 -> タグ選択 UI を再描画
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

// タグ選択エリアを表示（描画ロジック）
// 流れ: availableTags を元にチェックボックスを生成 -> チェック状態に応じたスタイルイベントを設定
function displayTagSelection() {
    const tagSelection = document.getElementById('tagSelection');
    if (!tagSelection) return;
    
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

    // チェックボックスの変更イベント: チェック時にラベルに checked クラスを付与/除去して視覚化する
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

// クイックタグ追加（API 呼び出し + 再描画）
// 流れ: 入力検証 -> POST /v1/tag/ -> 成功時は loadTags() で再取得し、新規タグを自動チェック
async function quickAddTag() {
    const input = document.getElementById('quickTagInput');
    const colorInput = document.getElementById('quickTagColor');
    if (!input || !colorInput) return;
    const name = input.value.trim();
    const color = colorInput.value;
    
    // 未入力チェック（簡易バリデーション）
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
        
        // タグリストを再読み込みして UI を更新
        await loadTags();
        
        // 追加したタグを自動的にチェックして視覚的に反映
        const checkbox = document.querySelector(`input[type="checkbox"][value="${newTag.id}"]`);
        if (checkbox) {
            checkbox.checked = true;
            checkbox.closest('.tag-checkbox').classList.add('checked');
        }
        
        // 入力をリセット
        input.value = '';
        colorInput.value = '#667eea';
        
        showNotification(`タグ「${name}」を追加しました`);
    } catch (error) {
        console.error('Error adding tag:', error);
        showNotification(error.message, 'danger');
    }
}

// 通知を表示（UI ヘルパー）
// 流れ: DOM 要素を作成 -> 一時表示 -> フェードアウトして削除
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

// TODOを読み込み（API 呼び出し）
// 流れ: GET /v1/todo -> currentTodos を更新 -> displayTodos() で描画
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

// TODOを表示（描画ロジック）
// 流れ: currentTodos を HTML に変換して innerHTML を更新。タグがあればタグも表示。
function displayTodos(todos) {
    const todoList = document.getElementById('todoList');
    if (!todoList) return;
    
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

// TODOを追加（API 呼び出し）
// 流れ: 入力検証 -> 選択タグを収集 -> POST /v1/todo/ -> 成功時に input リセット・チェックボックス解除・loadTodos()
async function addTodo() {
    const input = document.getElementById('todoInput');
    if (!input) return;
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

        // 成功時の UI 更新
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

// 編集モーダルを開く（編集用フォームに値をセット）
// 流れ: currentTodos から該当 TODO を取得 -> フォームにセット -> タグチェックボックスを生成 -> モーダル表示
function openEditModal(id) {
    const todo = currentTodos.find(t => t.id === id);
    if (!todo) return;

    const idEl = document.getElementById('edit-todo-id');
    if (idEl) idEl.value = id;
    const contentInput = document.getElementById('edit-todo-content');
    if (contentInput) contentInput.value = todo.content;
    
    // エラー表示をクリア
    if (contentInput) contentInput.classList.remove('field-error-highlight');

    // タグ選択を表示（編集用）
    const editTagSelection = document.getElementById('edit-tag-selection');
    if (editTagSelection) {
        editTagSelection.innerHTML = availableTags.map(tag => {
            const isChecked = todo.tags && todo.tags.some(t => t.id === tag.id);
            return `
                <label class="tag-checkbox ${isChecked ? 'checked' : ''}" style="--tag-color: ${tag.color}">
                    <input type="checkbox" value="${tag.id}" ${isChecked ? 'checked' : ''}>
                    <span>${escapeHtml(tag.name)}</span>
                </label>
            `;
        }).join('');

        // チェックボックスの変更イベントを設定（表示クラスの切替）
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
    }

    // モーダル表示
    const modal = document.getElementById('edit-todo-modal');
    if (modal) modal.style.display = 'flex';
}

// 編集モーダルを閉じる（リセット処理）
// 流れ: モーダル非表示 -> フォームリセット -> エラー表示クリア
function closeEditModal() {
    const modal = document.getElementById('edit-todo-modal');
    if (modal) modal.style.display = 'none';
    const form = document.getElementById('edit-todo-form');
    if (form) form.reset();
    
    // エラー表示をクリア
    const contentInput = document.getElementById('edit-todo-content');
    if (contentInput) contentInput.classList.remove('field-error-highlight');
}

// TODOを更新（API 呼び出し）
// 流れ: 入力検証 -> 選択タグを収集 -> PUT /v1/todo/{id} -> 成功時はモーダルを閉じて loadTodos()
async function updateTodo() {
    const id = document.getElementById('edit-todo-id').value;
    const contentInput = document.getElementById('edit-todo-content');
    if (!contentInput) return;
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

// 完了状態を切り替え（API 呼び出し）
// 流れ: PUT /v1/todo/{id}（completed フラグのみ） -> 成功時に一覧再取得
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

// モーダル内からTODOを削除（API 呼び出し）
// 流れ: ポップアップ（confirm-modal）で確認 -> DELETE /v1/todo/{id} -> 成功時にモーダル閉じて一覧再取得
async function deleteTodoFromModal(id) {
    // 共通モーダルで確認（showConfirm を使用、無ければフォールバックで confirm）
    try {
        const ok = await (window.showConfirm ? window.showConfirm(
            'このTODOを削除しますか？',
            { confirmText: '削除する', cancelText: 'キャンセル', title: 'TODO削除の確認' }
        ) : Promise.resolve(confirm('このTODOを削除しますか?')));

        if (!ok) return;
    } catch (e) {
        if (!confirm('このTODOを削除しますか?')) return;
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

// HTMLエスケープ（XSS 対策の簡易実装）
// 流れ: textContent を用いて安全にエスケープした値を返す
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}