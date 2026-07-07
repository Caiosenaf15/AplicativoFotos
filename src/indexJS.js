// ── CONFIG SUPABASE ──
const SUPABASE_URL = "https://qttansxigwchcojwisau.supabase.co";
const SUPABASE_KEY = "sb_publishable_CDY-I7zP9OcKMZ-ZagSZKw_HxBli5Ki";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── ELEMENTOS ──
const fileInput       = document.getElementById("fileInput");
const cameraBtn       = document.getElementById("cameraBtn");
const dropZone         = document.getElementById("dropZone");
const previewWrap     = document.getElementById("previewWrap");
const previewGrid     = document.getElementById("previewGrid");
const previewCount    = document.getElementById("previewCount");
const clearAllPreview = document.getElementById("clearAllPreview");
const sendBtn         = document.getElementById("sendBtn");
const sendBtnLabel    = document.getElementById("sendBtnLabel");
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
const MAX_ARQUIVOS = 20; // limite de segurança por envio

// Lista de arquivos selecionados: [{ file, url, id, tipo: "image"|"video" }]
let arquivosSelecionados = [];
let idSeq = 0;

// ── DETECÇÃO DE TIPO (com reforço por extensão) ──
// Alguns celulares/navegadores entregam file.type vazio (comum com HEIC do
// iPhone, ou arquivos escolhidos via Google Fotos/gerenciador de arquivos no
// Android). Por isso não confiamos só no MIME type: também olhamos a extensão.
const EXT_IMAGEM = ["jpg","jpeg","png","gif","webp","heic","heif","bmp","tiff","tif","avif"];
const EXT_VIDEO  = ["mp4","mov","webm","m4v","avi","mkv","3gp","3gpp","hevc","mpeg","mpg"];

function extensaoDe(nomeArquivo) {
  const m = /\.([a-z0-9]+)$/i.exec(nomeArquivo || "");
  return m ? m[1].toLowerCase() : "";
}

function detectarTipo(file) {
  const ext = extensaoDe(file.name);
  if (file.type && file.type.startsWith("image")) return "image";
  if (file.type && file.type.startsWith("video")) return "video";
  if (EXT_IMAGEM.includes(ext)) return "image";
  if (EXT_VIDEO.includes(ext)) return "video";
  return null; // tipo não reconhecido
}

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
    const files = e.dataTransfer.files;
    if (files && files.length) selecionarArquivos(files);
  });
}

// ── ABRIR SELETOR DE ARQUIVOS ──
if (cameraBtn) {
  cameraBtn.addEventListener("click", (e) => {
    createRipple(e);
    fileInput.click();
  });
}

// ── SELECIONAR ARQUIVOS (input ou drag&drop) ──
// Aceita FileList ou array de File. Os arquivos válidos são ADICIONADOS
// à seleção atual, permitindo escolher em mais de uma vez.
function selecionarArquivos(fileList) {
  try {
    const arquivos = Array.from(fileList);

    if (arquivos.length === 0) return;

    let adicionados = 0;
    let rejeitadosTipo = 0;
    let rejeitadosTamanho = 0;

    for (const file of arquivos) {
      if (arquivosSelecionados.length + adicionados >= MAX_ARQUIVOS) {
        showToast(`Máximo de ${MAX_ARQUIVOS} arquivos por envio`, "error");
        break;
      }

      const tipo = detectarTipo(file);
      if (!tipo) {
        rejeitadosTipo++;
        console.warn("Arquivo ignorado (tipo não reconhecido):", file.name, file.type);
        continue;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        rejeitadosTamanho++;
        continue;
      }

      const url = URL.createObjectURL(file);
      arquivosSelecionados.push({ file, url, id: ++idSeq, tipo });
      adicionados++;
    }

    if (rejeitadosTipo > 0) {
      showToast("Alguns arquivos foram ignorados (formato não reconhecido)", "error");
    }
    if (rejeitadosTamanho > 0) {
      showToast(`Alguns arquivos passaram de ${MAX_SIZE_MB}MB e foram ignorados`, "error");
    }

    // Sempre re-renderiza, mesmo que nada tenha sido adicionado, para o
    // estado da tela (contador/botão) ficar sempre coerente.
    renderizarPreviews();
  } catch (err) {
    console.error("Erro ao processar arquivos selecionados:", err);
    showToast("Não foi possível ler os arquivos selecionados", "error");
  }
}

