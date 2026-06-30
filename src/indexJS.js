// ── CONFIG SUPABASE ──
const SUPABASE_URL = "https://qttansxigwchcojwisau.supabase.co";
const SUPABASE_KEY = "sb_publishable_CDY-I7zP9OcKMZ-ZagSZKw_HxBli5Ki";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── ELEMENTOS ──
const fileInput       = document.getElementById("fileInput");
const cameraBtn      = document.getElementById("cameraBtn");
const previewWrap    = document.getElementById("previewWrap");
const previewImg     = document.getElementById("previewImg");
const previewVid     = document.getElementById("previewVid");
const clearPreview   = document.getElementById("clearPreview");
const sendBtn        = document.getElementById("sendBtn");
const nameInput      = document.getElementById("nameInput");
const gallery        = document.getElementById("gallery");
const onlineCount    = document.getElementById("onlineCount");
const photoCountLabel= document.getElementById("photoCountLabel");
const progressWrap   = document.getElementById("progressWrap");
const progressFill   = document.getElementById("progressFill");
const progressLabel  = document.getElementById("progressLabel");
const lightbox       = document.getElementById("lightbox");
const lightboxInner  = document.getElementById("lightboxInner");
const lightboxInfo   = document.getElementById("lightboxInfo");
const lightboxClose  = document.getElementById("lightboxClose");
const toastContainer = document.getElementById("toastContainer");

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

// Login anônimo
async function loginAnonimo() {
  const { data: { session } } = await sb.auth.getSession();

  if (!session) {
    const { error } = await sb.auth.signInAnonymously();
    if (error) {
      console.error("Erro no login anônimo:", error);
    }
  }  
}

