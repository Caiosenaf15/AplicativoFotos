// ── CONFIG SUPABASE ──
const SUPABASE_URL = "https://qttansxigwchcojwisau.supabase.co";
const SUPABASE_KEY = "sb_publishable_CDY-I7zP9OcKMZ-ZagSZKw_HxBli5Ki";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── ELEMENTOS ──
const fileInput       = document.getElementById("fileInput");
const cameraBtn       = document.getElementById("cameraBtn");
const dropZone         = document.getElementById("dropZone");
const previewWrap     = document.getElementById("previewWrap");
const previewImg      = document.getElementById("previewImg");
const previewVid      = document.getElementById("previewVid");
const clearPreview    = document.getElementById("clearPreview");
const sendBtn         = document.getElementById("sendBtn");
const nameInput       = document.getElementById("nameInput");
const gallery         = document.getElementById("gallery");
const onlineCount     = document.getElementById("onlineCount");
const photoCountLabel = document.getElementById("photoCountLabel");
const progressWrap    = document.getElementById("progressWrap");
const progressFill    = document.getElementById("progressFill");
const progressLabel   = document.getElementById("progressLabel");
const lightbox        = document.getElementById("lightbox");
const lightboxInner   = document.getElementById("lightboxInner");
const lightboxInfo    = document.getElementById("lightboxInfo");
const lightboxClose   = document.getElementById("lightboxClose");
const toastContainer  = document.getElementById("toastContainer");

const MAX_SIZE_MB = 50;

let arquivoSelecionado = null;

// ── EFEITO RIPPLE ──
function createRipple(event) {
  if (!event.target.closest("button")) return;
  const btn = event.target.closest("button");
  const ripple = document.createElement("span");
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;

  ripple.style.width = ripple.style.height = size + "px";
  ripple.style.left = x + "px";
  ripple.style.top = y + "px";
  ripple.className = "ripple";
  btn.appendChild(ripple);

  setTimeout(() => ripple.remove(), 600);
}

// ── LOGIN ANÔNIMO ──
async function loginAnonimo() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    const { error } = await sb.auth.signInAnonymously();
    if (error) console.error("Erro no login anônimo:", error);
  }
}

// ── TOAST ──
function showToast(msg, type = "success") {
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  toastContainer.appendChild(t);
  setTimeout(() => {
    t.style.opacity = "0";
    t.style.transform = "translateY(14px)";
    t.style.transition = "all .3s ease";
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

// ── ARRASTAR E SOLTAR ──
if (dropZone) {
  // ── ARRASTAR E SOLTAR ──
  ["dragenter", "dragover"].forEach(evt =>
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.add("drag-over");
    })
  );
  ["dragleave", "drop"].forEach(evt =>
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.remove("drag-over");
    })
  );
  dropZone.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files?.[0];
    if (file) selecionarArquivo(file);
  });
}

// ── ABRIR SELETOR DE ARQUIVOS ──
if (cameraBtn) {
  cameraBtn.addEventListener("click", (e) => {
    createRipple(e);
    fileInput.click();
  });
}

// ── SELECIONAR ARQUIVO (input ou drag&drop) ──
function selecionarArquivo(file) {
  if (!file.type.startsWith("image") && !file.type.startsWith("video")) {
    showToast("Selecione uma foto ou vídeo válido", "error");
    return;
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    showToast(`Arquivo muito grande (máx. ${MAX_SIZE_MB}MB)`, "error");
    return;
  }

  arquivoSelecionado = file;
  const url = URL.createObjectURL(file);

  previewImg.style.display = "none";
  previewVid.style.display = "none";

  if (file.type.startsWith("image")) {
    previewImg.src = url;
    previewImg.style.display = "block";
  } else {
    previewVid.src = url;
    previewVid.style.display = "block";
  }

  previewWrap.classList.add("show");
  sendBtn.disabled = false;
}

if (fileInput) {
  fileInput.addEventListener("change", () => {
    if (!fileInput.files.length) return;
    selecionarArquivo(fileInput.files[0]);
  });
}

