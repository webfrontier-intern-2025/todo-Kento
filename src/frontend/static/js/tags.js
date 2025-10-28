let editingTagId = null;

document.addEventListener('DOMContentLoaded', function() {
    loadTags();
    setupEventListeners();
});

// イベントリスナーの設定
function setupEventListeners() {
    // タグ追加フォーム
    document.getElementById('add-tag-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const nameInput = document.getElementById('tag-name');
        const name = nameInput.value.trim();
        const color = document.getElementById('tag-color').value;
        
        // 未入力チェック
        if (!name) {
            nameInput.classList.add('field-error-highlight');
            showNotification('タグ名を入力してください', 'warning');
            
            // 強調表示を3秒後に解除
            setTimeout(() => {
                nameInput.classList.remove('field-error-highlight');
            }, 3000);
            
            nameInput.focus();
            return;
        }
        
        await addTag(name, color);
    });
}

// タグ一覧を読み込み
async function loadTags() {
    try {
        const response = await fetch('/v1/tag');
        if (!response.ok) throw new Error('タグの読み込みに失敗しました');
        
        const tags = await response.json();
        displayTags(tags);
    } catch (error) {
        console.error('Error loading tags:', error);
        showNotification('タグの読み込みに失敗しました', 'danger');
    }
}

// タグを表示
function displayTags(tags) {
    const tagsList = document.getElementById('tags-list');
    
    if (tags.length === 0) {
        tagsList.innerHTML = '<div class="empty-state">タグが登録されていません</div>';
        return;
    }

    tagsList.innerHTML = tags.map(tag => `
        <div class="tag-item" data-tag-id="${tag.id}" id="tag-item-${tag.id}">
            <div class="tag-view" id="tag-view-${tag.id}">
                <div class="tag-info" onclick="startEdit(${tag.id})">
                    <span class="tag-color-preview" style="background-color: ${tag.color}"></span>
                    <span class="tag-name">${escapeHtml(tag.name)}</span>
                </div>
                <div class="tag-actions">
                    <button class="delete-button" onclick="deleteTag(${tag.id})">削除</button>
                </div>
            </div>
            <div class="tag-edit" id="tag-edit-${tag.id}" style="display: none;">
                <input type="text" class="edit-name-input" id="edit-name-${tag.id}" value="${escapeHtml(tag.name)}">
                <input type="color" class="edit-color-input" id="edit-color-${tag.id}" value="${tag.color}">
                <div class="tag-edit-actions">
                    <button class="update-button" onclick="updateTag(${tag.id})">更新</button>
                    <button class="cancel-button" onclick="cancelEdit(${tag.id})">キャンセル</button>
                </div>
            </div>
        </div>
    `).join('');
}

// 編集モードを開始
function startEdit(tagId) {
    // 他の編集中の項目をキャンセル
    if (editingTagId !== null && editingTagId !== tagId) {
        cancelEdit(editingTagId);
    }
    
    editingTagId = tagId;
    document.getElementById(`tag-view-${tagId}`).style.display = 'none';
    document.getElementById(`tag-edit-${tagId}`).style.display = 'flex';
    
    // エラー表示をクリア
    const nameInput = document.getElementById(`edit-name-${tagId}`);
    nameInput.classList.remove('field-error-highlight');
    
    // 入力フィールドにフォーカス
    nameInput.focus();
}

// 編集をキャンセル
function cancelEdit(tagId) {
    editingTagId = null;
    document.getElementById(`tag-view-${tagId}`).style.display = 'flex';
    document.getElementById(`tag-edit-${tagId}`).style.display = 'none';
    
    // エラー表示をクリア
    const nameInput = document.getElementById(`edit-name-${tagId}`);
    nameInput.classList.remove('field-error-highlight');
}

// タグを追加
async function addTag(name, color) {
    const nameInput = document.getElementById('tag-name');
    
    try {
        const response = await fetch('/v1/tag', {
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

        nameInput.value = '';
        nameInput.classList.remove('field-error-highlight');
        document.getElementById('tag-color').value = '#667eea';
        await loadTags();
        showNotification('タグを追加しました');
    } catch (error) {
        console.error('Error adding tag:', error);
        showNotification(error.message, 'danger');
    }
}

// タグを更新
async function updateTag(tagId) {
    const nameInput = document.getElementById(`edit-name-${tagId}`);
    const name = nameInput.value.trim();
    const color = document.getElementById(`edit-color-${tagId}`).value;

    // 未入力チェック
    if (!name) {
        nameInput.classList.add('field-error-highlight');
        showNotification('タグ名を入力してください', 'warning');
        
        // 強調表示を3秒後に解除
        setTimeout(() => {
            nameInput.classList.remove('field-error-highlight');
        }, 3000);
        
        nameInput.focus();
        return;
    }

    // エラー表示をクリア
    nameInput.classList.remove('field-error-highlight');

    try {
        const response = await fetch(`/v1/tag/${tagId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, color })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'タグの更新に失敗しました');
        }

        editingTagId = null;
        await loadTags();
        showNotification('タグを更新しました');
    } catch (error) {
        console.error('Error updating tag:', error);
        showNotification(error.message, 'danger');
    }
}

// タグを削除
async function deleteTag(tagId) {
    if (!confirm('このタグを削除しますか?\n関連付けられたTODOからもタグが削除されます。')) {
        return;
    }

    try {
        const response = await fetch(`/v1/tag/${tagId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('削除に失敗しました');

        await loadTags();
        showNotification('タグを削除しました', 'danger');
    } catch (error) {
        console.error('Error deleting tag:', error);
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

// HTMLエスケープ
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}