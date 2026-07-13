const books = [
  {
    id: 1,
    title: "系統分析與設計",
    category: "資訊管理",
    price: 320,
    condition: "有少量筆記",
    photoNote: "封面完整，內頁有重點標記",
    status: "待交易",
    requestStatus: ""
  },
  {
    id: 2,
    title: "資料庫系統概論",
    category: "資料庫",
    price: 280,
    condition: "近全新",
    photoNote: "書角完整，無明顯折痕",
    status: "待交易",
    requestStatus: ""
  },
  {
    id: 3,
    title: "JavaScript 入門",
    category: "程式設計",
    price: 220,
    condition: "有明顯使用痕跡",
    photoNote: "封面有磨損，內容完整",
    status: "交易預約中",
    requestStatus: ""
  }
];

const form = document.querySelector("#book-form");
const searchInput = document.querySelector("#search");
const clearSearchButton = document.querySelector("#clear-search");
const bookList = document.querySelector("#book-list");
const detailContent = document.querySelector("#detail-content");
const toast = document.querySelector("#toast");

let selectedBookId = null;

function getStatusClass(status) {
  if (status === "待交易") return "available";
  if (status === "交易預約中") return "pending";
  return "done";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2400);
}

function getFilteredBooks() {
  const keyword = searchInput.value.trim().toLowerCase();
  if (!keyword) return books;

  return books.filter((book) => {
    return [
      book.title,
      book.category,
      book.condition,
      book.status,
      book.photoNote
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
      const requestText = book.requestStatus
        ? `<span class="state pending">${book.requestStatus}</span>`
        : "";

      return `
        <article class="book-card">
          <div>
            <h3>${book.title}</h3>
            <div class="book-meta">
              <span>${book.category}</span>
              <span>NT$ ${book.price}</span>
              <span>${book.condition}</span>
            </div>
          </div>
          <span class="state ${getStatusClass(book.status)}">${book.status}</span>
          ${requestText}
          <div class="book-actions">
            <button class="secondary-button" type="button" data-action="detail" data-id="${book.id}">查看詳細資料</button>
            <button type="button" data-action="request" data-id="${book.id}">送出購買需求</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderDetail(book) {
  selectedBookId = book.id;
  detailContent.innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><strong>書名</strong>${book.title}</div>
      <div class="detail-item"><strong>類別</strong>${book.category}</div>
      <div class="detail-item"><strong>價格</strong>NT$ ${book.price}</div>
      <div class="detail-item"><strong>書況</strong>${book.condition}</div>
      <div class="detail-item"><strong>照片說明</strong>${book.photoNote}</div>
      <div class="detail-item"><strong>交易狀態</strong>${book.status}</div>
    </div>
  `;
}

function addBook(event) {
  event.preventDefault();

  const formData = new FormData(form);
  const book = {
    id: Date.now(),
    title: formData.get("title").trim(),
    category: formData.get("category"),
    price: Number(formData.get("price")),
    condition: formData.get("condition"),
    photoNote: formData.get("photoNote").trim(),
    status: formData.get("status"),
    requestStatus: ""
  };

  books.unshift(book);
  form.reset();
  document.querySelector("#status").value = "待交易";
  renderBooks();
  renderDetail(book);
  showToast("新增成功：書籍已出現在列表中。");
}

function handleBookAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const book = books.find((item) => item.id === Number(button.dataset.id));
  if (!book) return;

  if (button.dataset.action === "detail") {
    renderDetail(book);
    return;
  }

  book.requestStatus = "已送出，待賣方回覆";
  if (book.status === "待交易") {
    book.status = "交易預約中";
  }

  renderBooks();
  renderDetail(book);
  showToast("購買需求已送出，狀態更新為待賣方回覆。");
}

form.addEventListener("submit", addBook);
searchInput.addEventListener("input", renderBooks);
clearSearchButton.addEventListener("click", () => {
  searchInput.value = "";
  renderBooks();
  searchInput.focus();
});
bookList.addEventListener("click", handleBookAction);

renderBooks();
renderDetail(books.find((book) => book.id === selectedBookId) || books[0]);
