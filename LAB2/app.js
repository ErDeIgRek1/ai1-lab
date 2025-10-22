
(function () {
  const $ = (sel, root=document) => root.querySelector(sel);

  const escapeHTML = (s="") => s.replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));

  const highlight = (text, term) => {
    if (!term || term.length < 2) return escapeHTML(text);
    const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escapeHTML(text).replace(new RegExp(esc, 'gi'), m => `<mark>${m}</mark>`);
  };

  const STORAGE_KEY = "todoTasks_v1";

  class Todo {
    constructor() {
      this.tasks = [];
      this.term = "";
      this.editingId = null;
      this.$list = $("#tasks");
      this.$empty = $("#empty");
      this.$status = $("#status");
      this.$search = $("#search");
      this.$searchCount = $("#searchCount");
      this.bindGlobalHandlers();
      this.load();
      this.draw();
    }

    bindGlobalHandlers() {
      this.$search.addEventListener("input", (e) => {
        this.term = e.target.value.trim();
        this.draw();
      });

      document.addEventListener("click", (e) => {
        if (this.editingId) {
          const editEl = this.$list.querySelector(`li[data-id="${this.editingId}"]`);
          if (editEl && !editEl.contains(e.target)) {
            this.commitEdit();
          }
        }
      });

      document.addEventListener("keydown", (e) => {
        if (!this.editingId) return;
        if (e.key === "Enter") this.commitEdit();
        if (e.key === "Escape") this.cancelEdit();
      });


      $("#addBtn").addEventListener("click", () => this.addFromForm());
      $("#newText").addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.addFromForm();
      });
    }

    setStatus(msg) {
      this.$status.textContent = msg || "";
      if (msg) setTimeout(() => (this.$status.textContent = ""), 3000);
    }

    validate(text, dueLocalValue) {
      const t = (text || "").trim();
      if (t.length < 3) return "Opis zadania musi mieć co najmniej 3 znaki.";
      if (t.length > 255) return "Opis zadania nie może przekraczać 255 znaków.";
      if (dueLocalValue) {
        const due = new Date(dueLocalValue);
        const now = new Date();
        if (isNaN(+due)) return "Nieprawidłowa data.";
        if (due <= now) return "Termin musi być w przyszłości (lub zostaw pusty).";
      }
      return null;
    }

    addFromForm() {
      const text = $("#newText").value;
      const dueLocal = $("#newDue").value || "";
      const err = this.validate(text, dueLocal);
      if (err) return this.setStatus(err);
      this.addTask(text, dueLocal ? new Date(dueLocal).toISOString() : null);
      $("#newText").value = "";
      $("#newDue").value = "";
      this.setStatus("Dodano zadanie.");
    }

    addTask(text, dueISO=null) {
      this.tasks.push({
        id: crypto.randomUUID(),
        text: text.trim(),
        dueISO: dueISO || null,
        createdAt: new Date().toISOString(),
      });
      this.save();
      this.draw();
    }

    deleteTask(id) {
      const idx = this.tasks.findIndex(t => t.id === id);
      if (idx !== -1) {
        this.tasks.splice(idx, 1);
        if (this.editingId === id) this.editingId = null;
        this.save();
        this.draw();
      }
    }

    startEdit(id) {
      this.editingId = id;
      this.draw();
      const li = this.$list.querySelector(`li[data-id="${id}"]`);
      const input = li?.querySelector(".edit-text");
      if (input) input.focus();
    }

    commitEdit() {
      const id = this.editingId;
      if (!id) return;
      const li = this.$list.querySelector(`li[data-id="${id}"]`);
      const text = li?.querySelector(".edit-text")?.value ?? "";
      const dueLocal = li?.querySelector(".edit-due")?.value ?? "";
      const err = this.validate(text, dueLocal || null);
      if (err) { this.setStatus(err); return; }
      const t = this.tasks.find(t => t.id === id);
      if (t) {
        t.text = text.trim();
        t.dueISO = dueLocal ? new Date(dueLocal).toISOString() : null;
        this.save();
      }
      this.editingId = null;
      this.draw();
      this.setStatus("Zapisano zmiany.");
    }

    cancelEdit() {
      this.editingId = null;
      this.draw();
      this.setStatus("Anulowano edycję.");
    }

    get filteredTasks() {
      if (!this.term || this.term.length < 2) return this.tasks;
      const q = this.term.toLowerCase();
      return this.tasks.filter(t => t.text.toLowerCase().includes(q));
    }

    formatDue(iso) {
      if (!iso) return "";
      try {
        const d = new Date(iso);
        if (isNaN(+d)) return "";
        const pad = (n) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      } catch { return ""; }
    }

    draw() {
      const tasks = this.filteredTasks;
      this.$list.innerHTML = "";

      if (this.term && this.term.length >= 2) {
        this.$searchCount.textContent = `Wyniki: ${tasks.length}`;
      } else {
        this.$searchCount.textContent = "";
      }

      if (tasks.length === 0) {
        this.$empty.hidden = false;
        return;
      }
      this.$empty.hidden = true;

      for (const t of tasks) {
        const li = document.createElement("li");
        li.className = "task";
        li.dataset.id = t.id;

        if (this.editingId === t.id) {
          li.innerHTML = `
            <input class="edit-text" type="text" value="${escapeHTML(t.text)}" />
            <input class="edit-due" type="datetime-local" value="${t.dueISO ? new Date(t.dueISO).toISOString().slice(0,16) : ""}" />
            <div class="actions">
              <button class="save">Zapisz</button>
              <button class="cancel">Anuluj</button>
              <button class="delete">Usuń</button>
            </div>
          `;
          li.querySelector(".save").addEventListener("click", (e) => { e.stopPropagation(); this.commitEdit(); });
          li.querySelector(".cancel").addEventListener("click", (e) => { e.stopPropagation(); this.cancelEdit(); });
          li.querySelector(".delete").addEventListener("click", (e) => { e.stopPropagation(); this.deleteTask(t.id); });
        } else {
          const dueText = t.dueISO ? `Termin: ${this.formatDue(t.dueISO)}` : "";
          li.innerHTML = `
            <div class="text">${highlight(t.text, this.term)}</div>
            <div class="due">${dueText}</div>
            <div class="actions">
              <button class="delete" title="Usuń">Usuń</button>
            </div>
          `;
          li.addEventListener("click", (e) => {
          e.stopPropagation();
          this.startEdit(t.id);
        });

          li.querySelector(".delete").addEventListener("click", (e) => { e.stopPropagation(); this.deleteTask(t.id); });
        }

        this.$list.appendChild(li);
      }
    }

    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.tasks));
      } catch (e) {
        this.setStatus("Błąd zapisu do LocalStorage.");
      }
    }

    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        this.tasks = raw ? JSON.parse(raw) : [];
      } catch (e) {
        this.tasks = [];
      }
    }
  }

  // Inicjalizacja
  window.todoApp = new Todo();
})();