/**
 * TODO 任务管理 — 纯前端 SPA 逻辑（localStorage 版）
 *
 * 职责：
 *  - 集中式状态管理
 *  - localStorage 数据持久化
 *  - 任务列表渲染
 *  - 模态框控制（新建 / 编辑 / 删除确认）
 *  - 表单验证（客户端）
 *  - 筛选 & 排序
 *  - 键盘与可访问性支持
 */

/* ─── DOM 引用缓存 ──────────────────────────────────────────── */
const DOM = {
    // 工具栏
    filterBtns: document.querySelectorAll(".filter-btn"),
    sortSelect: document.getElementById("sort-select"),
    btnAddTask: document.getElementById("btn-add-task"),
    countAll: document.getElementById("count-all"),
    countActive: document.getElementById("count-active"),
    countCompleted: document.getElementById("count-completed"),

    // 状态
    loadingIndicator: document.getElementById("loading-indicator"),
    errorBanner: document.getElementById("error-banner"),
    errorMessage: document.getElementById("error-message"),
    btnErrorDismiss: document.getElementById("btn-error-dismiss"),

    // 任务
    taskList: document.getElementById("task-list"),
    emptyState: document.getElementById("empty-state"),

    // 模态框
    modalOverlay: document.getElementById("modal-overlay"),
    modalTitle: document.getElementById("modal-title"),
    taskForm: document.getElementById("task-form"),
    taskId: document.getElementById("task-id"),
    inputTitle: document.getElementById("input-title"),
    inputDescription: document.getElementById("input-description"),
    inputDueDate: document.getElementById("input-due-date"),
    btnSubmit: document.getElementById("btn-submit"),
    btnCancel: document.getElementById("btn-cancel"),
    btnModalClose: document.getElementById("btn-modal-close"),

    // 删除确认
    confirmOverlay: document.getElementById("confirm-overlay"),
    confirmMessage: document.getElementById("confirm-message"),
    btnConfirmDelete: document.getElementById("btn-confirm-delete"),
    btnConfirmCancel: document.getElementById("btn-confirm-cancel"),
    btnConfirmClose: document.getElementById("btn-confirm-close"),

    // 表单错误
    errorTitle: document.getElementById("error-title"),
    errorDescription: document.getElementById("error-description"),
    errorDueDate: document.getElementById("error-due-date"),
};

/* ─── 应用状态 ──────────────────────────────────────────────── */
const state = {
    tasks: [],              // 全部任务
    currentFilter: "all",   // all | active | completed
    currentSort: "created", // created | priority | due_date
    editingTaskId: null,    // 正在编辑的任务 ID
    deletingTaskId: null,   // 待删除的任务 ID
    isLoading: false,
};

/* ═══════════════════════════════════════════════════════════════
   localStorage 数据持久化层
   ═══════════════════════════════════════════════════════════════ */

const STORAGE_KEY = "todo_tasks";

/** 从 localStorage 读取所有任务 */
function loadFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

/** 将任务数组写入 localStorage */
function saveToStorage(tasks) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (err) {
        throw new Error("本地存储空间不足，请清理部分数据后重试");
    }
}

/** 生成唯一 ID（时间戳 + 随机数） */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

/** 获取当前 ISO 时间字符串 */
function nowISO() {
    return new Date().toISOString();
}

/* ═══════════════════════════════════════════════════════════════
   数据操作（替代原 API 层）
   ═══════════════════════════════════════════════════════════════ */

const db = {
    /** 获取筛选后的任务列表 */
    fetchTasks(status = "all") {
        let tasks = loadFromStorage();

        if (status === "active") {
            tasks = tasks.filter((t) => !t.completed);
        } else if (status === "completed") {
            tasks = tasks.filter((t) => t.completed);
        }

        return { tasks };
    },

    /** 根据 ID 获取单个任务 */
    fetchTask(taskId) {
        const tasks = loadFromStorage();
        const task = tasks.find((t) => t.id === taskId);
        if (!task) throw new Error("任务不存在");
        return { task };
    },

    /** 创建新任务 */
    createTask(payload) {
        const tasks = loadFromStorage();
        const now = nowISO();
        const newTask = {
            id: generateId(),
            title: payload.title,
            description: payload.description || "",
            priority: payload.priority || "medium",
            due_date: payload.due_date || null,
            completed: false,
            created_at: now,
            updated_at: now,
        };
        tasks.unshift(newTask);
        saveToStorage(tasks);
        return { task: newTask };
    },

    /** 更新任务（支持部分更新） */
    updateTask(taskId, payload) {
        const tasks = loadFromStorage();
        const idx = tasks.findIndex((t) => t.id === taskId);
        if (idx === -1) throw new Error("任务不存在");

        const allowedFields = ["title", "description", "priority", "due_date", "completed"];
        for (const key of allowedFields) {
            if (key in payload) {
                tasks[idx][key] = payload[key];
            }
        }
        tasks[idx].updated_at = nowISO();
        saveToStorage(tasks);
        return { task: tasks[idx] };
    },

    /** 切换任务完成状态 */
    toggleTask(taskId) {
        const tasks = loadFromStorage();
        const idx = tasks.findIndex((t) => t.id === taskId);
        if (idx === -1) throw new Error("任务不存在");

        tasks[idx].completed = !tasks[idx].completed;
        tasks[idx].updated_at = nowISO();
        saveToStorage(tasks);
        return { task: tasks[idx] };
    },

    /** 删除任务 */
    deleteTask(taskId) {
        const tasks = loadFromStorage();
        const idx = tasks.findIndex((t) => t.id === taskId);
        if (idx === -1) throw new Error("任务不存在");

        tasks.splice(idx, 1);
        saveToStorage(tasks);
        return { message: "任务已删除" };
    },
};

