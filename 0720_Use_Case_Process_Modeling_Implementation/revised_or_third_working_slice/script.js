let books = [
  {
    id: 1,
    listingNumber: 7001,
    title: "系統分析與設計",
    category: "資訊管理",
    price: 320,
    discount: 10,
    condition: "有少量筆記",
    photoNote: "封面完整，內頁有重點標記",
    status: "未交易",
    requestStatus: "",
    requestBuyerName: "",
    purchaseRequests: [],
    otherPendingRequests: 0,
    meetingTime: "",
    meetingPlace: "商管大樓一樓大廳",
    sellerName: "賣方學生 B"
  },
  {
    id: 2,
    listingNumber: 7002,
    title: "資料庫系統概論",
    category: "資料庫",
    price: 280,
    discount: 0,
    condition: "近全新",
    photoNote: "書角完整，無明顯折痕",
    status: "未交易",
    requestStatus: "",
    requestBuyerName: "",
    purchaseRequests: [],
    otherPendingRequests: 0,
    meetingTime: "",
    meetingPlace: "圖書館二樓入口",
    sellerName: "買方學生 A"
  },
  {
    id: 3,
    listingNumber: 7003,
    title: "JavaScript 入門",
    category: "程式設計",
    price: 220,
    discount: 15,
    condition: "有明顯使用痕跡",
    photoNote: "封面有磨損，內容完整",
    status: "未交易",
    requestStatus: "已送出，待賣方回覆",
    requestBuyerName: "買方學生 A",
    purchaseRequests: [
      {
        id: 301,
        buyerName: "買方學生 A",
        buyerTrustScore: 3,
        status: "待賣方回覆",
        createdAt: "115/07/14 15:10",
        meetingTime: ""
      },
      {
        id: 302,
        buyerName: "買方學生 D",
        buyerTrustScore: 2,
        status: "待賣方回覆",
        createdAt: "115/07/14 15:25",
        meetingTime: ""
      },
      {
        id: 303,
        buyerName: "買方學生 E",
        buyerTrustScore: 3,
        status: "待賣方回覆",
        createdAt: "115/07/14 15:40",
        meetingTime: ""
      }
    ],
    otherPendingRequests: 2,
    meetingTime: "",
    meetingPlace: "商管大樓一樓大廳",
    sellerName: "賣方學生 C"
  }
];

let mockBuyerName = "買方學生 A";
let notifications = [
  {
    id: 1,
    buyerName: "買方學生 A",
    bookTitle: "JavaScript 入門",
    message: "購買需求已送出，待賣方回覆。",
    createdAt: "115/07/14 15:10"
  }
];

const API_BASE = "http://127.0.0.1:8000";
const TOKEN_STORAGE_KEY = "secondhand_books_token";
let authToken = localStorage.getItem(TOKEN_STORAGE_KEY) || "";
let currentUser = null;
let apiConnected = false;

const form = document.querySelector("#book-form");
const priceInput = document.querySelector("#price");
const discountInput = document.querySelector("#discount");
const discountPreview = document.querySelector("#discount-preview");
const saveBookButton = document.querySelector("#save-book-button");
const cancelEditButton = document.querySelector("#cancel-edit-button");
const searchInput = document.querySelector("#search");
const clearSearchButton = document.querySelector("#clear-search");
const meetingForm = document.querySelector("#meeting-form");
const transactionRoleSelect = document.querySelector("#transaction-role");
const buyerTransactionList = document.querySelector("#buyer-transaction-list");
const sellerListingList = document.querySelector("#seller-listing-list");
const listingNumberLookupInput = document.querySelector("#listing-number-lookup");
const findListingButton = document.querySelector("#find-listing-button");
const meetingBookSelect = document.querySelector("#meeting-book");
const meetingSubmitButton = meetingForm.querySelector('button[type="submit"]');
const meetingTimeInput = document.querySelector("#meeting-time");
const meetingPlaceInput = document.querySelector("#meeting-place");
const meetingStatusSelect = document.querySelector("#meeting-status");
const mainView = document.querySelector("#main-view");
const detailView = document.querySelector("#detail-view");
const backToListButton = document.querySelector("#back-to-list");
const tabButtons = document.querySelectorAll("[data-tab-target]");
const tabPanels = document.querySelectorAll("[data-tab-panel]");
const bookList = document.querySelector("#book-list");
const detailContent = document.querySelector("#detail-content");
const notificationList = document.querySelector("#notification-list");
const toast = document.querySelector("#toast");
const authGate = document.querySelector("#auth-gate");
const gateRegisterButton = document.querySelector("#gate-register");
const gateLoginButton = document.querySelector("#gate-login");
const authStatus = document.querySelector("#auth-status");
const openRegisterButton = document.querySelector("#open-register");
const openLoginButton = document.querySelector("#open-login");
const logoutButton = document.querySelector("#logout-button");
const authModal = document.querySelector("#auth-modal");
const closeAuthButton = document.querySelector("#close-auth");
const authTitle = document.querySelector("#auth-title");
const registerModeButton = document.querySelector("#register-mode");
const loginModeButton = document.querySelector("#login-mode");
const registerForm = document.querySelector("#register-form");
const loginForm = document.querySelector("#login-form");

