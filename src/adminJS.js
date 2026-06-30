 // ── CONFIG ──
  const SUPABASE_URL    = "https://qttansxigwchcojwisau.supabase.co";
  const SUPABASE_KEY    = "sb_publishable_CDY-I7zP9OcKMZ-ZagSZKw_HxBli5Ki";
  const ADMIN_PASSWORD  = "Megasenha";

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  // ── ELEMENTOS ──
  const loginWrap       = document.getElementById("loginWrap");
  const adminWrap       = document.getElementById("adminWrap");
  const passwordInput   = document.getElementById("passwordInput");
  const loginBtn        = document.getElementById("loginBtn");
  const loginError      = document.getElementById("loginError");
  const logoutBtn       = document.getElementById("logoutBtn");
  const adminGrid       = document.getElementById("adminGrid");
  const adminMeta       = document.getElementById("adminMeta");
  const confirmOverlay  = document.getElementById("confirmOverlay");
  const confirmFileName = document.getElementById("confirmFileName");
  const confirmCancel   = document.getElementById("confirmCancel");
  const confirmDelete   = document.getElementById("confirmDelete");
  const toastContainer  = document.getElementById("toastContainer");

  // ── ESTADO ──
  let arquivoParaDeletar  = null;
  let elementoParaDeletar = null;

  // ── TOAST ──
  function showToast(msg, type = "success") {
    const t = document.createElement("div");
    t.className = `toast ${type}`;
    t.textContent = msg;
    toastContainer.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  // ── LOGIN ──
  function tentarLogin() {
    if (passwordInput.value === ADMIN_PASSWORD) {
      sessionStorage.setItem("adminAuth", "1");
      entrarNoAdmin();
    } else {
      loginError.classList.add("show");
      passwordInput.value = "";
      passwordInput.focus();
    }
  }

  loginBtn.addEventListener("click", tentarLogin);
  passwordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") tentarLogin();
  });

  // ── LOGOUT ──
  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("adminAuth");
    adminWrap.classList.remove("show");
    loginWrap.style.display = "flex";
    passwordInput.value = "";
  });

  // ── ENTRAR NO PAINEL ──
  function entrarNoAdmin() {
    loginWrap.style.display = "none";
    adminWrap.classList.add("show");
    carregarFotos();
  }

  // ── CARREGAR FOTOS ──
  async function carregarFotos() {
    adminGrid.innerHTML = `
      <div class="loading-state">
        <span class="spin">⏳</span>
        Carregando fotos...
      </div>`;

    const { data, error } = await sb.storage
      .from("fotos")
      .list("", { sortBy: { column: "created_at", order: "desc" } });

    if (error) {
      showToast("Erro ao carregar: " + error.message, "error");
      return;
    }

    const arquivos = (data || []).filter(f => f.name.includes(".") && f.name !== ".emptyFolderPlaceholder");

    adminMeta.textContent = `${arquivos.length} ${arquivos.length === 1 ? "item" : "itens"} no álbum`;

    if (arquivos.length === 0) {
      adminGrid.innerHTML = `<div class="empty-state">📭 Nenhuma foto no álbum ainda.</div>`;
      return;
    }

    adminGrid.innerHTML = "";

    for (const arquivo of arquivos) {
      const { data: urlData } = sb.storage.from("fotos").getPublicUrl(arquivo.name);
      const ext = arquivo.name.split(".").pop().toLowerCase();
      const isVideo = ["mp4", "mov", "webm"].includes(ext);

      const partes = arquivo.name.split("_");
      const nomeExibido = partes.length > 1
        ? partes.slice(1).join(" ").replace("." + ext, "")
        : arquivo.name;

      const item = document.createElement("div");
      item.className = "admin-item";

      item.innerHTML = `
        ${isVideo
          ? `<video src="${urlData.publicUrl}" muted playsinline></video>
             <span class="video-badge">▶ Vídeo</span>`
          : `<img src="${urlData.publicUrl}" loading="lazy">`
        }
        <div class="admin-item-info">
          <div class="admin-item-name">${nomeExibido || arquivo.name}</div>
        </div>
        <button class="delete-btn" title="Apagar">🗑️</button>
      `;

      // passa a referência direta do elemento
      item.querySelector(".delete-btn").addEventListener("click", () => {
        abrirConfirmacao(arquivo.name, item);
      });

      adminGrid.appendChild(item);
    }
  }

  // ── MODAL CONFIRMAÇÃO ──
  function abrirConfirmacao(nomeArquivo, elemento) {
    arquivoParaDeletar  = nomeArquivo;
    elementoParaDeletar = elemento;
    confirmFileName.textContent = nomeArquivo;
    confirmOverlay.classList.add("open");
  }

  confirmCancel.addEventListener("click", () => {
    confirmOverlay.classList.remove("open");
    arquivoParaDeletar  = null;
    elementoParaDeletar = null;
  });

  confirmDelete.addEventListener("click", async () => {
    if (!arquivoParaDeletar) return;

    confirmDelete.textContent = "Apagando...";
    confirmDelete.disabled = true;

    const { error } = await sb.storage
      .from("fotos")
      .remove([arquivoParaDeletar]);

    confirmOverlay.classList.remove("open");
    confirmDelete.textContent = "Apagar";
    confirmDelete.disabled = false;

    if (error) {
      showToast("Erro ao apagar: " + error.message, "error");
    } else {
      // remove diretamente pelo elemento — sem depender de ID
      elementoParaDeletar?.remove();
      showToast("Foto apagada com sucesso ✓");

      const restantes = adminGrid.querySelectorAll(".admin-item").length;
      adminMeta.textContent = `${restantes} ${restantes === 1 ? "item" : "itens"} no álbum`;

      if (restantes === 0) {
        adminGrid.innerHTML = `<div class="empty-state">📭 Nenhuma foto no álbum ainda.</div>`;
      }
    }

    arquivoParaDeletar  = null;
    elementoParaDeletar = null;
  });

  // ── VERIFICAR SESSÃO ──
  if (sessionStorage.getItem("adminAuth") === "1") {
    entrarNoAdmin();
  }