/* ═══════════════════════════════════════════════════════════════
   渲染层
   ═══════════════════════════════════════════════════════════════ */

/** 获取筛选后的任务列表 */
function getFilteredTasks() {
    let tasks = [...state.tasks];

    // 筛选
    if (state.currentFilter === "active") {
        tasks = tasks.filter((t) => !t.completed);
    } else if (state.currentFilter === "completed") {
        tasks = tasks.filter((t) => t.completed);
    }

    // 排序
    tasks.sort((a, b) => {
        switch (state.currentSort) {
            case "priority": {
                const order = { high: 0, medium: 1, low: 2 };
                return (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
            }
            case "due_date": {
                if (!a.due_date && !b.due_date) return 0;
                if (!a.due_date) return 1;
                if (!b.due_date) return -1;
                return new Date(a.due_date) - new Date(b.due_date);
            }
            case "created":
            default:
                return new Date(b.created_at) - new Date(a.created_at);
        }
    });

    return tasks;
}

/** 格式化日期为人类可读形式 */
function formatDate(dateStr) {
    if (!dateStr) return "";
    try {
        const d = new Date(dateStr);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    } catch {
        return dateStr;
    }
}

/** 检查截止日期是否过期 */
function isOverdue(dateStr, completed) {
    if (!dateStr || completed) return false;
    try {
        const due = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return due < today;
    } catch {
        return false;
    }
}

/** 获取优先级显示文本 */
function priorityLabel(priority) {
    const map = { high: "🔴 高", medium: "🟡 中", low: "🟢 低" };
    return map[priority] || "🟡 中";
}

/** 渲染单个任务卡片（返回 HTML 字符串，使用 textContent 安全方式） */
function createTaskElement(task) {
    const li = document.createElement("li");
    li.className = `task-item${task.completed ? " completed" : ""}`;
    li.setAttribute("role", "listitem");
    li.dataset.taskId = task.id;

    // 勾选框
    const checkboxWrapper = document.createElement("div");
    checkboxWrapper.className = "task-checkbox-wrapper";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", task.completed ? "标记为未完成" : "标记为已完成");
    checkbox.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleTaskComplete(task.id);
    });
    checkboxWrapper.appendChild(checkbox);

    // 内容区
    const content = document.createElement("div");
    content.className = "task-content";

    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = task.title;
    content.appendChild(title);

    if (task.description) {
        const desc = document.createElement("div");
        desc.className = "task-description";
        desc.textContent = task.description;
        content.appendChild(desc);
    }

    // 元信息
    const meta = document.createElement("div");
    meta.className = "task-meta";

    const badge = document.createElement("span");
    badge.className = `task-priority-badge priority-${task.priority}`;
    badge.textContent = priorityLabel(task.priority);
    meta.appendChild(badge);

    if (task.due_date) {
        const dueDate = document.createElement("span");
        dueDate.className = `task-due-date${isOverdue(task.due_date, task.completed) ? " overdue" : ""}`;
        dueDate.textContent = `📅 ${formatDate(task.due_date)}`;
        if (isOverdue(task.due_date, task.completed)) {
            dueDate.textContent += " ⚠️";
        }
        meta.appendChild(dueDate);
    }

    content.appendChild(meta);

    // 操作按钮
    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "task-btn task-btn-edit";
    editBtn.textContent = "✏️";
    editBtn.setAttribute("aria-label", `编辑任务: ${task.title}`);
    editBtn.title = "编辑";
    editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openEditModal(task.id);
    });
    actions.appendChild(editBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "task-btn task-btn-delete";
    deleteBtn.textContent = "🗑️";
    deleteBtn.setAttribute("aria-label", `删除任务: ${task.title}`);
    deleteBtn.title = "删除";
    deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openConfirmDialog(task.id);
    });
    actions.appendChild(deleteBtn);

    li.appendChild(checkboxWrapper);
    li.appendChild(content);
    li.appendChild(actions);

    // 点击卡片主体编辑
    li.addEventListener("click", () => openEditModal(task.id));

    return li;
}