let selectedBookId = null;
let editingBookId = null;

function getStatusClass(status) {
  if (status === "未交易") return "available";
  if (status === "交易中") return "pending";
  return "done";
}

function clampDiscount(value) {
  const discount = Number(value);
  if (Number.isNaN(discount)) return 0;
  return Math.min(100, Math.max(0, discount));
}

function getSalePrice(book) {
  return Math.round(book.price * (100 - clampDiscount(book.discount)) / 100);
}

function canCancelRequest(book) {
  return book.status === "未交易" && book.requestStatus === "已送出，待賣方回覆";
}

function canAcceptRequest(book) {
  return getPendingPurchaseRequests(book).length > 0 && book.status === "未交易";
}

function canFailRequest(book) {
  return Boolean(book.requestId) && (book.status === "交易中" || book.requestStatus?.startsWith("賣方已核准"));
}

function getPendingPurchaseRequests(book) {
  return (book.purchaseRequests || []).filter((request) => request.status === "待賣方回覆");
}

function getVisibleSellerRequests(book) {
  return (book.purchaseRequests || []).filter((request) => request.status !== "已取消");
}

function getAcceptedPurchaseRequest(book) {
  return (book.purchaseRequests || []).find((request) => request.status === "賣方已核准" || request.status === "交易完成");
}

function isOwnListing(book) {
  if (currentUser && book.sellerId) {
    return book.sellerId === currentUser.id;
  }
  return book.sellerName === mockBuyerName;
}

function getRequestActionMarkup(book) {
  if (isOwnListing(book)) {
    return "";
  }

  if (canCancelRequest(book)) {
    return `<button class="secondary-button" type="button" data-action="cancel-request" data-id="${book.id}">取消購買需求</button>`;
  }

  if (book.requestStatus) {
    return "";
  }

  return `<button type="button" data-action="request" data-id="${book.id}">送出購買需求</button>`;
}

function getVisibleTransactionStatus(book, role) {
  if (role === "buyer" && canCancelRequest(book)) {
    return "交易預約中";
  }

  return book.status;
}

function getRequestBuyerName(book) {
  return book.requestBuyerName || mockBuyerName;
}

function shouldShowPendingRequestBadge(book) {
  return !isOwnListing(book) && canCancelRequest(book);
}

function getAutomaticViewerRole(book) {
  if (isOwnListing(book)) return "seller";
  if (book.requestStatus) return "buyer";
  return "visitor";
}

function canCurrentViewerSeeMeeting(book) {
  if (isOwnListing(book)) return true;
  return Boolean(book.requestStatus && book.requestStatus.startsWith("賣方已核准"));
}

function getVisibleRequestText(book) {
  if (shouldShowPendingRequestBadge(book)) return book.requestStatus;
  if (!isOwnListing(book) && book.requestStatus?.startsWith("賣方已核准")) return "交易進行中";
  if (isOwnListing(book)) {
    const visibleRequests = getVisibleSellerRequests(book);
    return visibleRequests.length ? `${visibleRequests.length} 筆要求` : "尚未提出";
  }
  return "尚未提出";
}

function getMeetingSummary(book) {
  const timeText = formatMeetingTime(book.meetingTime) || "尚未安排";
  const placeText = book.meetingPlace || "尚未指定";
  return `面交時間：${timeText}；面交地點：${placeText}`;
}

function addNotification(book, message, buyerName = getRequestBuyerName(book)) {
  notifications.unshift({
    id: Date.now(),
    buyerName,
    bookTitle: book.title,
    message,
    createdAt: new Date().toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    })
  });
  renderNotifications();
}

function renderNotifications() {
  if (notifications.length === 0) {
    notificationList.innerHTML = '<p class="empty-state">目前沒有通知。</p>';
    return;
  }

  notificationList.innerHTML = notifications
    .map((notification) => `
      <article class="notification-card">
        <div>
          <h4>${notification.bookTitle}</h4>
          <p>通知對象：${notification.buyerName}</p>
          <p>${notification.message}</p>
        </div>
        <time>${notification.createdAt}</time>
      </article>
    `)
    .join("");
}

function generateListingNumber() {
  return Math.max(...books.map((book) => book.listingNumber), 7000) + 1;
}

function getPriceMarkup(book) {
  const salePrice = getSalePrice(book);
  if (!book.discount) {
    return `<span>NT$ ${book.price}</span>`;
  }

  return `
    <span class="sale-price">折扣後 NT$ ${salePrice}</span>
    <span class="original-price">原價 NT$ ${book.price}</span>
    <span>${book.discount}% off</span>
  `;
}

function updateDiscountPreview() {
  const price = Number(priceInput.value) || 0;
  const discount = clampDiscount(discountInput.value);
  const salePrice = Math.round(price * (100 - discount) / 100);
  discountInput.value = discount;
  discountPreview.textContent = `折扣後價格：NT$ ${salePrice}`;
}

function formatMeetingTime(value) {
  if (!value) return "";
  return value.replace("T", " ");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2400);
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "API 連線失敗");
  }
  return data;
}

