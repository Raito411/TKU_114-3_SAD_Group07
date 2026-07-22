const state = {
  token: localStorage.getItem("secondhand_token") || "",
  user: null,
  books: []
};

const registerForm = document.querySelector("#register-form");
const loginForm = document.querySelector("#login-form");
const bookForm = document.querySelector("#book-form");
const workspace = document.querySelector("#workspace");
const sessionLabel = document.querySelector("#session-label");
const bookList = document.querySelector("#book-list");
const buyerRequests = document.querySelector("#buyer-requests");
const sellerRequests = document.querySelector("#seller-requests");
const mailboxList = document.querySelector("#mailbox-list");
const searchInput = document.querySelector("#search");
const refreshButton = document.querySelector("#refresh-button");
const toast = document.querySelector("#toast");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2600);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "操作失敗");
  }
  return data;
}

function salePrice(book) {
  return Math.round(book.price * (100 - book.discount) / 100);
}

function renderSession() {
  if (!state.user) {
    sessionLabel.textContent = "尚未登入";
    workspace.classList.add("hidden");
    return;
  }

  const trustText = Number.isInteger(state.user.trust_score) ? `｜信任度 ${state.user.trust_score}/3` : "";
  sessionLabel.textContent = `${state.user.name}（學生帳號，可買也可賣${trustText}）`;
  workspace.classList.remove("hidden");
}

function renderBooks() {
  if (state.books.length === 0) {
    bookList.innerHTML = '<p class="card">目前沒有書籍。</p>';
    return;
  }

  bookList.innerHTML = state.books
    .map((book) => {
      const isOwnBook = state.user && book.seller_id === state.user.id;
      return `
        <article class="card">
          <h3>${book.title}</h3>
          <p>序號：${book.listing_number}｜類別：${book.category}｜賣方：${book.seller_name}</p>
          <p>價格：NT$ ${salePrice(book)}（原價 NT$ ${book.price}，折扣 ${book.discount}%）</p>
          <p>書況：${book.condition_text}</p>
          <p>面交地點：${book.meeting_place}</p>
          <span class="state ${book.status === "未交易" ? "" : "pending"}">${book.status}</span>
          <div class="card-actions">
            ${
              !isOwnBook && book.status === "未交易"
                ? `<button type="button" data-action="buy" data-book-id="${book.id}">送出購買需求</button>`
                : ""
            }
          </div>
        </article>
      `;
    })
    .join("");
}

function renderRequests(target, rows, mode) {
  if (!rows.length) {
    target.innerHTML = '<p class="card">目前沒有資料。</p>';
    return;
  }

  target.innerHTML = rows
    .map((request) => `
      <article class="card">
        <h3>${request.book_title}</h3>
        <p>序號：${request.listing_number}</p>
        <p>${mode === "seller" ? `要求人：${request.buyer_name}${Number.isInteger(request.buyer_trust_score) ? `｜信任度 ${request.buyer_trust_score}/3` : ""}` : `賣方：${request.seller_name}`}</p>
        <p>發送要求時間：${request.created_at}</p>
        <p>狀態：${request.status}</p>
        <p>面交時間：${request.meeting_time || "尚未安排"}</p>
        <p>面交地點：${request.meeting_place || "尚未指定"}</p>
        ${
          mode === "seller" && request.status === "待賣方回覆"
            ? `<div class="card-actions"><button type="button" data-action="accept" data-request-id="${request.id}">核准此買方</button></div>`
            : ""
        }
        ${
          mode === "seller" && request.status === "賣方已核准"
            ? `<div class="card-actions"><button class="danger-button" type="button" data-action="fail" data-request-id="${request.id}">交易失敗</button></div>`
            : ""
        }
      </article>
    `)
    .join("");
}

function renderMailbox(rows) {
  if (!rows.length) {
    mailboxList.innerHTML = '<p class="card">目前信箱沒有通知。</p>';
    return;
  }

  mailboxList.innerHTML = rows
    .map((item) => `
      <article class="card">
        <h3>${item.title}</h3>
        <p>${item.message}</p>
        <p>${item.created_at}</p>
      </article>
    `)
    .join("");
}

async function loadCurrentUser() {
  if (!state.token) {
    renderSession();
    return;
  }

  try {
    const data = await api("/api/me");
    state.user = data.user;
    renderSession();
    await refreshAll();
  } catch (error) {
    state.token = "";
    state.user = null;
    localStorage.removeItem("secondhand_token");
    renderSession();
  }
}

async function refreshBooks() {
  const keyword = searchInput.value.trim();
  const data = await api(`/api/books${keyword ? `?q=${encodeURIComponent(keyword)}` : ""}`);
  state.books = data.books;
  renderBooks();
}

async function refreshRequests() {
  const data = await api("/api/purchase-requests");
  renderRequests(buyerRequests, data.as_buyer, "buyer");
  renderRequests(sellerRequests, data.as_seller, "seller");
}

async function refreshMailbox() {
  const data = await api("/api/mailbox");
  renderMailbox(data.notifications);
}

async function refreshAll() {
  await refreshBooks();
  await refreshRequests();
  await refreshMailbox();
}

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(registerForm);
  try {
    await api("/api/register", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(formData))
    });
    registerForm.reset();
    showToast("註冊成功，請登入。");
  } catch (error) {
    showToast(error.message);
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  try {
    const data = await api("/api/login", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(formData))
    });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem("secondhand_token", state.token);
    loginForm.reset();
    renderSession();
    await refreshAll();
    showToast("登入成功。");
  } catch (error) {
    showToast(error.message);
  }
});

bookForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(bookForm);
  const payload = Object.fromEntries(formData);
  payload.price = Number(payload.price);
  payload.discount = Number(payload.discount);

  try {
    await api("/api/books", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    bookForm.reset();
    await refreshAll();
    showToast("刊登成功。");
  } catch (error) {
    showToast(error.message);
  }
});

bookList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action='buy']");
  if (!button) return;

  try {
    await api("/api/purchase-requests", {
      method: "POST",
      body: JSON.stringify({ book_id: Number(button.dataset.bookId) })
    });
    await refreshAll();
    showToast("購買需求已送出。");
  } catch (error) {
    showToast(error.message);
  }
});

sellerRequests.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  if (button.dataset.action === "fail") {
    const confirmed = window.confirm("確定要標記交易失敗？系統會通知買方、取消購買需求，並扣買方信任度。");
    if (!confirmed) return;
    try {
      const data = await api(`/api/purchase-requests/${button.dataset.requestId}/fail`, {
        method: "POST",
        body: JSON.stringify({})
      });
      await refreshAll();
      showToast(
        data.buyer_suspended
          ? "交易已標記失敗，買方信任度為 0，帳號已停權。"
          : `交易已標記失敗，買方信任度剩餘 ${data.buyer_trust_score}/3。`
      );
    } catch (error) {
      showToast(error.message);
    }
    return;
  }

  if (button.dataset.action !== "accept") return;

  const meetingTime = window.prompt("請輸入面交時間，例如 2026-07-15 18:30", "");
  if (!meetingTime) {
    showToast("核准購買需求前必須選擇面交時間。");
    return;
  }
  try {
    await api(`/api/purchase-requests/${button.dataset.requestId}/accept`, {
      method: "POST",
      body: JSON.stringify({ meeting_time: meetingTime })
    });
    await refreshAll();
    showToast("已核准購買需求並通知買方。");
  } catch (error) {
    showToast(error.message);
  }
});

searchInput.addEventListener("input", refreshBooks);
refreshButton.addEventListener("click", refreshAll);

loadCurrentUser();