// ── LIMPAR PREVIEW ──
function limparPreview() {
  arquivoSelecionado = null;
  fileInput.value = "";
  previewImg.src = "";
  previewVid.src = "";
  previewWrap.classList.remove("show");
  sendBtn.disabled = true;
}

if (clearPreview) {
  clearPreview.addEventListener("click", limparPreview);
}

// ── ENVIAR ──
async function enviarFoto() {
  if (!arquivoSelecionado) return;
  await loginAnonimo();

  const nome = nameInput.value.trim();
  const ext  = arquivoSelecionado.name.split(".").pop();
  const nomeArquivo = Date.now() + (nome ? "_" + nome.replace(/\s+/g, "_") : "") + "." + ext;

  sendBtn.disabled = true;
  progressWrap.classList.add("show");
  progressFill.style.width = "30%";
  progressLabel.textContent = "Enviando...";

  const { data: { user } } = await sb.auth.getUser();
  const caminho = `${user.id}/${nomeArquivo}`;

  const { error } = await sb.storage.from("fotos").upload(caminho, arquivoSelecionado);

  if (error) {
    showToast("Erro no Storage: " + error.message, "error");
    sendBtn.disabled = false;
    progressWrap.classList.remove("show");
    return;
  }

  progressFill.style.width = "70%";
  progressLabel.textContent = "Salvando dados...";

  const { data: urlData } = sb.storage.from("fotos").getPublicUrl(caminho);

  if (!urlData?.publicUrl) {
    showToast("Erro ao gerar URL da foto", "error");
    sendBtn.disabled = false;
    progressWrap.classList.remove("show");
    return;
  }

  const { data: foto, error: insertError } = await sb
    .from("fotos")
    .insert({ owner_id: user.id, nome_arquivo: caminho })
    .select()
    .single();

  if (insertError) {
    showToast("Erro no Banco: " + insertError.message, "error");
    sendBtn.disabled = false;
    progressWrap.classList.remove("show");
    return;
  }

  progressFill.style.width = "100%";
  progressLabel.textContent = "Concluído!";

  adicionarItemNaGaleria(urlData.publicUrl, arquivoSelecionado.type, nome, user.id, foto.id, caminho);
  atualizarContador(1);
  showToast("Foto enviada! 🎉");

  setTimeout(() => progressWrap.classList.remove("show"), 1000);
  limparPreview();
  nameInput.value = "";
}

if (sendBtn) {
  sendBtn.addEventListener("click", (e) => {
    createRipple(e);
    enviarFoto();
  });
}

// Enter no campo nome também envia (se houver arquivo selecionado)
if (nameInput) {
  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !sendBtn.disabled) enviarFoto();
  });
}

// ── ÍCONES SVG AUXILIARES ──
const svgTrash = `<svg viewBox="0 0 24 24" fill="none"><path d="M4 7H20M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M18 7l-.8 12.1A2 2 0 0 1 15.2 21H8.8a2 2 0 0 1-2-1.9L6 7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const svgPlay  = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4.8v14.4a1 1 0 0 0 1.5.87l12-7.2a1 1 0 0 0 0-1.74l-12-7.2A1 1 0 0 0 6 4.8Z"/></svg>`;

// ── ADICIONAR ITEM NA GALERIA ──
function adicionarItemNaGaleria(url, tipo, nome, owner_id, id, nome_arquivo) {
  document.getElementById("emptyState")?.remove();

  const item = document.createElement("div");
  item.className = "grid-item";
  item.style.opacity = "0";
  item.style.transform = "scale(0.9) translateY(20px)";

  const isVideo = tipo.startsWith("video");

  item.innerHTML = isVideo
    ? `<video src="${url}" muted playsinline></video><span class="video-badge">${svgPlay} Vídeo</span>`
    : `<img src="${url}" loading="lazy" alt="${nome || 'Foto da festa'}">`;

  const overlay = document.createElement("div");
  overlay.className = "grid-item-overlay";
  if (nome) overlay.innerHTML = `<span class="grid-item-name">📸 ${nome}</span>`;
  item.appendChild(overlay);

  (async () => {
    const { data: { user } } = await sb.auth.getUser();
    if (user && owner_id === user.id) {
      const btn = document.createElement("button");
      btn.className = "delete-btn";
      btn.setAttribute("aria-label", "Excluir foto");
      btn.innerHTML = svgTrash;
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (confirm("Excluir esta foto?")) excluirFoto(id, nome_arquivo);
      });
      item.appendChild(btn);
    }
  })();

  item.addEventListener("click", () => abrirLightbox(url, isVideo, nome));
  gallery.prepend(item);

  requestAnimationFrame(() => {
    item.style.transition = "all .5s cubic-bezier(0.22,1,0.36,1)";
    item.style.opacity = "1";
    item.style.transform = "scale(1) translateY(0)";
  });
}

