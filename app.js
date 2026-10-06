const API_URL = "/api";

function lerPreferencia(chave) {
  try { return localStorage.getItem(chave) === "sim"; } catch { return false; }
}
function aplicarAcessibilidade() {
  document.documentElement.classList.toggle("texto-maior", lerPreferencia("recordar_texto_maior"));
  document.documentElement.classList.toggle("modo-claro", lerPreferencia("recordar_modo_claro"));
}
aplicarAcessibilidade();

const sessao = {
  get token() { try { return localStorage.getItem("recordar_token"); } catch { return null; } },
  get user() { try { return JSON.parse(localStorage.getItem("recordar_user")); } catch { return null; } },
  salvar(token, user) {
    localStorage.setItem("recordar_token", token);
    localStorage.setItem("recordar_user", JSON.stringify(user));
  },
  atualizarUser(user) { localStorage.setItem("recordar_user", JSON.stringify(user)); },
  limpar() {
    localStorage.removeItem("recordar_token");
    localStorage.removeItem("recordar_user");
  }
};

const RAIZ = location.pathname.includes("/html/") ? "../" : "";
const PAGINA_DA_AREA = {
  paciente: `${RAIZ}html/paciente.html`,
  medico: `${RAIZ}html/medico.html`,
  administrador: `${RAIZ}html/admin.html`
};
const TEMA_DA_AREA = { paciente: "roxo", medico: "azul", administrador: "laranja" };

function sair() {
  sessao.limpar();
  location.href = `${RAIZ}index.html`;
}

