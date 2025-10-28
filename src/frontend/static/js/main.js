// 共通のJavaScript処理

console.log('TODO App loaded');

// ナビゲーションの現在のページをハイライト
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

function clearFieldErrors(formEl) {
  formEl.querySelectorAll(".field-error").forEach((el) => el.remove());
  formEl.querySelectorAll(".error").forEach((el) => el.classList.remove("error"));
}

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

window.addEventListener("offline", () => showToast("オフラインになりました。"));
window.addEventListener("online", () => showToast("オンラインになりました。", "info"));