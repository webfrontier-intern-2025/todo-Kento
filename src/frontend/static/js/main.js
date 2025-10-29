// 全体概要（処理の流れ）:
// - ページ読み込み時にナビゲーションのハイライトを設定。
// - ネットワーク状態の監視（online/offline）でユーザーに通知。
// - apiFetch を中心に API 呼び出しを統一し、エラーハンドリングを一元化。
// - submitForm でフォーム送信をラップしてフィールドエラー表示と共通トーストを行う。
// - ユーティリティ関数（showToast, clearFieldErrors, applyFieldErrors）は UI フィードバックに使用。

console.log('TODO App loaded');

// ナビゲーションの現在のページをハイライト
// 流れ: DOMContentLoaded 時に現在の pathname と nav の href を比較し、該当リンクを強調する
document.addEventListener('DOMContentLoaded', () => {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.style.fontWeight = 'bold';
            link.style.textDecoration = 'underline';
        }
    });
});

// ===== 統一エラーハンドリング/共通Fetch =====

// API エラーを表すカスタムエラークラス
// 流れ: apiFetch 内で HTTP エラー情報を集めて ApiError を投げる
class ApiError extends Error {
  constructor({ status, code, message, details = [], requestId }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

// トースト表示ユーティリティ
// 流れ: 簡易トースト要素を作成 -> 一定時間後に自動削除
function showToast(message, type = "error") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  Object.assign(el.style, {
    position: "fixed",
    right: "16px",
    bottom: "16px",
    background: type === "success" ? "#16a34a" : (type === "info" ? "#2563eb" : "#dc2626"),
    color: "#fff",
    padding: "10px 12px",
    borderRadius: "6px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    zIndex: 9999
  });
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ステータスコードに対するユーザ向けメッセージマップ
const _statusMessage = (status) => ({
  400: "入力内容を確認してください。",
  401: "認証が必要です。再ログインしてください。",
  403: "操作の権限がありません。",
  404: "対象が見つかりませんでした。",
  409: "他の操作と競合しました。再読み込みしてやり直してください。",
  422: "入力に誤りがあります。",
  429: "短時間に操作が多すぎます。少し待って再試行してください。",
  500: "問題が発生しました。時間をおいて再試行してください。"
}[status] || "処理に失敗しました。");

// 共通の fetch ラッパー
// 流れ:
// 1) fetch 実行（タイムアウト/ネットワークエラーは ApiError を投げる）
// 2) レスポンスが JSON ならパース
// 3) HTTP エラーなら ApiError を throw、成功時はデータを返す
async function apiFetch(path, { method = "GET", headers = {}, body, signal } = {}) {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
    signal
  }).catch(() => {
    throw new ApiError({ status: 0, code: "NETWORK_ERROR", message: "ネットワークに接続できません。" });
  });

  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const data = isJson ? await res.json().catch(() => ({})) : {};

  if (!res.ok) {
    const err = data?.error || {};
    throw new ApiError({
      status: res.status,
      code: err.code || "HTTP_ERROR",
      message: err.message || _statusMessage(res.status),
      details: err.details || [],
      requestId: data.requestId || res.headers.get("X-Request-ID") || undefined
    });
  }
  return data;
}

// フォーム関連ユーティリティ
// clearFieldErrors: 古いエラー表示を削除
function clearFieldErrors(formEl) {
  formEl.querySelectorAll(".field-error").forEach((el) => el.remove());
  formEl.querySelectorAll(".error").forEach((el) => el.classList.remove("error"));
}

// applyFieldErrors: バックエンドの詳細エラーをフォームに反映
// 流れ: details 配列から該当フィールドを探し、エラーメッセージを追加
function applyFieldErrors(formEl, details) {
  details.forEach(({ field, message }) => {
    if (!field) return;
    const input = formEl.querySelector(`[name="${CSS.escape(field)}"]`);
    if (!input) return;
    input.classList.add("error");
    const hint = document.createElement("div");
    hint.className = "field-error";
    hint.textContent = message || "入力が正しくありません。";
    Object.assign(hint.style, { color: "#dc2626", fontSize: "12px", marginTop: "4px" });
    input.insertAdjacentElement("afterend", hint);
  });
}

// submitForm: フォーム送信の共通処理ラッパー
// 流れ:
// 1) 送信ボタンを無効化しフィールドエラーをクリア
// 2) FormData をオブジェクト化して apiFetch で送信
// 3) 成功時は成功トーストを表示、エラー時はフィールドエラーを適用してトースト表示
// 4) ボタンを再度有効化して結果を返す / 例外は再送出
async function submitForm(formEl, endpoint, method = "POST") {
  const btn = formEl.querySelector("button[type=submit], input[type=submit]");
  if (btn) btn.disabled = true;
  clearFieldErrors(formEl);
  try {
    const payload = Object.fromEntries(new FormData(formEl));
    const result = await apiFetch(endpoint, { method, body: payload });
    showToast("保存しました。", "success");
    return result;
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.details?.length) applyFieldErrors(formEl, e.details);
      showToast(e.message);
      if (e.requestId) console.warn("RequestId:", e.requestId);
    } else {
      showToast("予期しないエラーが発生しました。");
    }
    throw e;
  } finally {
    if (btn) btn.disabled = false;
  }
}

// 共通確認ダイアログ（モーダル）を表示して Promise<boolean> を返す
// 流れ:
// - confirm-modal が見つからなければフォールバックで window.confirm を使う
// - 表示中はキーダウン（Escape = キャンセル, Enter = 確定）に対応
// - 外側クリックでもキャンセルする
function showConfirm(message, { confirmText = '削除する', cancelText = 'キャンセル', title = '確認' } = {}) {
  const modal = document.getElementById('confirm-modal');
  if (!modal) {
    return Promise.resolve(window.confirm(message));
  }

  return new Promise((resolve) => {
    const titleEl = modal.querySelector('#confirm-modal-title');
    const msgEl = modal.querySelector('#confirm-modal-message');
    const btnConfirm = modal.querySelector('#confirm-modal-confirm');
    const btnCancel = modal.querySelector('#confirm-modal-cancel');

    // 初期セット
    titleEl.textContent = title;
    msgEl.textContent = message;
    btnConfirm.textContent = confirmText;
    btnCancel.textContent = cancelText;

    // 表示
    modal.style.display = 'flex';

    // イベントハンドラ（cleanup で解除）
    const cleanup = () => {
      modal.style.display = 'none';
      btnConfirm.removeEventListener('click', onConfirm);
      btnCancel.removeEventListener('click', onCancel);
      modal.removeEventListener('click', onBackdropClick);
      window.removeEventListener('keydown', onKeyDown);
    };

    const onConfirm = () => {
      cleanup();
      resolve(true);
    };

    const onCancel = () => {
      cleanup();
      resolve(false);
    };

    const onBackdropClick = (e) => {
      if (e.target === modal) {
        onCancel();
      }
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };

    btnConfirm.addEventListener('click', onConfirm);
    btnCancel.addEventListener('click', onCancel);
    modal.addEventListener('click', onBackdropClick);
    window.addEventListener('keydown', onKeyDown);
  });
}

// グローバルで使えるように window にエクスポート
window.showConfirm = showConfirm;

// ネットワーク状態変化の監視
// 流れ: offline/online イベントでユーザーに通知
window.addEventListener("offline", () => showToast("オフラインになりました。"));
window.addEventListener("online", () => showToast("オンラインになりました。", "info"));