function mapApiBook(row) {
  return {
    id: row.id,
    listingNumber: row.listing_number,
    title: row.title,
    category: row.category,
    price: Number(row.price),
    discount: Number(row.discount || 0),
    condition: row.condition_text,
    photoNote: row.photo_note,
    status: row.status,
    requestStatus: "",
    requestBuyerName: "",
    requestId: null,
    purchaseRequests: [],
    otherPendingRequests: 0,
    meetingTime: "",
    meetingPlace: row.meeting_place,
    sellerId: row.seller_id,
    sellerName: row.seller_name || "賣方學生"
  };
}

function requestStatusText(status) {
  if (status === "待賣方回覆") return "已送出，待賣方回覆";
  if (status === "賣方已核准") return "賣方已核准";
  if (status === "交易完成") return "賣方已核准，交易完成";
  if (status === "已取消") return "已取消";
  return status || "";
}

function applyApiRequests(data) {
  [...data.as_buyer, ...data.as_seller].forEach((request) => {
    const book = books.find((item) => item.id === request.book_id);
    if (!book) return;

    if (request.buyer_name) {
      book.purchaseRequests.push({
        id: request.id,
        buyerName: request.buyer_name,
        buyerTrustScore: request.buyer_trust_score,
        status: request.status,
        createdAt: request.created_at,
        meetingTime: request.meeting_time || ""
      });
    }

    if (request.status !== "已取消") {
      book.requestStatus = requestStatusText(request.status);
      book.requestId = request.id;
      book.requestBuyerName = request.buyer_name || currentUser?.name || "";
      book.meetingTime = request.meeting_time || book.meetingTime;
    }
  });

  books.forEach((book) => {
    const pendingRequests = getPendingPurchaseRequests(book);
    book.otherPendingRequests = Math.max(pendingRequests.length - 1, 0);
    const acceptedRequest = getAcceptedPurchaseRequest(book);
    if (acceptedRequest) {
      book.requestId = acceptedRequest.id;
      book.requestBuyerName = acceptedRequest.buyerName;
      book.requestStatus = requestStatusText(acceptedRequest.status);
      book.meetingTime = acceptedRequest.meetingTime || book.meetingTime;
    }
  });
}

function renderAuthState() {
  if (currentUser) {
    const trustText = Number.isInteger(currentUser.trust_score) ? `｜信任度 ${currentUser.trust_score}/3` : "";
    authStatus.textContent = `已登入：${currentUser.name}${trustText}`;
    openRegisterButton.classList.add("hidden");
    openLoginButton.classList.add("hidden");
    logoutButton.classList.remove("hidden");
    closeAuthButton.classList.remove("hidden");
    authGate.classList.add("hidden");
    document.body.classList.remove("auth-required");
    mockBuyerName = currentUser.name;
    return;
  }

  authStatus.textContent = apiConnected ? "尚未登入" : "尚未登入";
  openRegisterButton.classList.remove("hidden");
  openLoginButton.classList.remove("hidden");
  logoutButton.classList.add("hidden");
  closeAuthButton.classList.add("hidden");
  authGate.classList.remove("hidden");
  document.body.classList.add("auth-required");
  mockBuyerName = "買方學生 A";
}

function requireLogin() {
  if (currentUser && authToken) return true;
  openAuthModal("login");
  showToast("請先登入或註冊後再操作。");
  return false;
}

function setAuthMode(mode) {
  const isRegister = mode === "register";
  authTitle.textContent = isRegister ? "註冊" : "登入";
  registerForm.classList.toggle("hidden", !isRegister);
  loginForm.classList.toggle("hidden", isRegister);
  registerModeButton.classList.toggle("active", isRegister);
  loginModeButton.classList.toggle("active", !isRegister);
}

function openAuthModal(mode) {
  setAuthMode(mode);
  closeAuthButton.classList.toggle("hidden", !currentUser);
  authModal.classList.remove("hidden");
}

function closeAuthModal() {
  if (!currentUser) {
    showToast("請先登入或註冊後再使用系統。");
    return;
  }
  authModal.classList.add("hidden");
}

async function refreshFromApi() {
  try {
    const bookData = await api("/api/books");
    apiConnected = true;
    books = bookData.books.map(mapApiBook);

    if (authToken) {
      const meData = await api("/api/me");
      currentUser = meData.user;
      mockBuyerName = currentUser.name;
      const requestData = await api("/api/purchase-requests");
      applyApiRequests(requestData);
      const mailboxData = await api("/api/mailbox");
      notifications = mailboxData.notifications.map((item) => ({
        id: item.id,
        buyerName: currentUser.name,
        bookTitle: item.title,
        message: item.message,
        createdAt: item.created_at
      }));
    } else {
      currentUser = null;
    }
  } catch (error) {
    if (authToken) {
      authToken = "";
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      currentUser = null;
    }
    renderAuthState();
    renderBooks();
    renderMeetingOptions();
    renderTransactionRoleView();
    renderNotifications();
    return;
  }

  renderAuthState();
  renderBooks();
  renderMeetingOptions();
  renderTransactionRoleView();
  renderNotifications();
  if (!detailView.classList.contains("hidden")) {
    renderDetail(books.find((book) => book.id === selectedBookId) || books[0]);
  }
  if (!currentUser) {
    openAuthModal("login");
  }
}