// ── TOAST ──
function showToast(msg, type = "success") {
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  t.style.animation = "toast-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";
  toastContainer.appendChild(t);
  setTimeout(() => {
    t.style.opacity = "0";
    t.style.transform = "translateY(20px)";
    t.style.transition = "all 0.3s ease";
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

// ── EFEITO LIQUID GLASS NO UPLOAD CARD ──
const dropZone = document.getElementById("dropZone");
dropZone.addEventListener("mousemove", (e) => {
  const rect = dropZone.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  dropZone.style.setProperty("--mouse-x", x + "%");
  dropZone.style.setProperty("--mouse-y", y + "%");
});

dropZone.addEventListener("mouseleave", () => {
  dropZone.style.setProperty("--mouse-x", "50%");
  dropZone.style.setProperty("--mouse-y", "50%");
});

// ── ABRIR SELETOR DE ARQUIVOS ──
cameraBtn.addEventListener("click", (e) => {
  createRipple(e);
  fileInput.click();
});

// ── PREVIEW AO SELECIONAR ARQUIVO ──
fileInput.addEventListener("change", () => {
  if (!fileInput.files.length) return;

  arquivoSelecionado = fileInput.files[0];
  const url = URL.createObjectURL(arquivoSelecionado);

  previewImg.style.display = "none";
  previewVid.style.display = "none";

  if (arquivoSelecionado.type.startsWith("image")) {
    previewImg.src = url;
    previewImg.style.display = "block";
    previewImg.style.animation = "fade-in 0.5s ease";
  } else {
    previewVid.src = url;
    previewVid.style.display = "block";
    previewVid.style.animation = "fade-in 0.5s ease";
  }

  previewWrap.classList.add("show");
  sendBtn.disabled = false;
});

// ── LIMPAR PREVIEW ──
clearPreview.addEventListener("click", () => {
  arquivoSelecionado = null;
  fileInput.value = "";
  previewImg.src = "";
  previewVid.src = "";
  previewWrap.classList.remove("show");
  sendBtn.disabled = true;
});

// ── ENVIAR ──
sendBtn.addEventListener("click", async (e) => {
  createRipple(e);
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

  // Upload no Storage
  const { error } = await sb.storage
    .from("fotos")
    .upload(caminho, arquivoSelecionado);

  if (error) {
    showToast("Erro no Storage: " + error.message, "error");
    sendBtn.disabled = false;
    progressWrap.classList.remove("show");
    return;
  }

  progressFill.style.width = "70%";
  progressLabel.textContent = "Salvando dados...";

  // Obter URL pública
  const { data: urlData } = sb.storage.from("fotos").getPublicUrl(caminho);
  
  // Inserção na tabela do Banco de Dados
  const { data: foto, error: insertError } = await sb
    .from("fotos")
    .insert({
        owner_id: user.id,
        nome_arquivo: caminho
    })
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

  // Adiciona na galeria passando o ID retornado do banco (foto.id) em vez de null
  adicionarItemNaGaleria(urlData.publicUrl, arquivoSelecionado.type, nome, user.id, foto.id, caminho);
  atualizarContador(1);
  showToast("Foto enviada! 🎉");

  // Reset do formulário
  setTimeout(() => progressWrap.classList.remove("show"), 1000);
  arquivoSelecionado = null;
  fileInput.value = "";
  nameInput.value = "";
  previewImg.src = "";
  previewVid.src = "";
  previewWrap.classList.remove("show");
  sendBtn.disabled = true;
});

// ── ADICIONAR ITEM NA GALERIA ──
function adicionarItemNaGaleria(url, tipo, nome, owner_id, id, nome_arquivo) {
  document.getElementById("emptyState")?.remove();

  const item = document.createElement("div");
  item.className = "grid-item";
  item.style.opacity = "0";
  item.style.transform = "scale(0.9) translateY(20px)";
  item.style.transition = "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)";

  const isVideo = tipo.startsWith("video");

  item.innerHTML = isVideo
    ? `<video src="${url}" muted playsinline></video><span class="video-badge">▶ Vídeo</span>`
    : `<img src="${url}" loading="lazy">`;

  const overlay = document.createElement("div");
  overlay.className = "grid-item-overlay";
  if (nome) overlay.innerHTML = `<span class="grid-item-name">📸 ${nome}</span>`;
  item.appendChild(overlay);

  (async () => {
    const { data: { user } } = await sb.auth.getUser();

    if (user && owner_id === user.id) {
        const btn = document.createElement("button");
        btn.className = "delete-btn";
        btn.innerHTML = "🗑";

        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            if (confirm("Excluir esta foto?")) {
                excluirFoto(id, nome_arquivo);
            }
        });

        item.appendChild(btn);
    }
  })();

  item.addEventListener("click", () => abrirLightbox(url, isVideo, nome));
  gallery.prepend(item);

  // Trigger animação
  requestAnimationFrame(() => {
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

// ── CARREGAR GALERIA DO SUPABASE ──
async function carregarGaleria() {
  const { data, error } = await sb
    .from("fotos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    showToast("Erro ao carregar galeria", "error");
    console.error(error);
    return;
  }

  const arquivos = (data || []);
  if (arquivos.length === 0) return;

  document.getElementById("emptyState")?.remove();
  gallery.innerHTML = "";
  totalFotos = 0;

  for (const arquivo of arquivos) {
    const { data: urlData } = sb.storage
      .from("fotos")
      .getPublicUrl(arquivo.nome_arquivo);
      
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
  // 1. Remove do Storage primeiro
  const { error: storageError } = await sb.storage
      .from("fotos")
      .remove([caminho]);

  if (storageError) {
      showToast("Erro ao apagar arquivo: " + storageError.message, "error");
      return;
  }

  // 2. Remove do Banco garantindo a verificação de owner_id para a RLS
  const { data: { user } } = await sb.auth.getUser();
  
  const { error: dbError } = await sb
      .from("fotos")
      .delete()
      .eq("id", id)
      .eq("owner_id", user.id); // Alinhado com a sua política do print

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
    ? `<video src="${url}" controls autoplay playsinline style="max-width:100%;max-height:85dvh;border-radius:12px;display:block;"></video>`
    : `<img src="${url}" style="max-width:100%;max-height:85dvh;object-fit:contain;display:block;border-radius:12px;">`;

  lightboxInfo.textContent = nome ? "📸 " + nome : "";
  lightbox.classList.add("open");
}

lightboxClose.addEventListener("click", () => {
  lightbox.classList.remove("open");
  lightboxInner.innerHTML = "";
});

lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) {
    lightbox.classList.remove("open");
    lightboxInner.innerHTML = "";
  }
});

// ── INIT ──
carregarGaleria();