/** 渲染完整任务列表 */
function renderTaskList() {
    const tasks = getFilteredTasks();

    // 清空
    DOM.taskList.innerHTML = "";

    if (tasks.length === 0) {
        DOM.emptyState.classList.remove("hidden");
    } else {
        DOM.emptyState.classList.add("hidden");
        const fragment = document.createDocumentFragment();
        tasks.forEach((task) => {
            fragment.appendChild(createTaskElement(task));
        });
        DOM.taskList.appendChild(fragment);
    }

    updateCounts();
}

/** 更新计数徽章 */
function updateCounts() {
    const total = state.tasks.length;
    const active = state.tasks.filter((t) => !t.completed).length;
    const completed = state.tasks.filter((t) => t.completed).length;

    DOM.countAll.textContent = total;
    DOM.countActive.textContent = active;
    DOM.countCompleted.textContent = completed;
}

/** 显示 / 隐藏加载指示器 */
function setLoading(loading) {
    state.isLoading = loading;
    if (loading) {
        DOM.loadingIndicator.classList.remove("hidden");
    } else {
        DOM.loadingIndicator.classList.add("hidden");
    }
}

/** 显示错误横幅 */
function showError(message) {
    DOM.errorMessage.textContent = message;
    DOM.errorBanner.classList.remove("hidden");
}

/** 隐藏错误横幅 */
function hideError() {
    DOM.errorBanner.classList.add("hidden");
}

/** 清空所有表单错误 */
function clearFormErrors() {
    const errorSpans = document.querySelectorAll(".form-error");
    errorSpans.forEach((span) => { span.textContent = ""; });

    const errorInputs = document.querySelectorAll(".input-error");
    errorInputs.forEach((input) => { input.classList.remove("input-error"); });
}

/** 设置字段错误 */
function setFieldError(fieldId, errorId, message) {
    const field = document.getElementById(fieldId);
    const errorSpan = document.getElementById(errorId);
    if (field) field.classList.add("input-error");
    if (errorSpan) errorSpan.textContent = message;
}

/* ═══════════════════════════════════════════════════════════════
   数据加载
   ═══════════════════════════════════════════════════════════════ */

function loadTasks() {
    hideError();
    try {
        const data = db.fetchTasks(state.currentFilter);
        state.tasks = data.tasks;
        renderTaskList();
    } catch (err) {
        showError(err.message);
        state.tasks = [];
        renderTaskList();
    }
}

/* ═══════════════════════════════════════════════════════════════
   任务操作
   ═══════════════════════════════════════════════════════════════ */

function toggleTaskComplete(taskId) {
    try {
        const data = db.toggleTask(taskId);
        // 原地更新任务数据
        const idx = state.tasks.findIndex((t) => t.id === taskId);
        if (idx !== -1) {
            state.tasks[idx] = data.task;
        }
        renderTaskList();
    } catch (err) {
        showError(err.message);
    }
}

function handleFormSubmit(e) {
    e.preventDefault();

    clearFormErrors();
    let hasError = false;

    // ── 客户端验证 ──
    const title = DOM.inputTitle.value.trim();
    if (!title) {
        setFieldError("input-title", "error-title", "任务标题不能为空");
        hasError = true;
    } else if (title.length > 200) {
        setFieldError("input-title", "error-title", "任务标题不能超过 200 个字符");
        hasError = true;
    }

    const description = DOM.inputDescription.value.trim();
    if (description.length > 2000) {
        setFieldError("input-description", "error-description", "任务描述不能超过 2000 个字符");
        hasError = true;
    }

    if (hasError) return;

    // ── 构建载荷 ──
    const priorityRadio = document.querySelector("input[name='priority']:checked");
    const priority = priorityRadio ? priorityRadio.value : "medium";
    const dueDate = DOM.inputDueDate.value || null;

    const payload = {
        title,
        description,
        priority,
        due_date: dueDate,
    };

    hideError();

    try {
        if (state.editingTaskId) {
            // 更新
            const data = db.updateTask(state.editingTaskId, payload);
            const idx = state.tasks.findIndex((t) => t.id === state.editingTaskId);
            if (idx !== -1) state.tasks[idx] = data.task;
        } else {
            // 新建
            const data = db.createTask(payload);
            state.tasks.unshift(data.task);
        }

        closeModal();
        renderTaskList();
    } catch (err) {
        showError(err.message);
    }
}