function showMainView() {
  mainView.classList.remove("hidden");
  detailView.classList.add("hidden");
}

function showDetailView(book) {
  renderDetail(book);
  mainView.classList.add("hidden");
  detailView.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function switchTab(tabName) {
  mainView.classList.remove("hidden");
  detailView.classList.add("hidden");
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tabTarget === tabName);
  });
  tabPanels.forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.tabPanel !== tabName);
  });
  if (tabName === "seller") {
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (tabName === "transaction") {
    renderTransactionRoleView();
  }
}

function setFormMode(book) {
  editingBookId = book ? book.id : null;
  saveBookButton.textContent = book ? "更新書籍資料" : "新增書籍";
  cancelEditButton.classList.toggle("hidden", !book);
}

function fillBookForm(book) {
  form.elements.title.value = book.title;
  form.elements.category.value = book.category;
  form.elements.price.value = book.price;
  form.elements.discount.value = book.discount;
  form.elements.condition.value = book.condition;
  form.elements.photoNote.value = book.photoNote;
  form.elements.sellerMeetingPlace.value = book.meetingPlace;
  updateDiscountPreview();
  setFormMode(book);
  showMainView();
  switchTab("seller");
}

function resetBookForm() {
  form.reset();
  discountInput.value = 0;
  updateDiscountPreview();
  setFormMode(null);
}

function getFilteredBooks() {
  const keyword = searchInput.value.trim().toLowerCase();
  if (!keyword) return books;

  return books.filter((book) => {
    return [
      book.title,
      String(book.listingNumber),
      book.category,
      book.condition,
      book.status,
      book.photoNote,
      book.meetingPlace,
      String(book.price),
      String(book.discount),
      String(getSalePrice(book))
    ].some((value) => value.toLowerCase().includes(keyword));
  });
}

