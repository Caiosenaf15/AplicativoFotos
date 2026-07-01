// ── CONFIG ──
const SUPABASE_URL   = "https://qttansxigwchcojwisau.supabase.co";
const SUPABASE_KEY   = "sb_publishable_CDY-I7zP9OcKMZ-ZagSZKw_HxBli5Ki";
const ADMIN_PASSWORD = "Megasenha";

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

// ── ÍCONES ──
const svgTrash = `<svg viewBox="0 0 24 24" fill="none"><path d="M4 7H20M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M18 7l-.8 12.1A2 2 0 0 1 15.2 21H8.8a2 2 0 0 1-2-1.9L6 7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const svgPlay  = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4.8v14.4a1 1 0 0 0 1.5.87l12-7.2a1 1 0 0 0 0-1.74l-12-7.2A1 1 0 0 0 6 4.8Z"/></svg>`;

// ── ESTADO ──
let arquivoParaDeletar  = null;
let idParaDeletar       = null;
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
  loginBtn.disabled = true;
  loginBtn.textContent = "Entrando...";

  setTimeout(() => {
    if (passwordInput.value === ADMIN_PASSWORD) {
      sessionStorage.setItem("adminAuth", "1");
      entrarNoAdmin();
    } else {
      loginError.classList.add("show");
      passwordInput.value = "";
      passwordInput.focus();
    }
    loginBtn.disabled = false;
    loginBtn.textContent = "Entrar";
  }, 250);
}

loginBtn.addEventListener("click", tentarLogin);
passwordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") tentarLogin();
  loginError.classList.remove("show");
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
      <span class="spin"></span>
      Carregando fotos...
    </div>`;

  const { data, error } = await sb
    .from("fotos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro detalhado:", error);
    showToast("Erro ao carregar: " + error.message, "error");
    return;
  }

  const arquivos = data || [];
  adminMeta.textContent = `${arquivos.length} ${arquivos.length === 1 ? "item" : "itens"} no álbum`;

  if (arquivos.length === 0) {
    adminGrid.innerHTML = `<div class="empty-state">📭 Nenhuma foto no álbum ainda.</div>`;
    return;
  }

  adminGrid.innerHTML = "";

  for (const arquivo of arquivos) {
    const { data: urlData } = sb.storage.from("fotos").getPublicUrl(arquivo.nome_arquivo);
    const ext = arquivo.nome_arquivo.split(".").pop().toLowerCase();
    const isVideo = ["mp4", "mov", "webm"].includes(ext);

    const nomeArquivo = arquivo.nome_arquivo.split("/").pop();
    const partes = nomeArquivo.split("_");
    const nomeExibido = partes.length > 1
      ? partes.slice(1).join("_").replace("." + ext, "").replace(/_/g, " ")
      : nomeArquivo;

    const item = document.createElement("div");
    item.className = "admin-item";

    item.innerHTML = `
      ${isVideo
        ? `<video src="${urlData.publicUrl}" muted playsinline></video>
           <span class="video-badge">${svgPlay} Vídeo</span>`
        : `<img src="${urlData.publicUrl}" loading="lazy">`
      }
      <div class="admin-item-info">
        <div class="admin-item-name">${nomeExibido || nomeArquivo}</div>
      </div>
      <button class="delete-btn" title="Apagar" aria-label="Apagar foto">${svgTrash}</button>
    `;

    item.querySelector(".delete-btn").addEventListener("click", () => {
      abrirConfirmacao(arquivo.nome_arquivo, arquivo.id, item);
    });

    adminGrid.appendChild(item);
  }
}

// ── MODAL CONFIRMAÇÃO ──
function abrirConfirmacao(nomeArquivo, id, elemento) {
  arquivoParaDeletar  = nomeArquivo;
  idParaDeletar       = id;
  elementoParaDeletar = elemento;
  confirmFileName.textContent = nomeArquivo;
  confirmOverlay.classList.add("open");
}

function fecharConfirmacao() {
  confirmOverlay.classList.remove("open");
  arquivoParaDeletar  = null;
  idParaDeletar       = null;
  elementoParaDeletar = null;
}

confirmCancel.addEventListener("click", fecharConfirmacao);
confirmOverlay.addEventListener("click", (e) => {
  if (e.target === confirmOverlay) fecharConfirmacao();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && confirmOverlay.classList.contains("open")) fecharConfirmacao();
});

confirmDelete.addEventListener("click", async () => {
  if (!arquivoParaDeletar || !idParaDeletar) return;

  confirmDelete.textContent = "Apagando...";
  confirmDelete.disabled = true;

  const { error: dbError } = await sb.from("fotos").delete().eq("id", idParaDeletar);
  const { error: storageError } = await sb.storage.from("fotos").remove([arquivoParaDeletar]);

  confirmOverlay.classList.remove("open");
  confirmDelete.textContent = "Apagar";
  confirmDelete.disabled = false;

  if (dbError || storageError) {
    showToast("Erro ao apagar: " + (dbError?.message || storageError?.message), "error");
  } else {
    elementoParaDeletar?.remove();
    showToast("Foto apagada com sucesso ✓");

    const restantes = adminGrid.querySelectorAll(".admin-item").length;
    adminMeta.textContent = `${restantes} ${restantes === 1 ? "item" : "itens"} no álbum`;

    if (restantes === 0) {
      adminGrid.innerHTML = `<div class="empty-state">📭 Nenhuma foto no álbum ainda.</div>`;
    }
  }

  arquivoParaDeletar  = null;
  idParaDeletar       = null;
  elementoParaDeletar = null;
});

// ── VERIFICAR SESSÃO ──
if (sessionStorage.getItem("adminAuth") === "1") {
  entrarNoAdmin();
}