function handleDeleteConfirm() {
    if (!state.deletingTaskId) return;

    hideError();

    try {
        db.deleteTask(state.deletingTaskId);
        state.tasks = state.tasks.filter((t) => t.id !== state.deletingTaskId);
        closeConfirmDialog();
        renderTaskList();
    } catch (err) {
        showError(err.message);
        closeConfirmDialog();
    }
}

/* ═══════════════════════════════════════════════════════════════
   模态框控制
   ═══════════════════════════════════════════════════════════════ */

function openAddModal() {
    clearFormErrors();
    DOM.taskForm.reset();
    DOM.taskId.value = "";
    DOM.modalTitle.textContent = "新建任务";
    DOM.btnSubmit.textContent = "创建任务";
    state.editingTaskId = null;
    // 默认选中 medium
    const mediumRadio = document.querySelector("input[name='priority'][value='medium']");
    if (mediumRadio) mediumRadio.checked = true;
    DOM.modalOverlay.classList.remove("hidden");
    DOM.inputTitle.focus();
}

function openEditModal(taskId) {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    clearFormErrors();
    DOM.taskId.value = task.id;
    DOM.modalTitle.textContent = "编辑任务";
    DOM.btnSubmit.textContent = "保存修改";
    state.editingTaskId = taskId;

    DOM.inputTitle.value = task.title;
    DOM.inputDescription.value = task.description || "";
    DOM.inputDueDate.value = task.due_date || "";

    const radio = document.querySelector(`input[name='priority'][value='${task.priority}']`);
    if (radio) radio.checked = true;

    DOM.modalOverlay.classList.remove("hidden");
    DOM.inputTitle.focus();
}

function closeModal() {
    DOM.modalOverlay.classList.add("hidden");
    DOM.taskForm.reset();
    state.editingTaskId = null;
}

function openConfirmDialog(taskId) {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    state.deletingTaskId = taskId;
    DOM.confirmMessage.textContent = `确定要删除任务「${task.title}」吗？此操作不可撤销。`;
    DOM.confirmOverlay.classList.remove("hidden");
    DOM.btnConfirmDelete.focus();
}

function closeConfirmDialog() {
    DOM.confirmOverlay.classList.add("hidden");
    state.deletingTaskId = null;
}

/* ═══════════════════════════════════════════════════════════════
   事件绑定
   ═══════════════════════════════════════════════════════════════ */

function bindEvents() {
    // ── 筛选按钮 ──
    DOM.filterBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            DOM.filterBtns.forEach((b) => {
                b.classList.remove("active");
                b.setAttribute("aria-checked", "false");
            });
            btn.classList.add("active");
            btn.setAttribute("aria-checked", "true");
            state.currentFilter = btn.dataset.filter;
            loadTasks();
        });
    });

    // ── 排序 ──
    DOM.sortSelect.addEventListener("change", () => {
        state.currentSort = DOM.sortSelect.value;
        renderTaskList();
    });

    // ── 新建 ──
    DOM.btnAddTask.addEventListener("click", openAddModal);

    // ── 表单提交 ──
    DOM.taskForm.addEventListener("submit", handleFormSubmit);

    // ── 取消 / 关闭 ──
    DOM.btnCancel.addEventListener("click", closeModal);
    DOM.btnModalClose.addEventListener("click", closeModal);
    DOM.btnConfirmCancel.addEventListener("click", closeConfirmDialog);
    DOM.btnConfirmClose.addEventListener("click", closeConfirmDialog);

    // ── 删除确认 ──
    DOM.btnConfirmDelete.addEventListener("click", handleDeleteConfirm);

    // ── 错误关闭 ──
    DOM.btnErrorDismiss.addEventListener("click", hideError);

    // ── ESC 键关闭模态框 ──
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (!DOM.confirmOverlay.classList.contains("hidden")) {
                closeConfirmDialog();
            } else if (!DOM.modalOverlay.classList.contains("hidden")) {
                closeModal();
            }
        }
    });

    // ── 点击遮罩关闭 ──
    DOM.modalOverlay.addEventListener("click", (e) => {
        if (e.target === DOM.modalOverlay) {
            closeModal();
        }
    });

    DOM.confirmOverlay.addEventListener("click", (e) => {
        if (e.target === DOM.confirmOverlay) {
            closeConfirmDialog();
        }
    });

    // ── 阻止模态框内部点击冒泡 ──
    DOM.modalOverlay.querySelector(".modal").addEventListener("click", (e) => {
        e.stopPropagation();
    });

    DOM.confirmOverlay.querySelector(".modal").addEventListener("click", (e) => {
        e.stopPropagation();
    });
}

/* ═══════════════════════════════════════════════════════════════
   初始化
   ═══════════════════════════════════════════════════════════════ */

function init() {
    bindEvents();
    loadTasks();
}

// 启动应用
document.addEventListener("DOMContentLoaded", init);