function renderBooks() {
  const filteredBooks = getFilteredBooks();

  if (filteredBooks.length === 0) {
    bookList.innerHTML = '<p class="empty-state">沒有找到符合條件的書籍。</p>';
    return;
  }

  bookList.innerHTML = filteredBooks
    .map((book) => {
      const requestText = shouldShowPendingRequestBadge(book)
        ? `<span class="state pending">${book.requestStatus}</span>`
        : "";
      const discountText = book.discount
        ? `<span class="state discount">${book.discount}% 折扣</span>`
        : "";

      return `
        <article class="book-card">
          <div>
            <h3>${book.title}</h3>
            <div class="book-meta">
              <span>序號 ${book.listingNumber}</span>
              <span>${book.category}</span>
              <span>${book.condition}</span>
              <span>賣方：${book.sellerName || "賣方學生"}</span>
            </div>
            <div class="price-stack">${getPriceMarkup(book)}</div>
          </div>
          <span class="state ${getStatusClass(book.status)}">${book.status}</span>
          ${discountText}
          ${requestText}
          <div class="book-actions">
            <button class="secondary-button" type="button" data-action="detail" data-id="${book.id}">查看詳細資料</button>
            ${getRequestActionMarkup(book)}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderMeetingOptions() {
  const sellerBooks = currentUser ? books.filter(isOwnListing) : books;
  if (sellerBooks.length === 0) {
    meetingBookSelect.innerHTML = '<option value="">尚無刊登中的書籍</option>';
    meetingSubmitButton.disabled = true;
    return;
  }

  meetingSubmitButton.disabled = false;
  meetingBookSelect.innerHTML = sellerBooks
    .map((book) => `<option value="${book.id}">#${book.listingNumber} ${book.title}（${book.status}）</option>`)
    .join("");

  if (!sellerBooks.some((book) => book.id === Number(meetingBookSelect.value))) {
    meetingBookSelect.value = String(sellerBooks[0].id);
  }

  fillMeetingForm();
}

function getBuyerTransactions() {
  return books.filter((book) => (book.requestStatus || book.status === "交易中") && !isOwnListing(book));
}

function renderBuyerTransactions() {
  const buyerBooks = getBuyerTransactions();

  if (buyerBooks.length === 0) {
    buyerTransactionList.innerHTML = '<p class="empty-state">目前沒有正在交易中的書籍。</p>';
    return;
  }

  buyerTransactionList.innerHTML = buyerBooks
    .map((book) => `
      <article class="transaction-card">
        <div>
          <h3>${book.title}</h3>
          <p>刊登序號：${book.listingNumber}</p>
          <p>類別：${book.category}</p>
          <p>交易狀態：${getVisibleTransactionStatus(book, "buyer")}</p>
          <p>購買需求：${book.requestStatus || "交易進行中"}</p>
          <p>面交時間：${formatMeetingTime(book.meetingTime) || "尚未安排"}</p>
          <p>面交地點：${book.meetingPlace || "尚未指定"}</p>
        </div>
        <div class="book-actions">
          <button class="secondary-button" type="button" data-action="detail" data-id="${book.id}">查看詳細資料</button>
          ${
            canCancelRequest(book)
              ? `<button class="secondary-button" type="button" data-action="cancel-request" data-id="${book.id}">取消購買需求</button>`
              : ""
          }
        </div>
      </article>
    `)
    .join("");
}

function renderPurchaseRequestsMarkup(book) {
  const requests = getVisibleSellerRequests(book);
  if (requests.length === 0) {
    return '<p class="empty-state">目前沒有買方送出購買要求。</p>';
  }

  return `
    <div class="request-review-list">
      ${requests
        .map((request) => `
          <article class="request-review-item">
            <div>
              <strong>${request.buyerName || "買方學生"}</strong>
              <p>發送要求時間：${request.createdAt || "尚未記錄"}</p>
              <p>要求狀態：${requestStatusText(request.status)}</p>
              ${
                Number.isInteger(request.buyerTrustScore)
                  ? `<p>買方信任度：${request.buyerTrustScore}/3</p>`
                  : ""
              }
            </div>
            ${
              request.status === "待賣方回覆" && book.status === "未交易"
                ? `
                  <div class="accept-controls">
                    <label>
                      核准後面交時間
                      <input type="datetime-local" data-meeting-time-for-request="${request.id}" required>
                    </label>
                    <button type="button" data-action="accept-request" data-id="${book.id}" data-request-id="${request.id}">核准此買方</button>
                  </div>
                `
                : ""
            }
          </article>
        `)
        .join("")}
    </div>
  `;
}

function renderSellerListings() {
  const sellerBooks = currentUser ? books.filter(isOwnListing) : books;
  if (sellerBooks.length === 0) {
    sellerListingList.innerHTML = '<p class="empty-state">目前沒有賣方刊登中的書籍。</p>';
    return;
  }

  sellerListingList.innerHTML = sellerBooks
    .map((book) => `
      <article class="transaction-card">
        <div>
          <h3>${book.title}</h3>
          <p>刊登序號：${book.listingNumber}</p>
          <p>類別：${book.category}</p>
          <p>價格：NT$ ${getSalePrice(book)}</p>
          <p>交易狀態：${book.status}</p>
          <p>購買需求：${getVisibleSellerRequests(book).length} 筆</p>
          <p>待核准需求：${getPendingPurchaseRequests(book).length} 筆</p>
          <p>面交地點：${book.meetingPlace || "尚未指定"}</p>
        </div>
        <div class="book-actions">
          <button class="secondary-button" type="button" data-action="detail" data-id="${book.id}">查看詳細資料</button>
          ${
            canAcceptRequest(book)
              ? `<button type="button" data-action="toggle-requests" data-id="${book.id}">查看要求</button>`
              : ""
          }
          ${
            canFailRequest(book)
              ? `<button class="danger-button" type="button" data-action="fail-request" data-id="${book.id}">交易失敗</button>`
              : ""
          }
          <button class="secondary-button" type="button" data-action="edit" data-id="${book.id}">編輯刊登資料</button>
        </div>
        <div class="request-review-panel hidden" data-request-panel-for="${book.id}">
          ${renderPurchaseRequestsMarkup(book)}
        </div>
      </article>
    `)
    .join("");
}

function renderTransactionRoleView() {
  const isSeller = transactionRoleSelect.value === "seller";
  meetingForm.classList.toggle("hidden", !isSeller);
  buyerTransactionList.classList.toggle("hidden", isSeller);
  sellerListingList.classList.toggle("hidden", !isSeller);
  if (isSeller) {
    renderSellerListings();
    renderMeetingOptions();
  } else {
    renderBuyerTransactions();
  }
}

function fillMeetingForm() {
  const book = books.find((item) => item.id === Number(meetingBookSelect.value));
  if (!book) {
    meetingTimeInput.value = "";
    meetingPlaceInput.value = "";
    meetingStatusSelect.value = "未交易";
    return;
  }

  meetingTimeInput.value = book.meetingTime || "";
  meetingPlaceInput.value = book.meetingPlace || "";
  meetingStatusSelect.value = book.status;
}

function renderDetail(book) {
  selectedBookId = book.id;
  const canSeeMeeting = canCurrentViewerSeeMeeting(book);
  const viewerRole = getAutomaticViewerRole(book);
  const meetingMarkup = canSeeMeeting
    ? `
      <div class="detail-item"><strong>面交時間</strong>${formatMeetingTime(book.meetingTime) || "尚未安排"}</div>
      <div class="detail-item"><strong>賣方指定面交地點</strong>${book.meetingPlace || "尚未指定"}</div>
    `
    : `
      <div class="detail-item"><strong>面交資訊</strong><span class="state private">非交易當事人不可見</span></div>
    `;

  detailContent.innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><strong>刊登序號</strong>${book.listingNumber}</div>
      <div class="detail-item"><strong>書名</strong>${book.title}</div>
      <div class="detail-item"><strong>類別</strong>${book.category}</div>
      <div class="detail-item"><strong>賣方</strong>${book.sellerName || "賣方學生"}</div>
      <div class="detail-item"><strong>原價</strong>NT$ ${book.price}</div>
      <div class="detail-item"><strong>折扣</strong>${book.discount}%</div>
      <div class="detail-item"><strong>折扣後價格</strong>NT$ ${getSalePrice(book)}</div>
      <div class="detail-item"><strong>書況</strong>${book.condition}</div>
      <div class="detail-item"><strong>照片說明</strong>${book.photoNote}</div>
      <div class="detail-item"><strong>交易狀態</strong>${getVisibleTransactionStatus(book, viewerRole)}</div>
      <div class="detail-item"><strong>購買需求</strong>${getVisibleRequestText(book)}</div>
      ${meetingMarkup}
    </div>
    <div class="book-actions detail-actions">
      ${getRequestActionMarkup(book)}
    </div>
  `;
}

async function saveBook(event) {
  event.preventDefault();

  const formData = new FormData(form);
  const bookData = {
    title: formData.get("title").trim(),
    category: formData.get("category"),
    price: Number(formData.get("price")),
    discount: clampDiscount(formData.get("discount")),
    condition: formData.get("condition"),
    photoNote: formData.get("photoNote").trim(),
    status: "未交易",
    meetingPlace: formData.get("sellerMeetingPlace").trim()
  };

  const existingBook = books.find((book) => book.id === editingBookId);
  if (existingBook) {
    bookData.status = existingBook.status;
  }
  if (apiConnected && !requireLogin()) {
    return;
  }

  if (existingBook) {
    Object.assign(existingBook, bookData);
    if (selectedBookId === existingBook.id) {
      renderDetail(existingBook);
    }
    showToast("更新成功：刊登中的書籍資料已修改。");
  } else {
    const book = {
      id: Date.now(),
      listingNumber: generateListingNumber(),
      ...bookData,
      requestStatus: "",
      requestBuyerName: "",
      purchaseRequests: [],
      otherPendingRequests: 0,
      meetingTime: "",
      sellerId: currentUser?.id,
      sellerName: mockBuyerName
    };
    if (apiConnected) {
      try {
        const data = await api("/api/books", {
          method: "POST",
          body: JSON.stringify({
            title: bookData.title,
            category: bookData.category,
            price: bookData.price,
            discount: bookData.discount,
            condition_text: bookData.condition,
            photo_note: bookData.photoNote,
            meeting_place: bookData.meetingPlace
          })
        });
        selectedBookId = data.book.id;
        showToast("刊登成功：書籍已寫入資料庫。");
        await refreshFromApi();
      } catch (error) {
        showToast(error.message);
        return;
      }
    } else {
      books.unshift(book);
      selectedBookId = book.id;
      showToast("新增成功：書籍與折扣資訊已出現在列表中。");
    }
  }

  resetBookForm();
  renderBooks();
  renderMeetingOptions();
  renderTransactionRoleView();
  if (!existingBook) {
    switchTab("market");
  }
}

async function handleBookAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const book = books.find((item) => item.id === Number(button.dataset.id));
  if (!book) return;

  if (button.dataset.action === "detail") {
    showDetailView(book);
    return;
  }

  if (button.dataset.action === "edit") {
    fillBookForm(book);
    return;
  }

  if (button.dataset.action === "toggle-requests") {
    const requestPanel = document.querySelector(`[data-request-panel-for="${book.id}"]`);
    if (!requestPanel) return;
    requestPanel.classList.toggle("hidden");
    button.textContent = requestPanel.classList.contains("hidden") ? "查看要求" : "收合要求";
    return;
  }

  if (button.dataset.action === "accept-request") {
    if (!canAcceptRequest(book)) {
      showToast("此交易需求目前不能接受，請確認交易狀態。");
      return;
    }

    const selectedRequestId = Number(button.dataset.requestId || book.requestId);
    const selectedRequest = (book.purchaseRequests || []).find((request) => request.id === selectedRequestId);
    if (!selectedRequest || selectedRequest.status !== "待賣方回覆") {
      showToast("找不到這筆待核准要求，請先重新整理資料。");
      return;
    }

    const meetingTimeInputForRequest = document.querySelector(`[data-meeting-time-for-request="${selectedRequestId}"]`);
    const acceptedMeetingTime = meetingTimeInputForRequest?.value || "";
    if (!acceptedMeetingTime) {
      showToast("核准買方前，請先選擇面交時間。");
      meetingTimeInputForRequest?.focus();
      return;
    }

    if (apiConnected) {
      if (!requireLogin()) return;
      try {
        await api(`/api/purchase-requests/${selectedRequestId}/accept`, {
          method: "POST",
          body: JSON.stringify({ meeting_time: acceptedMeetingTime })
        });
        await refreshFromApi();
        showToast(`已核准 ${selectedRequest.buyerName}，並把面交時間通知買方。`);
      } catch (error) {
        showToast(error.message);
      }
      return;
    }

    const unselectedRequests = getPendingPurchaseRequests(book).filter((request) => request.id !== selectedRequestId);
    const cancelledRequests = unselectedRequests.length;
    book.purchaseRequests = (book.purchaseRequests || []).map((request) => {
      if (request.id === selectedRequestId) {
        return {
          ...request,
          status: "賣方已核准",
          meetingTime: acceptedMeetingTime
        };
      }
      if (request.status === "待賣方回覆") {
        return {
          ...request,
          status: "已取消"
        };
      }
      return request;
    });
    book.status = "交易中";
    book.requestStatus = "賣方已核准";
    book.requestId = selectedRequestId;
    book.requestBuyerName = selectedRequest.buyerName;
    book.meetingTime = acceptedMeetingTime;
    book.otherPendingRequests = 0;
    addNotification(book, `你的購買需求已被賣方核准，交易已成立。${getMeetingSummary(book)}`);
    unselectedRequests.forEach((request) => {
      addNotification(book, `你對「${book.title}」送出的購買需求未被核准，該書籍已被其他人購買。`, request.buyerName);
    });
    renderBooks();
    renderMeetingOptions();
    renderTransactionRoleView();
    if (!detailView.classList.contains("hidden")) {
      renderDetail(book);
    }
    showToast(
      cancelledRequests > 0
        ? `已核准 ${selectedRequest.buyerName} 並通知面交時間，狀態自動更新為交易中，其他 ${cancelledRequests} 筆購買要求已取消。`
        : `已核准 ${selectedRequest.buyerName} 並通知面交時間，狀態自動更新為交易中。`
    );
    return;
  }

  if (button.dataset.action === "fail-request") {
    if (!canFailRequest(book)) {
      showToast("此交易目前不能標記為交易失敗。");
      return;
    }

    const confirmed = window.confirm("確定要標記交易失敗？系統會通知買方、取消該購買需求，並扣買方信任度 1 點。");
    if (!confirmed) return;

    if (apiConnected) {
      if (!requireLogin()) return;
      try {
        const data = await api(`/api/purchase-requests/${book.requestId}/fail`, {
          method: "POST",
          body: JSON.stringify({})
        });
        await refreshFromApi();
        showToast(
          data.buyer_suspended
            ? "交易已標記失敗，買方信任度為 0，帳號已停權並清理相關資料。"
            : `交易已標記失敗，買方信任度剩餘 ${data.buyer_trust_score}/3。`
        );
      } catch (error) {
        showToast(error.message);
      }
      return;
    }

    book.status = "未交易";
    book.requestStatus = "";
    book.requestBuyerName = "";
    book.requestId = null;
    book.meetingTime = "";
    addNotification(book, `你的「${book.title}」交易已由賣方標記為交易失敗，購買需求已取消。信任度扣 1。`);
    renderBooks();
    renderMeetingOptions();
    renderTransactionRoleView();
    if (!detailView.classList.contains("hidden")) {
      renderDetail(book);
    }
    showToast("交易已標記失敗，書籍恢復未交易並可重新刊登。");
    return;
  }

  if (button.dataset.action === "cancel-request") {
    if (!canCancelRequest(book)) {
      showToast("此購買需求已由賣方確認，不能取消。");
      return;
    }

    if (apiConnected) {
      if (!requireLogin()) return;
      if (!book.requestId) {
        showToast("找不到購買需求紀錄，請重新整理後再試。");
        return;
      }

      try {
        await api(`/api/purchase-requests/${book.requestId}/cancel`, {
          method: "POST"
        });
        selectedBookId = book.id;
        await refreshFromApi();
        if (!detailView.classList.contains("hidden")) {
          const updatedBook = books.find((item) => item.id === book.id);
          renderDetail(updatedBook || book);
        }
        showToast("購買需求已取消，賣方查看要求已同步移除。");
      } catch (error) {
        showToast(error.message);
      }
      return;
    }

    const currentBuyerName = currentUser?.name || mockBuyerName;
    book.purchaseRequests = (book.purchaseRequests || []).map((request) => {
      if (request.status === "待賣方回覆" && request.buyerName === currentBuyerName) {
        return {
          ...request,
          status: "已取消"
        };
      }
      return request;
    });
    const pendingRequests = getPendingPurchaseRequests(book);
    book.requestStatus = "";
    book.requestBuyerName = pendingRequests[0]?.buyerName || "";
    book.status = "未交易";
    book.meetingTime = "";
    book.otherPendingRequests = Math.max(pendingRequests.length - 1, 0);
    renderBooks();
    renderMeetingOptions();
    renderTransactionRoleView();
    if (!detailView.classList.contains("hidden")) {
      renderDetail(book);
    }
    showToast("購買需求已取消，書籍狀態回到未交易。");
    return;
  }

  if (book.requestStatus) {
    showToast("此書籍已有購買需求狀態，請先確認目前進度。");
    return;
  }

  if (isOwnListing(book)) {
    showToast("賣方不可對自己刊登的書籍送出購買需求。");
    return;
  }

  if (apiConnected) {
    if (!requireLogin()) return;
    try {
      await api("/api/purchase-requests", {
        method: "POST",
        body: JSON.stringify({ book_id: book.id })
      });
      selectedBookId = book.id;
      await refreshFromApi();
      showToast("購買需求已送出，已通知賣方，狀態更新為待賣方回覆。");
    } catch (error) {
      showToast(error.message);
    }
    return;
  }

  book.requestStatus = "已送出，待賣方回覆";
  book.requestBuyerName = mockBuyerName;
  const requestedAt = new Date().toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  book.purchaseRequests = [
    ...(book.purchaseRequests || []),
    {
      id: Date.now(),
      buyerName: mockBuyerName,
      buyerTrustScore: currentUser?.trust_score,
      status: "待賣方回覆",
      createdAt: requestedAt,
      meetingTime: ""
    }
  ];
  addNotification(
    book,
    `${mockBuyerName} 已對「${book.title}」送出購買需求，發送時間：${requestedAt}。`,
    book.sellerName
  );

  renderBooks();
  renderMeetingOptions();
  renderTransactionRoleView();
  selectedBookId = book.id;
  showToast("購買需求已送出，已通知賣方，狀態更新為待賣方回覆。");
}

function findListingByNumber() {
  const listingNumber = Number(listingNumberLookupInput.value);
  const book = books.find((item) => item.listingNumber === listingNumber);

  if (!book) {
    showToast("找不到此刊登序號，請確認數字是否正確。");
    return;
  }

  meetingBookSelect.value = String(book.id);
  fillMeetingForm();
  selectedBookId = book.id;
  showToast(`已找到序號 ${book.listingNumber}：${book.title}`);
}

async function saveMeeting(event) {
  event.preventDefault();

  const book = books.find((item) => item.id === Number(meetingBookSelect.value));
  if (!book) return;

  if (apiConnected) {
    if (!requireLogin()) return;
    try {
      await api(`/api/books/${book.id}/meeting`, {
        method: "POST",
        body: JSON.stringify({
          meeting_time: meetingTimeInput.value,
          meeting_place: meetingPlaceInput.value.trim(),
          status: meetingStatusSelect.value
        })
      });
      await refreshFromApi();
      showToast("賣方已儲存面交安排，並通知買方。");
    } catch (error) {
      showToast(error.message);
    }
    return;
  }

  book.meetingTime = meetingTimeInput.value;
  book.meetingPlace = meetingPlaceInput.value.trim();
  book.status = meetingStatusSelect.value;
  if (book.requestStatus === "已送出，待賣方回覆" && book.status !== "未交易") {
    book.requestStatus = book.status === "交易完成" ? "賣方已核准，交易完成" : "賣方已核准";
    book.otherPendingRequests = 0;
  }
  if (book.requestStatus && book.requestStatus.startsWith("賣方已核准")) {
    addNotification(book, `賣方已更新面交資訊。${getMeetingSummary(book)}`);
  }

  renderBooks();
  renderMeetingOptions();
  renderTransactionRoleView();
  if (!detailView.classList.contains("hidden")) {
    renderDetail(book);
  }
  showToast("賣方已儲存面交安排，交易狀態已更新。");
}

form.addEventListener("submit", saveBook);
priceInput.addEventListener("input", updateDiscountPreview);
discountInput.addEventListener("input", updateDiscountPreview);
searchInput.addEventListener("input", renderBooks);
clearSearchButton.addEventListener("click", () => {
  searchInput.value = "";
  renderBooks();
  searchInput.focus();
});
bookList.addEventListener("click", handleBookAction);
detailContent.addEventListener("click", handleBookAction);
buyerTransactionList.addEventListener("click", handleBookAction);
sellerListingList.addEventListener("click", handleBookAction);
meetingBookSelect.addEventListener("change", fillMeetingForm);
meetingForm.addEventListener("submit", saveMeeting);
transactionRoleSelect.addEventListener("change", renderTransactionRoleView);
findListingButton.addEventListener("click", findListingByNumber);
cancelEditButton.addEventListener("click", resetBookForm);
backToListButton.addEventListener("click", showMainView);
tabButtons.forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tabTarget));
});
openRegisterButton.addEventListener("click", () => openAuthModal("register"));
openLoginButton.addEventListener("click", () => openAuthModal("login"));
gateRegisterButton.addEventListener("click", () => openAuthModal("register"));
gateLoginButton.addEventListener("click", () => openAuthModal("login"));
closeAuthButton.addEventListener("click", closeAuthModal);
registerModeButton.addEventListener("click", () => setAuthMode("register"));
loginModeButton.addEventListener("click", () => setAuthMode("login"));
logoutButton.addEventListener("click", async () => {
  authToken = "";
  currentUser = null;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  renderAuthState();
  await refreshFromApi();
  showToast("已登出。");
});
registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(registerForm);
  try {
    await api("/api/register", {
      method: "POST",
      body: JSON.stringify({
        name: formData.get("name").trim(),
        email: formData.get("email").trim(),
        password: formData.get("password")
      })
    });
    const data = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({
        email: formData.get("email").trim(),
        password: formData.get("password")
      })
    });
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem(TOKEN_STORAGE_KEY, authToken);
    registerForm.reset();
    closeAuthModal();
    await refreshFromApi();
    showToast("註冊並登入成功。");
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
      body: JSON.stringify({
        email: formData.get("email").trim(),
        password: formData.get("password")
      })
    });
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem(TOKEN_STORAGE_KEY, authToken);
    loginForm.reset();
    closeAuthModal();
    await refreshFromApi();
    showToast("登入成功。");
  } catch (error) {
    showToast(error.message);
  }
});
async function initialize() {
  updateDiscountPreview();
  renderAuthState();
  renderBooks();
  renderMeetingOptions();
  renderTransactionRoleView();
  renderNotifications();
  renderDetail(books.find((book) => book.id === selectedBookId) || books[0]);
  await refreshFromApi();
}

initialize();
