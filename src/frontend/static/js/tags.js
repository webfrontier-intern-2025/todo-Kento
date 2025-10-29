// 全体概要（処理の流れ）:
// - ページ読み込み時にサーバーからタグ一覧を取得して描画する。
// - タグの追加・更新・削除はそれぞれ API 呼び出しを行い、成功時に一覧を再取得して UI を更新する。
// - 編集モードは行単位で切り替え、同時編集はキャンセルしてから切替える。
// - showNotification で軽いフィードバックを表示する。

let editingTagId = null;

document.addEventListener('DOMContentLoaded', function() {
    // 初期処理: タグ読み込みとイベントリスナー登録
    loadTags();
    setupEventListeners();
});

// イベントリスナーの設定
// 流れ: フォームの submit を受け取って addTag を呼び出す（クライアント側バリデーション含む）
function setupEventListeners() {
    // タグ追加フォーム
    const form = document.getElementById('add-tag-form');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const nameInput = document.getElementById('tag-name');
            const name = nameInput.value.trim();
            const color = document.getElementById('tag-color').value;
            
            // 未入力チェック（ユーザーにフィードバックを返す）
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
}

// タグ一覧を読み込み（API呼び出し）
// 流れ: GET /v1/tag -> 成功時に displayTags で描画 / 失敗時は通知表示
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

// タグを表示（描画）
// 流れ: サーバーから受け取った tags 配列を DOM に変換して差し替える
function displayTags(tags) {
    const tagsList = document.getElementById('tags-list');
    if (!tagsList) return;
    
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
// 流れ: 他で編集中ならキャンセル -> 関連 DOM を切り替え -> 入力にフォーカス
function startEdit(tagId) {
    // 他の編集中の項目をキャンセル
    if (editingTagId !== null && editingTagId !== tagId) {
        cancelEdit(editingTagId);
    }
    
    editingTagId = tagId;
    const view = document.getElementById(`tag-view-${tagId}`);
    const edit = document.getElementById(`tag-edit-${tagId}`);
    if (view) view.style.display = 'none';
    if (edit) edit.style.display = 'flex';
    
    // エラー表示をクリア
    const nameInput = document.getElementById(`edit-name-${tagId}`);
    if (nameInput) nameInput.classList.remove('field-error-highlight');
    
    // 入力フィールドにフォーカス
    if (nameInput) nameInput.focus();
}

// 編集をキャンセル
// 流れ: 編集 UI を閉じて表示モードに戻す（入力のハイライトをクリア）
function cancelEdit(tagId) {
    editingTagId = null;
    const view = document.getElementById(`tag-view-${tagId}`);
    const edit = document.getElementById(`tag-edit-${tagId}`);
    if (view) view.style.display = 'flex';
    if (edit) edit.style.display = 'none';
    
    // エラー表示をクリア
    const nameInput = document.getElementById(`edit-name-${tagId}`);
    if (nameInput) nameInput.classList.remove('field-error-highlight');
}

// タグを追加（API呼び出し）
// 流れ: POST /v1/tag -> 成功時はフォームリセットと loadTags() -> 失敗時はエラーメッセージ表示
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
        const colorEl = document.getElementById('tag-color');
        if (colorEl) colorEl.value = '#667eea';
        await loadTags();
        showNotification('タグを追加しました');
    } catch (error) {
        console.error('Error adding tag:', error);
        showNotification(error.message, 'danger');
    }
}

// タグを更新（API呼び出し）
// 流れ: 入力検証 -> PUT /v1/tag/{id} -> 成功時に一覧再取得、失敗時は通知
async function updateTag(tagId) {
    const nameInput = document.getElementById(`edit-name-${tagId}`);
    if (!nameInput) return;
    const name = nameInput.value.trim();
    const colorEl = document.getElementById(`edit-color-${tagId}`);
    const color = colorEl ? colorEl.value : '#667eea';

    // 未入力チェック（クライアント側バリデーション）
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

// タグを削除（API呼び出し）
// 流れ: ポップアップ（confirm-modal）で確認 -> DELETE /v1/tag/{id} -> 成功時は一覧再取得、失敗時は通知
async function deleteTag(tagId) {
    // 共通モーダルで確認（showConfirm を使用、無ければフォールバックで confirm）
    try {
        const ok = await (window.showConfirm ? window.showConfirm(
            'このタグを削除しますか?\n関連付けられたTODOからもタグが削除されます。',
            { confirmText: '削除する', cancelText: 'キャンセル', title: 'タグ削除の確認' }
        ) : Promise.resolve(confirm('このタグを削除しますか?\n関連付けられたTODOからもタグが削除されます。')));

        if (!ok) return;
    } catch (e) {
        if (!confirm('このタグを削除しますか?\n関連付けられたTODOからもタグが削除されます。')) return;
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

// HTMLエスケープ（XSS対策）
// 流れ: DOM の textContent を使って安全にエスケープした値を返す
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}