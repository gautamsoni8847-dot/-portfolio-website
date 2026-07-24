/* =====================================================================
   Task Tracker — script.js (Task 3: JavaScript Logic & State Management)
   Vanilla JS only. Single source of truth (`tasks` array) drives every
   render; every mutation persists to localStorage immediately.
   ===================================================================== */

(() => {
  'use strict';

  /* -------------------------------------------------------------
     STATE
     ------------------------------------------------------------- */
  const STORAGE_KEY = 'gs-todo-tasks-v1';
  const THEME_KEY = 'gs-todo-theme';

  /** @type {{id:string, text:string, completed:boolean, createdAt:number}[]} */
  let tasks = loadTasks();
  let currentFilter = 'all'; // 'all' | 'active' | 'completed'
  let editingId = null;      // id of the task currently being edited, or null

  /* -------------------------------------------------------------
     DOM REFERENCES
     ------------------------------------------------------------- */
  const form = document.getElementById('task-form');
  const input = document.getElementById('task-input');
  const inputError = document.getElementById('input-error');
  const taskList = document.getElementById('task-list');
  const emptyState = document.getElementById('empty-state');
  const clearCompletedBtn = document.getElementById('clear-completed');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const statusAnnouncer = document.getElementById('status-announcer');

  const countTotalEl = document.getElementById('count-total');
  const countActiveEl = document.getElementById('count-active');
  const countCompletedEl = document.getElementById('count-completed');

  const themeToggle = document.querySelector('.theme-toggle');

  /* -------------------------------------------------------------
     PERSISTENCE
     ------------------------------------------------------------- */

  /** Reads and validates tasks from localStorage. Never throws. */
  function loadTasks() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isValidTask);
    } catch (err) {
      console.warn('Task Tracker: could not read stored tasks, starting fresh.', err);
      return [];
    }
  }

  /** Structural validation for a single stored task object. */
  function isValidTask(task) {
    return (
      task &&
      typeof task === 'object' &&
      typeof task.id === 'string' &&
      typeof task.text === 'string' &&
      typeof task.completed === 'boolean' &&
      typeof task.createdAt === 'number'
    );
  }

  function saveTasks() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (err) {
      console.error('Task Tracker: failed to save tasks to localStorage.', err);
    }
  }

  function generateId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  /* -------------------------------------------------------------
     TASK OPERATIONS (mutate state -> persist -> re-render)
     ------------------------------------------------------------- */

  function addTask(rawText) {
    const text = rawText.trim();
    if (!text) return false;

    tasks.push({
      id: generateId(),
      text,
      completed: false,
      createdAt: Date.now(),
    });

    saveTasks();
    render();
    announce('Task added.');
    return true;
  }

  function toggleTask(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    task.completed = !task.completed;
    saveTasks();
    render();
    announce(task.completed ? 'Task marked complete.' : 'Task marked active.');
  }

  function deleteTask(id) {
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return;
    tasks.splice(index, 1);
    if (editingId === id) editingId = null;
    saveTasks();
    render();
    announce('Task deleted.');
  }

  function startEdit(id) {
    editingId = id;
    render();
  }

  function cancelEdit() {
    editingId = null;
    render();
  }

  function saveEdit(id, rawText) {
    const text = rawText.trim();
    if (!text) return; // prevent empty task names — keep editing open
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    task.text = text;
    editingId = null;
    saveTasks();
    render();
    announce('Task updated.');
  }

  function clearCompleted() {
    const removedCount = tasks.filter((t) => t.completed).length;
    if (removedCount === 0) return;
    tasks = tasks.filter((t) => !t.completed);
    saveTasks();
    render();
    announce(`${removedCount} completed task${removedCount === 1 ? '' : 's'} cleared.`);
  }

  function setFilter(filter) {
    currentFilter = filter;
    filterButtons.forEach((btn) => {
      const isActive = btn.dataset.filter === filter;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });
    render();
  }

  function getFilteredTasks() {
    if (currentFilter === 'active') return tasks.filter((t) => !t.completed);
    if (currentFilter === 'completed') return tasks.filter((t) => t.completed);
    return tasks;
  }

  /* -------------------------------------------------------------
     RENDERING (DOM built purely from state; no innerHTML for text)
     ------------------------------------------------------------- */

  function render() {
    renderTaskList();
    renderCounters();
  }

  function renderTaskList() {
    const filtered = getFilteredTasks();
    const fragment = document.createDocumentFragment();

    filtered.forEach((task) => {
      fragment.appendChild(
        task.id === editingId ? buildEditRow(task) : buildTaskRow(task)
      );
    });

    taskList.replaceChildren(fragment);

    const noTasksAtAll = tasks.length === 0;
    const noneForThisFilter = filtered.length === 0;
    emptyState.hidden = !noneForThisFilter;
    if (noneForThisFilter) {
      emptyState.textContent = noTasksAtAll
        ? 'No tasks yet — add one above.'
        : currentFilter === 'active'
          ? 'No active tasks. Nice work!'
          : 'No completed tasks yet.';
    }
  }

  function buildTaskRow(task) {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.completed ? ' is-completed' : '');
    li.dataset.id = task.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = task.completed;
    checkbox.dataset.action = 'toggle';
    const toggleLabel = `Mark "${task.text}" as ${task.completed ? 'active' : 'complete'}`;
    checkbox.setAttribute('aria-label', toggleLabel);
    checkbox.title = toggleLabel;

    const text = document.createElement('span');
    text.className = 'task-text';
    text.textContent = task.text; // textContent only — never innerHTML

    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'icon-btn edit-btn';
    editBtn.dataset.action = 'edit';
    editBtn.setAttribute('aria-label', `Edit "${task.text}"`);
    editBtn.title = 'Edit task';
    editBtn.textContent = '✎';

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'icon-btn delete-btn';
    deleteBtn.dataset.action = 'delete';
    deleteBtn.setAttribute('aria-label', `Delete "${task.text}"`);
    deleteBtn.title = 'Delete task';
    deleteBtn.textContent = '✕';

    actions.append(editBtn, deleteBtn);
    li.append(checkbox, text, actions);
    return li;
  }

  function buildEditRow(task) {
    const li = document.createElement('li');
    li.className = 'task-item is-editing';
    li.dataset.id = task.id;

    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'edit-input';
    editInput.value = task.text;
    editInput.maxLength = 200;
    editInput.setAttribute('aria-label', 'Edit task text');

    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'icon-btn save-btn';
    saveBtn.dataset.action = 'save';
    saveBtn.setAttribute('aria-label', 'Save changes');
    saveBtn.title = 'Save changes';
    saveBtn.textContent = '✓';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'icon-btn cancel-btn';
    cancelBtn.dataset.action = 'cancel';
    cancelBtn.setAttribute('aria-label', 'Cancel editing');
    cancelBtn.title = 'Cancel editing';
    cancelBtn.textContent = '✕';

    actions.append(saveBtn, cancelBtn);
    li.append(editInput, actions);
    return li;
  }

  function renderCounters() {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const active = total - completed;

    countTotalEl.textContent = String(total);
    countActiveEl.textContent = String(active);
    countCompletedEl.textContent = String(completed);
  }

  function announce(message) {
    statusAnnouncer.textContent = message;
  }

  /* -------------------------------------------------------------
     EVENT HANDLING (delegation on #task-list; no per-item listeners)
     ------------------------------------------------------------- */

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const added = addTask(input.value);
    if (added) {
      input.value = '';
      inputError.hidden = true;
      input.focus();
    } else {
      inputError.hidden = false;
    }
  });

  input.addEventListener('input', () => {
    if (!inputError.hidden) inputError.hidden = true;
  });

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => setFilter(btn.dataset.filter));
  });

  clearCompletedBtn.addEventListener('click', clearCompleted);

  // Single delegated click handler for toggle/edit/delete/save/cancel
  taskList.addEventListener('click', (event) => {
    const actionEl = event.target.closest('[data-action]');
    if (!actionEl) return;
    const li = actionEl.closest('.task-item');
    if (!li) return;
    const id = li.dataset.id;
    const action = actionEl.dataset.action;

    switch (action) {
      case 'toggle':
        toggleTask(id);
        break;
      case 'edit':
        startEdit(id);
        break;
      case 'delete':
        deleteTask(id);
        break;
      case 'save': {
        const editInput = li.querySelector('.edit-input');
        if (editInput) saveEdit(id, editInput.value);
        break;
      }
      case 'cancel':
        cancelEdit();
        break;
      default:
        break;
    }
  });

  // Delegated change handler covers checkbox toggling via keyboard (Space)
  taskList.addEventListener('change', (event) => {
    if (event.target.matches('[data-action="toggle"]')) {
      const li = event.target.closest('.task-item');
      if (li) toggleTask(li.dataset.id);
    }
  });

  // Delegated keydown handler for the edit input: Enter saves, Escape cancels
  taskList.addEventListener('keydown', (event) => {
    if (!event.target.matches('.edit-input')) return;
    const li = event.target.closest('.task-item');
    if (!li) return;
    const id = li.dataset.id;

    if (event.key === 'Enter') {
      event.preventDefault();
      saveEdit(id, event.target.value);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEdit();
    }
  });

  /* -------------------------------------------------------------
     THEME TOGGLE (persisted, independent of the portfolio's theme key)
     ------------------------------------------------------------- */
  function applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    const isLight = theme === 'light';
    themeToggle.setAttribute('aria-pressed', String(isLight));
    themeToggle.querySelector('.icon').textContent = isLight ? '☀️' : '🌙';
    themeToggle.querySelector('.label').textContent = isLight ? 'Light' : 'Dark';
  }

  const savedTheme = window.localStorage.getItem(THEME_KEY);
  const systemPrefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  applyTheme(savedTheme || (systemPrefersLight ? 'light' : 'dark'));

  themeToggle.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const next = isLight ? 'dark' : 'light';
    applyTheme(next);
    window.localStorage.setItem(THEME_KEY, next);
  });

  /* -------------------------------------------------------------
     INIT
     ------------------------------------------------------------- */
  render();
})();