if (fileInput) {
  fileInput.addEventListener("change", () => {
    if (!fileInput.files || !fileInput.files.length) return;
    selecionarArquivos(fileInput.files);
    fileInput.value = ""; // permite selecionar os mesmos arquivos de novo depois
  });
}

// ── RENDERIZAR GRADE DE PRÉVIAS ──
function renderizarPreviews() {
  previewGrid.innerHTML = "";

  for (const item of arquivosSelecionados) {
    const cell = document.createElement("div");
    cell.className = "preview-item";

    if (item.tipo === "image") {
      const img = document.createElement("img");
      img.src = item.url;
      img.alt = "Pré-visualização";
      cell.appendChild(img);
    } else {
      const vid = document.createElement("video");
      vid.src = item.url;
      vid.muted = true;
      vid.playsInline = true;
      cell.appendChild(vid);
      const badge = document.createElement("span");
      badge.className = "preview-item-video-badge";
      badge.textContent = "▶";
      cell.appendChild(badge);
    }

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "preview-item-remove";
    removeBtn.setAttribute("aria-label", "Remover arquivo");
    removeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`;
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      removerArquivo(item.id);
    });
    cell.appendChild(removeBtn);

    previewGrid.appendChild(cell);
  }

  atualizarEstadoPreview();
}

// ── REMOVER UM ARQUIVO DA SELEÇÃO ──
function removerArquivo(id) {
  const alvo = arquivosSelecionados.find(a => a.id === id);
  if (alvo) URL.revokeObjectURL(alvo.url);
  arquivosSelecionados = arquivosSelecionados.filter(a => a.id !== id);
  renderizarPreviews();
}

// ── ATUALIZAR CONTADOR / BOTÕES CONFORME SELEÇÃO ──
function atualizarEstadoPreview() {
  const total = arquivosSelecionados.length;

  if (total === 0) {
    previewWrap.classList.remove("show");
    sendBtn.disabled = true;
    sendBtnLabel.textContent = "Enviar";
    previewCount.textContent = "";
    return;
  }

  previewWrap.classList.add("show");
  sendBtn.disabled = false;
  previewCount.textContent = `${total} ${total === 1 ? "arquivo selecionado" : "arquivos selecionados"}`;
  sendBtnLabel.textContent = total === 1 ? "Enviar" : `Enviar (${total})`;
}

// ── LIMPAR TODA A PRÉVIA/SELEÇÃO ──
function limparPreview() {
  arquivosSelecionados.forEach(item => URL.revokeObjectURL(item.url));
  arquivosSelecionados = [];
  fileInput.value = "";
  previewGrid.innerHTML = "";
  atualizarEstadoPreview();
}

if (clearAllPreview) {
  clearAllPreview.addEventListener("click", limparPreview);
}

// ── ENVIAR UM ARQUIVO (upload + registro no banco) ──
async function enviarUmArquivo(file, nome, userId, sufixoUnico) {
  const ext = file.name.split(".").pop();
  const nomeArquivo = `${Date.now()}_${sufixoUnico}${nome ? "_" + nome.replace(/\s+/g, "_") : ""}.${ext}`;
  const caminho = `${userId}/${nomeArquivo}`;

  const { error: uploadError } = await sb.storage.from("fotos").upload(caminho, file);
  if (uploadError) throw new Error("Erro no Storage: " + uploadError.message);

  const { data: urlData } = sb.storage.from("fotos").getPublicUrl(caminho);
  if (!urlData?.publicUrl) throw new Error("Erro ao gerar URL da foto");

  const { data: foto, error: insertError } = await sb
    .from("fotos")
    .insert({ owner_id: userId, nome_arquivo: caminho })
    .select()
    .single();
  if (insertError) throw new Error("Erro no Banco: " + insertError.message);

  return { publicUrl: urlData.publicUrl, id: foto.id, caminho };
}

// ── ENVIAR TODOS OS ARQUIVOS SELECIONADOS (sequencialmente) ──
async function enviarFotos() {
  if (!arquivosSelecionados.length) return;

  sendBtn.disabled = true;
  progressWrap.classList.add("show");
  progressLabel.textContent = "Conectando...";
  progressFill.style.width = "0%";

  try {
    await loginAnonimo();
    const { data: { user }, error: userError } = await sb.auth.getUser();

    if (userError || !user) {
      throw new Error("Não foi possível autenticar. Tente recarregar a página.");
    }

    const nome = nameInput.value.trim();
    const fila = [...arquivosSelecionados];
    const total = fila.length;
    const enviadosComSucesso = [];

    let enviados = 0;
    let falhas = 0;

    for (let i = 0; i < fila.length; i++) {
      const item = fila[i];
      progressLabel.textContent = `Enviando ${i + 1} de ${total}...`;
      progressFill.style.width = `${Math.round((i / total) * 100)}%`;

      try {
        const resultado = await enviarUmArquivo(item.file, nome, user.id, `${i}`);
        const tipoMime = item.tipo === "video" ? "video/mp4" : "image/jpeg";
        adicionarItemNaGaleria(resultado.publicUrl, tipoMime, nome, user.id, resultado.id, resultado.caminho);
        atualizarContador(1);
        enviados++;
        enviadosComSucesso.push(item.id);
      } catch (err) {
        console.error("Falha ao enviar arquivo:", item.file.name, err);
        showToast(`Erro em "${item.file.name}": ${err.message}`, "error");
        falhas++;
      }

      progressFill.style.width = `${Math.round(((i + 1) / total) * 100)}%`;
    }

    progressLabel.textContent = "Concluído!";

    if (enviados > 0) {
      showToast(enviados === 1 ? "Foto enviada! 🎉" : `${enviados} arquivos enviados! 🎉`);
    }
    if (falhas > 0) {
      showToast(`${falhas} ${falhas === 1 ? "arquivo falhou" : "arquivos falharam"} no envio`, "error");
    }

    // Remove da seleção apenas os que foram enviados com sucesso.
    // Os que falharam continuam na prévia para o usuário tentar de novo.
    arquivosSelecionados
      .filter(a => enviadosComSucesso.includes(a.id))
      .forEach(a => URL.revokeObjectURL(a.url));
    arquivosSelecionados = arquivosSelecionados.filter(a => !enviadosComSucesso.includes(a.id));
    fileInput.value = "";
    renderizarPreviews();

    if (enviados > 0) nameInput.value = "";

  } catch (err) {
    console.error("Erro geral no envio:", err);
    showToast(err.message || "Erro inesperado ao enviar. Tente novamente.", "error");
  } finally {
    // Garante que a UI nunca fique "travada" mesmo se algo falhar.
    setTimeout(() => progressWrap.classList.remove("show"), 1000);
    sendBtn.disabled = arquivosSelecionados.length === 0;
  }
}

if (sendBtn) {
  sendBtn.addEventListener("click", (e) => {
    createRipple(e);
    enviarFotos();
  });
}

// Enter no campo nome também envia (se houver arquivos selecionados)
if (nameInput) {
  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !sendBtn.disabled) enviarFotos();
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
    const tipo = ["mp4", "mov", "webm", "m4v", "avi", "mkv", "3gp"].includes(ext) ? "video/mp4" : "image/jpeg";

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