// ── ATUALIZAR CONTADOR ──
let totalFotos = 0;
function atualizarContador(delta = 0) {
  totalFotos += delta;
  onlineCount.textContent = totalFotos;
  photoCountLabel.textContent = totalFotos > 0 ? `${totalFotos} ${totalFotos === 1 ? "item" : "itens"}` : "";
}

// ── CARREGAR GALERIA ──
async function carregarGaleria() {
  const { data, error } = await sb
    .from("fotos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    showToast("Erro ao carregar galeria", "error");
    console.error("Erro galeria:", error);
    return;
  }

  const arquivos = data || [];
  if (arquivos.length === 0) return;

  document.getElementById("emptyState")?.remove();
  gallery.innerHTML = "";
  totalFotos = 0;

  for (const arquivo of arquivos) {
    const { data: urlData } = sb.storage.from("fotos").getPublicUrl(arquivo.nome_arquivo);
    const ext = arquivo.nome_arquivo.split(".").pop().toLowerCase();
    const tipo = ["mp4", "mov", "webm"].includes(ext) ? "video/mp4" : "image/jpeg";

    const nomeArquivo = arquivo.nome_arquivo.split("/").pop();
    const partes = nomeArquivo.split("_");
    const nomeExtraido = partes.length > 1
      ? partes.slice(1).join("_").replace("." + ext, "").replace(/_/g, " ")
      : "";

    adicionarItemNaGaleria(urlData.publicUrl, tipo, nomeExtraido, arquivo.owner_id, arquivo.id, arquivo.nome_arquivo);
    totalFotos++;
  }

  onlineCount.textContent = totalFotos;
  photoCountLabel.textContent = `${totalFotos} ${totalFotos === 1 ? "item" : "itens"}`;
}

// ── EXCLUIR ──
async function excluirFoto(id, caminho) {
  const { error: storageError } = await sb.storage.from("fotos").remove([caminho]);
  if (storageError) {
    showToast("Erro ao apagar arquivo: " + storageError.message, "error");
    return;
  }

  const { data: { user } } = await sb.auth.getUser();
  const { error: dbError } = await sb
    .from("fotos")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (dbError) {
    showToast("Erro ao apagar dados: " + dbError.message, "error");
    return;
  }

  showToast("Foto excluída!");
  await carregarGaleria();
}

// ── LIGHTBOX ──
function abrirLightbox(url, isVideo, nome) {
  lightboxInner.innerHTML = isVideo
    ? `<video src="${url}" controls autoplay playsinline style="max-width:100%;max-height:82dvh;border-radius:14px;display:block;"></video>`
    : `<img src="${url}" style="max-width:100%;max-height:82dvh;object-fit:contain;display:block;border-radius:14px;" alt="${nome || 'Foto da festa'}">`;

  lightboxInfo.textContent = nome ? "📸 " + nome : "";
  lightbox.classList.add("open");
}

function fecharLightbox() {
  lightbox.classList.remove("open");
  lightboxInner.innerHTML = "";
}

if (lightboxClose) lightboxClose.addEventListener("click", fecharLightbox);
if (lightbox) {
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) fecharLightbox();
  });
}

// Esc fecha o lightbox
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && lightbox.classList.contains("open")) fecharLightbox();
});

// ── INIT ──
carregarGaleria();