async function api(caminho, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (sessao.token) headers.Authorization = `Bearer ${sessao.token}`;

  let resposta;
  try {
    resposta = await fetch(API_URL + caminho, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error("Não foi possível falar com o servidor. Verifique se a API está ligada.");
  }

  const dados = await resposta.json().catch(() => ({}));
  if (resposta.status === 401 && sessao.token) {
    sair();
    throw new Error("Sua sessão terminou. Entre novamente.");
  }
  if (!resposta.ok) throw new Error(dados.message || "Algo deu errado. Tente de novo.");
  return dados;
}

const $ = (seletor, raiz = document) => raiz.querySelector(seletor);

function esc(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function dataBR(data) {
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return data || "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const ICONES = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  remedio: '<rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-45 12 12)"/><path d="M9 9l6 6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3.5-5 7-5s7 1.5 7 5"/><path d="M16 4.5a3.5 3.5 0 010 7"/><path d="M18 15c2.5.5 4 2 4 5"/>',
  calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  lixeira: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  sair: '<path d="M9 4H5v16h4M15 8l4 4-4 4M19 12H9"/>',
  editar: '<path d="M4 20h4l11-11-4-4L4 16v4zM13 7l4 4"/>',
  som: '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/>',
  ok: '<path d="M5 12l5 5 9-10"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  voltar: '<path d="M15 5l-7 7 7 7"/>',
  seta: '<path d="M9 5l7 7-7 7"/>',
  escudo: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  telefone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
  clinica: '<path d="M4 21V5a2 2 0 012-2h8a2 2 0 012 2v16"/><path d="M16 10h3a1 1 0 011 1v10M2 21h20M10 7v4M8 9h4M9 21v-4h2v4"/>',
  especialidade: '<path d="M12 4v16M4 12h16"/><circle cx="12" cy="12" r="9"/>',
  chave: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
  busca: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  medico: '<path d="M6 3v6a4 4 0 008 0V3"/><path d="M10 13v3a4 4 0 008 0v-1"/><circle cx="18" cy="13" r="2"/>'
};
function icone(nome) {
  return `<svg class="icone" viewBox="0 0 24 24" aria-hidden="true">${ICONES[nome] || ""}</svg>`;
}
function desenharIcones(raiz = document) {
  raiz.querySelectorAll("[data-icone]").forEach((el) => {
    el.outerHTML = icone(el.dataset.icone);
  });
}

let relogioToast;
function toast(mensagem, tipo = "ok") {
  let el = $("#toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = mensagem;
  el.className = tipo === "erro" ? "erro" : "";
  el.hidden = false;
  clearTimeout(relogioToast);
  relogioToast = setTimeout(() => { el.hidden = true; }, 4500);
}

function confirmar(titulo, mensagem, textoSim = "Sim, continuar") {
  return new Promise((resolver) => {
    const d = document.createElement("dialog");
    d.innerHTML = `
      <h2>${esc(titulo)}</h2>
      <p>${esc(mensagem)}</p>
      <div class="acoes">
        <button class="btn suave" value="nao">Não, voltar</button>
        <button class="btn perigo" value="sim">${esc(textoSim)}</button>
      </div>`;
    document.body.appendChild(d);
    d.addEventListener("click", (e) => {
      const botao = e.target.closest("button");
      if (botao) d.close(botao.value);
    });
    d.addEventListener("close", () => {
      resolver(d.returnValue === "sim");
      d.remove();
    });
    d.showModal();
  });
}

function falar(texto) {
  if (!("speechSynthesis" in window)) {
    toast("Este navegador não tem leitura em voz alta.", "erro");
    return;
  }
  if (speechSynthesis.speaking || speechSynthesis.pending) {
    speechSynthesis.cancel();
    return;
  }
  const fala = new SpeechSynthesisUtterance(texto);
  fala.lang = "pt-BR";
  fala.rate = 0.9;
  speechSynthesis.speak(fala);
}

function preencherLista(el, itens, mensagemVazia, desenhar) {
  el.innerHTML = itens.length
    ? itens.map(desenhar).join("")
    : `<p class="vazio">${esc(mensagemVazia)}</p>`;
}

function lerFormulario(form) {
  const dados = new FormData(form);
  const valores = Object.fromEntries(dados);
  form.querySelectorAll("[data-multiplo]").forEach((grupo) => {
    valores[grupo.dataset.multiplo] = dados.getAll(grupo.dataset.multiplo);
  });
  return valores;
}

function opcoesHTML(itens, escolhido = "", primeira = "Escolha...") {
  return `<option value="">${esc(primeira)}</option>` + itens.map((i) =>
    `<option value="${esc(i.id)}" ${String(i.id) === String(escolhido) ? "selected" : ""}>${esc(i.nome)}</option>`).join("");
}

function caixasHTML(nome, legenda, itens, marcados = [], vazio = "Nenhuma opção cadastrada.") {
  const ids = marcados.map(String);
  return `<fieldset class="opcoes" data-multiplo="${esc(nome)}"><legend>${esc(legenda)}</legend>
    ${itens.length ? `<div class="caixas">${itens.map((i) => `
      <label><input type="checkbox" name="${esc(nome)}" value="${esc(i.id)}" ${ids.includes(String(i.id)) ? "checked" : ""}> ${esc(i.nome)}</label>`).join("")}</div>`
      : `<p class="dica">${esc(vazio)}</p>`}
  </fieldset>`;
}

const comoOpcaoClinica = (c) => ({ id: c.id, nome: c.nome_clinica });
const comoOpcaoEspecialidade = (e) => ({ id: e.id, nome: e.nome_especialidade });

function aoEnviar(form, acao) {
  form.addEventListener("input", () => {
    const erro = form.querySelector(".erro-form");
    if (erro) erro.hidden = true;
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const botao = form.querySelector("button[type=submit]");
    const erro = form.querySelector(".erro-form");
    if (erro) erro.hidden = true;
    botao.disabled = true;
    try {
      await acao(lerFormulario(form));
    } catch (falha) {
      if (erro) { erro.textContent = falha.message; erro.hidden = false; }
      else toast(falha.message, "erro");
    } finally {
      botao.disabled = false;
    }
  });
}

let recarregarTela = () => {};

function iniciarArea({ tipo, rotulo, telas }) {
  const user = sessao.user;
  if (!sessao.token || !user || user.tipo !== tipo) {
    location.replace(`${RAIZ}index.html`);
    return;
  }
  desenharIcones();
  $("#quem-nome").textContent = user.nome_paciente || user.nome_medico || user.nome_administrador || "";
  $("#quem-tipo").textContent = rotulo;

  let instrucoes = "";
  $("#ouvir").addEventListener("click", () => falar(instrucoes));

  async function mostrar() {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    const [nome, parametro] = (location.hash.slice(1) || "inicio").split("/");
    const chave = telas[nome] ? nome : "inicio";
    const tela = telas[chave];

    document.querySelectorAll(".view").forEach((v) => { v.hidden = v.id !== `view-${chave}`; });
    document.querySelectorAll("[data-nav]").forEach((a) => a.classList.toggle("ativa", a.dataset.nav === (tela.menu || chave)));
    $("#titulo").textContent = tela.titulo;
    document.title = `${tela.titulo} · Recordar`;
    instrucoes = tela.instrucoes || tela.titulo;

    const voltar = $("#voltar");
    voltar.hidden = !tela.voltar;
    if (tela.voltar) voltar.href = `#${tela.voltar}`;
    window.scrollTo(0, 0);

    try {
      if (tela.carregar) await tela.carregar(parametro);
    } catch (falha) {
      toast(falha.message, "erro");
    }
  }

  recarregarTela = mostrar;
  window.addEventListener("hashchange", mostrar);
  mostrar();
}

function montarPerfil(el, campos, { comAcessibilidade = true } = {}) {
  let editando = false;

  async function desenhar() {
    const user = await api("/users/me");
    sessao.atualizarUser(user);
    $("#quem-nome").textContent = user.nome_paciente || user.nome_medico || "";
    const mostra = (c) => (c.mostrar ? c.mostrar(user) : c.tipo === "date" ? dataBR(user[c.chave]) : user[c.chave]) || "Não informado";

    const listas = {};
    if (editando) {
      for (const c of campos) if (c.opcoes) listas[c.chave] = await c.opcoes();
    }
    const campoHTML = (c) => {
      if (c.tipo === "select") {
        return `<label class="campo"><span>${esc(c.rotulo)}</span>
          <select name="${c.chave}" required>${opcoesHTML(listas[c.chave], user[c.chave])}</select></label>`;
      }
      if (c.tipo === "caixas") return caixasHTML(c.chave, c.rotulo, listas[c.chave], c.marcados(user));
      return `<label class="campo"><span>${esc(c.rotulo)}</span>
        <input name="${c.chave}" type="${c.tipo || "text"}" value="${esc(user[c.chave])}" ${c.opcional ? "" : "required"}></label>`;
    };

    const dados = editando
      ? `<form id="form-perfil">
          ${campos.map(campoHTML).join("")}
          <p class="erro-form" hidden></p>
          <div class="item"><div class="acoes">
            <button type="submit" class="btn">${icone("ok")} Confirmar</button>
            <button type="button" class="btn suave" data-perfil="cancelar">Cancelar</button>
          </div></div>
        </form>`
      : `<dl class="dados">
          ${campos.map((c) => `<div><dt>${esc(c.rotulo)}</dt><dd>${esc(mostra(c))}</dd></div>`).join("")}
        </dl>
        <button class="btn suave" data-perfil="editar">${icone("editar")} Editar meus dados</button>`;

    el.innerHTML = `
      <div class="colunas">
        <div class="cartao"><h2>Dados pessoais</h2>${dados}</div>
        <div class="pilha">
          ${comAcessibilidade ? `
          <div class="cartao"><h2>Acessibilidade</h2>
            <label class="chave">Texto maior <input type="checkbox" data-pref="recordar_texto_maior" ${lerPreferencia("recordar_texto_maior") ? "checked" : ""}></label>
            <label class="chave">Modo claro <input type="checkbox" data-pref="recordar_modo_claro" ${lerPreferencia("recordar_modo_claro") ? "checked" : ""}></label>
          </div>` : ""}
          <button class="btn perigo largo" data-perfil="sair">${icone("sair")} Sair da conta</button>
          <button class="btn aviso largo" data-perfil="deletar">${icone("lixeira")} Deletar conta</button>
        </div>
      </div>`;

    const form = $("#form-perfil", el);
    if (form) {
      aoEnviar(form, async (valores) => {
        await api("/users/me", { method: "PUT", body: valores });
        editando = false;
        toast("Dados atualizados!");
        await desenhar();
      });
    }
  }

  el.addEventListener("click", async (e) => {
    const acao = e.target.closest("[data-perfil]")?.dataset.perfil;
    if (!acao) return;
    if (acao === "editar") { editando = true; desenhar().catch((falha) => toast(falha.message, "erro")); }
    if (acao === "cancelar") { editando = false; desenhar().catch((falha) => toast(falha.message, "erro")); }
    if (acao === "sair") sair();
    if (acao === "deletar") {
      const sim = await confirmar(
        "Deletar sua conta?",
        "Sua conta, suas consultas e seus remédios serão apagados para sempre. Não dá para desfazer.",
        "Sim, deletar"
      );
      if (!sim) return;
      try {
        await api("/users/me", { method: "DELETE" });
        sair();
      } catch (falha) { toast(falha.message, "erro"); }
    }
  });

  el.addEventListener("change", (e) => {
    const pref = e.target.dataset.pref;
    if (!pref) return;
    try { localStorage.setItem(pref, e.target.checked ? "sim" : "nao"); } catch {  }
    aplicarAcessibilidade();
  });

  return () => { editando = false; return desenhar(); };
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register(`${RAIZ}service-worker.js`).catch(() => {}));
}
