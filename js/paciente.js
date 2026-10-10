let idConsultaEscolhida = null;

const cartaoRemedio = (r) => `
  <article class="cartao item">
    <h3>${esc(r.nome_remedio)}</h3>
    <p>${icone("relogio")} Horário: <b>${esc(r.horario_remedio)}</b></p>
    <p>${icone("remedio")} Quantidade: <b>${esc(r.quantidade_remedio)}</b></p>
    <p>${icone("medico")} Receitado por: <b>${esc(r.nome_medico)}</b></p>
    <p>${icone("calendario")} Período: <b>${periodoRemedio(r)}</b></p>
    ${seloSituacao(r)}
  </article>`;

let diaTeste = null;
let diaDesenhado = null;

function diaPorExtenso(iso) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const semana = new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", { weekday: "long" });
  return `${semana}, ${dataBR(iso)}`;
}

const horasHTML = (horarios, atributo) => `
  <div class="acoes">${horarios.map((h) =>
    `<button type="button" class="btn" ${atributo}="${h.id}">${icone("relogio")} ${esc(h.horario_consulta)}</button>`).join("")}</div>`;

function agruparPorDia(consultas) {
  const dias = [];
  for (const c of consultas) {
    let dia = dias.find((d) => d.data_consulta === c.data_consulta);
    if (!dia) dias.push(dia = { data_consulta: c.data_consulta, horarios: [] });
    dia.horarios.push(c);
  }
  return dias;
}

async function buscarConsultas() {
  const filtros = new URLSearchParams({
    clinica: $("#filtro-clinica").value,
    especialidade: $("#filtro-especialidade").value,
    nome: $("#filtro-nome").value.trim()
  });
  const [livres, minhas] = await Promise.all([api(`/consultas/disponiveis?${filtros}`), api("/consultas")]);
  const jaMarquei = (c) => minhas.some((m) => m.id_medico === c.id_medico && m.data_consulta === c.data_consulta);

  const grupos = [];
  for (const c of livres) {
    if (jaMarquei(c)) continue;
    let grupo = grupos.find((g) => g.id_medico === c.id_medico && g.id_clinica === c.id_clinica && g.data_consulta === c.data_consulta);
    if (!grupo) grupos.push(grupo = { ...c, total: 0 });
    grupo.total += 1;
  }

  preencherLista($("#lista-medicos"), grupos, "Nenhuma consulta disponível.", (g) => `
    <article class="cartao item">
      <h3>${esc(g.nome_medico)}</h3>
      <p>${icone("especialidade")} ${esc(g.nome_especialidade)}</p>
      <p>${icone("clinica")} Clínica: <b>${esc(g.nome_clinica)}</b></p>
      <p>${icone("calendario")} Dia: <b>${dataBR(g.data_consulta)}</b></p>
      <p>${icone("relogio")} <b>${g.total === 1 ? "1 horário livre" : `${g.total} horários livres`}</b></p>
      <div class="acoes"><a class="btn" href="#horarios/${g.id_medico}_${g.id_clinica}_${g.data_consulta}">Ver horários ${icone("seta")}</a></div>
    </article>`);
}

async function carregarAgenda() {
  const hoje = hojeISO();
  const dia = diaTeste || hoje;
  const emTeste = dia !== hoje;
  const remedios = await api(`/remedios?dia=${dia}`);
  diaDesenhado = hoje;

  const aviso = $("#agenda-dia");
  aviso.classList.toggle("teste", emTeste);
  aviso.innerHTML = emTeste
    ? `${icone("relogio")} <span><b>Mostrando</b> ${diaPorExtenso(dia)}. Hoje é ${dataBR(hoje)}.</span>`
    : `${icone("calendario")} <span><b>Hoje</b>, ${diaPorExtenso(hoje)}</span>`;
  $("#testar-dia").hidden = emTeste || !$("#area-teste").hidden;
  $("#dia-teste").value = dia;

  if (!remedios.length) {
    $("#agenda").innerHTML = `<p class="agenda-vazia">${emTeste ? "Nenhum remédio neste dia." : "Nenhum remédio para hoje."}</p>`;
    return;
  }
  desenharAgenda(remedios);
}

function desenharAgenda(remedios) {
  $("#agenda").innerHTML = remedios.map((r) => `
    <div class="agenda-item ${r.tomado_hoje ? "tomado" : ""}">
      <button type="button" class="marcar" data-tomar="${r.id}" data-tomado="${r.tomado_hoje}"
        aria-pressed="${r.tomado_hoje}" aria-label="${r.tomado_hoje ? "Desmarcar" : "Marcar como tomado"}: ${esc(r.nome_remedio)}">${icone("ok")}</button>
      <span class="hora">${esc(r.horario_remedio)}</span>
      <span class="oque"><span class="nome">${esc(r.nome_remedio)}</span><span class="qtd">${esc(r.quantidade_remedio)}</span></span>
    </div>`).join("");
}

const telas = {
  inicio: {
    titulo: "Olá!",
    instrucoes: "Esta é a sua tela inicial. Aperte Marcar consulta para escolher uma consulta. No cartão Consultas está a sua próxima consulta; para mudar a hora, aperte Trocar horário. Na Agenda do dia estão os remédios que você deve tomar hoje. Quando tomar um remédio, aperte o quadrado ao lado dele. Quando o médico troca a receita, a agenda muda sozinha no dia certo.",
    async carregar() {
      const primeiroNome = (sessao.user.nome_paciente || "").split(" ")[0];
      $("#titulo").textContent = `Olá, ${primeiroNome}!`;

      const [, consultas] = await Promise.all([carregarAgenda(), api("/consultas")]);

      const proxima = consultas[0];
      $("#resumo-consulta").innerHTML = `<h2>CONSULTAS</h2>` + (proxima ? `
           <div class="item">
             <h3>${esc(proxima.nome_medico)}</h3>
             <p><b>${esc(proxima.nome_especialidade)}</b></p>
             <p>${icone("clinica")} <b>${esc(proxima.nome_clinica)}</b></p>
             <p>${icone("calendario")} <b>${dataBR(proxima.data_consulta)}</b> ${icone("relogio")} <b>${esc(proxima.horario_consulta)}</b></p>
             <div class="acoes"><a class="btn suave pequeno" href="#trocar/${proxima.id}">${icone("editar")} Trocar horário</a></div>
           </div>` : "");
    }
  },

  saude: {
    titulo: "Sua saúde",
    instrucoes: "Este é o seu primeiro acesso. Antes de começar, conte um pouco sobre a sua saúde. Diga se tem alguma doença, alguma alergia e se já toma algum remédio. Se não tiver, pode deixar em branco. Depois aperte Concluir.",
    menu: "inicio"
  },

  marcar: {
    titulo: "Marcar consulta",
    instrucoes: "Aqui estão as consultas disponíveis. Você pode escolher a clínica e a especialidade, ou digitar o nome do profissional. Depois aperte Ver horários na consulta que você quer.",
    menu: "inicio",
    voltar: "inicio",
    async carregar() {
      const [clinicas, especialidades] = await Promise.all([api("/clinicas"), api("/especialidades")]);
      const clinica = $("#filtro-clinica");
      const especialidade = $("#filtro-especialidade");
      clinica.innerHTML = opcoesHTML(clinicas.map(comoOpcaoClinica), clinica.value, "Todas as clínicas");
      especialidade.innerHTML = opcoesHTML(especialidades.map(comoOpcaoEspecialidade), especialidade.value, "Todas as especialidades");
      await buscarConsultas();
    }
  },

  horarios: {
    titulo: "Escolha o horário",
    instrucoes: "Estes são os horários livres desta consulta. Aperte no horário que você prefere.",
    menu: "inicio",
    voltar: "marcar",
    async carregar(parametro) {
      const [medico, clinica, data] = String(parametro || "").split("_");
      const filtros = new URLSearchParams({ medico: medico || "", clinica: clinica || "", data: data || "" });
      const horarios = medico && clinica && data ? await api(`/consultas/disponiveis?${filtros}`) : [];
      if (!horarios.length) {
        location.hash = "marcar";
        throw new Error("Os horários desta consulta acabaram. Escolha outra.");
      }
      const c = horarios[0];
      $("#medico-escolhido").innerHTML = `
        <div class="item">
          <h3>${esc(c.nome_medico)}</h3>
          <p>${icone("especialidade")} ${esc(c.nome_especialidade)}</p>
          <p>${icone("clinica")} <b>${esc(c.nome_clinica)}</b> ${esc(c.endereco_clinica)}</p>
          <p>${icone("calendario")} Dia: <b>${dataBR(c.data_consulta)}</b></p>
        </div>`;
      $("#lista-disponiveis").innerHTML = `
        <div class="cartao item">
          <h3>Horários livres</h3>
          ${horasHTML(horarios, "data-escolher")}
        </div>`;
    }
  },

  trocar: {
    titulo: "Trocar horário",
    instrucoes: "Aqui estão os outros horários livres deste profissional. Aperte no horário novo que você prefere. O horário antigo fica livre para outra pessoa.",
    menu: "inicio",
    voltar: "consultas",
    async carregar(id) {
      idConsultaEscolhida = id;
      const c = await api(`/consultas/${id}`);
      if (c.status !== "agendada") {
        location.hash = "consultas";
        throw new Error("Esta consulta não está mais marcada.");
      }
      const filtros = new URLSearchParams({ medico: c.id_medico, clinica: c.id_clinica });
      const dias = agruparPorDia(await api(`/consultas/disponiveis?${filtros}`));

      $("#consulta-atual").innerHTML = `
        <div class="item">
          <h3>${esc(c.nome_medico)}</h3>
          <p>${icone("especialidade")} ${esc(c.nome_especialidade)}</p>
          <p>${icone("clinica")} <b>${esc(c.nome_clinica)}</b> ${esc(c.endereco_clinica)}</p>
          <p>Horário atual: <b>${dataBR(c.data_consulta)}</b> às <b>${esc(c.horario_consulta)}</b></p>
        </div>`;
      preencherLista($("#lista-trocar"), dias, "Este profissional não tem outros horários livres.", (d) => `
        <div class="cartao item">
          <h3>${icone("calendario")} ${dataBR(d.data_consulta)}</h3>
          ${horasHTML(d.horarios, "data-trocar")}
        </div>`);
    }
  },

  anamnese: {
    titulo: "Conte ao médico",
    instrucoes: "Escreva o que você está sentindo. Só a primeira pergunta é obrigatória. Depois aperte Concluir para marcar a consulta.",
    menu: "inicio",
    voltar: "marcar",
    async carregar(id) {
      idConsultaEscolhida = id;
      $("#form-anamnese").reset();
      $("#form-anamnese input[name=inicio_sintomas]").max = hojeISO();
      const c = await api(`/consultas/${id}`);
      if (c.status !== "disponivel") {
        location.hash = "marcar";
        throw new Error("Esta consulta não está mais disponível. Escolha outra.");
      }
      $("#consulta-escolhida").innerHTML = `
        <div class="item">
          <h3>${esc(c.nome_medico)} · ${esc(c.nome_especialidade)}</h3>
          <p>${icone("clinica")} <b>${esc(c.nome_clinica)}</b> ${esc(c.endereco_clinica)}</p>
          <p>${icone("calendario")} <b>${dataBR(c.data_consulta)}</b> ${icone("relogio")} <b>${esc(c.horario_consulta)}</b></p>
        </div>`;
    }
  },

  consultas: {
    titulo: "Próximas consultas",
    instrucoes: "Aqui estão as consultas que você marcou. Para mudar a hora, aperte Trocar horário. Para desmarcar, aperte Cancelar consulta.",
    menu: "inicio",
    voltar: "inicio",
    async carregar() {
      const consultas = await api("/consultas");
      preencherLista($("#lista-consultas"), consultas, "Nenhuma consulta marcada.", (c) => `
        <article class="cartao item">
          <h3>${esc(c.nome_medico)}</h3>
          <p>${esc(c.nome_especialidade)}</p>
          <p>${icone("clinica")} Clínica: <b>${esc(c.nome_clinica)}</b></p>
          <p>${esc(c.endereco_clinica)}</p>
          <p>${icone("calendario")} Data da consulta: <b>${dataBR(c.data_consulta)}</b></p>
          <p>${icone("relogio")} Horário: <b>${esc(c.horario_consulta)}</b></p>
          <div class="acoes">
            <a class="btn suave" href="#trocar/${c.id}">${icone("editar")} Trocar horário</a>
            <button class="btn perigo" data-cancelar="${c.id}">${icone("x")} Cancelar consulta</button>
          </div>
        </article>`);
    }
  },

  remedios: {
    titulo: "Remédios",
    instrucoes: "Aqui estão os remédios que o médico receitou, com o horário, a quantidade e o período de cada um. Primeiro vêm os que estão em uso, depois os que ainda vão começar e por último os que já terminaram.",
    async carregar() {
      preencherLista($("#lista-remedios"), await api("/remedios"), "Nenhum remédio.", cartaoRemedio);
    }
  },

  perfil: {
    titulo: "Perfil",
    instrucoes: "Aqui você vê e edita seus dados e as informações da sua saúde, aumenta o tamanho do texto, liga o modo claro e sai da conta.",
    carregar: montarPerfil($("#view-perfil"), [
      { chave: "nome_paciente", rotulo: "Nome completo" },
      { chave: "data_nascimento", rotulo: "Data de nascimento", tipo: "date" },
      { chave: "telefone", rotulo: "Telefone", tipo: "tel", opcional: true },
      { chave: "email", rotulo: "E-mail", tipo: "email" },
      { chave: "condicoes_saude", rotulo: "Doenças ou condições de saúde", opcional: true },
      { chave: "alergias", rotulo: "Alergias", opcional: true },
      { chave: "medicamentos_em_uso", rotulo: "Medicamentos em uso", opcional: true }
    ])
  }
};

aoEnviar($("#form-anamnese"), async (valores) => {
  await api(`/consultas/${idConsultaEscolhida}/agendar`, { method: "PUT", body: valores });
  toast("Consulta marcada!");
  location.hash = "consultas";
});

aoEnviar($("#form-saude"), async (valores) => {
  const user = await api("/users/me", { method: "PUT", body: valores });
  sessao.atualizarUser(user);
  saudeNoServidor = !!user.anamnese_preenchida;
  toast("Informações salvas!");
  location.hash = "inicio";
});

$("#lista-disponiveis").addEventListener("click", (e) => {
  const id = e.target.closest("[data-escolher]")?.dataset.escolher;
  if (id) location.hash = `anamnese/${id}`;
});

$("#lista-trocar").addEventListener("click", async (e) => {
  const botao = e.target.closest("[data-trocar]");
  if (!botao) return;
  botao.disabled = true;
  try {
    await api(`/consultas/${idConsultaEscolhida}/trocar`, { method: "PUT", body: { id_nova: botao.dataset.trocar } });
    toast("Horário trocado!");
    location.hash = "inicio";
  } catch (falha) {
    toast(falha.message, "erro");
    recarregarTela();
  }
});

$("#filtro-medicos").addEventListener("submit", (e) => e.preventDefault());
$("#filtro-clinica").addEventListener("change", () => buscarConsultas().catch((falha) => toast(falha.message, "erro")));
$("#filtro-especialidade").addEventListener("change", () => buscarConsultas().catch((falha) => toast(falha.message, "erro")));
let relogioBusca;
$("#filtro-nome").addEventListener("input", () => {
  clearTimeout(relogioBusca);
  relogioBusca = setTimeout(() => buscarConsultas().catch((falha) => toast(falha.message, "erro")), 300);
});

$("#agenda").addEventListener("click", async (e) => {
  const botao = e.target.closest("[data-tomar]");
  if (!botao) return;
  botao.disabled = true;
  try {
    const dia = diaTeste || hojeISO();
    await api(`/remedios/${botao.dataset.tomar}/tomar`, { method: "PUT", body: { tomado: botao.dataset.tomado !== "true", dia } });
    await carregarAgenda();
  } catch (falha) {
    toast(falha.message, "erro");
    botao.disabled = false;
  }
});

$("#testar-dia").addEventListener("click", () => {
  $("#area-teste").hidden = false;
  $("#testar-dia").hidden = true;
  $("#dia-teste").focus();
});

$("#dia-teste").addEventListener("change", () => {
  const valor = $("#dia-teste").value;
  if (!valor) return;
  diaTeste = valor === hojeISO() ? null : valor;
  carregarAgenda().catch((falha) => toast(falha.message, "erro"));
});

$("#voltar-hoje").addEventListener("click", () => {
  diaTeste = null;
  $("#area-teste").hidden = true;
  carregarAgenda().catch((falha) => toast(falha.message, "erro"));
});

document.addEventListener("visibilitychange", () => {
  const naAgenda = !$("#view-inicio").hidden;
  if (document.visibilityState === "visible" && naAgenda && !diaTeste && diaDesenhado && diaDesenhado !== hojeISO()) {
    carregarAgenda().catch((falha) => toast(falha.message, "erro"));
  }
});

$("#lista-consultas").addEventListener("click", async (e) => {
  const id = e.target.closest("[data-cancelar]")?.dataset.cancelar;
  if (!id) return;
  const sim = await confirmar("Cancelar esta consulta?", "Os remédios receitados nesta consulta também saem da sua lista.", "Sim, cancelar");
  if (!sim) return;
  try {
    await api(`/consultas/${id}/cancelar`, { method: "PUT" });
    toast("Consulta cancelada.");
    recarregarTela();
  } catch (falha) { toast(falha.message, "erro"); }
});

let saudeNoServidor = null;

function exigirSaude() {
  const user = sessao.user;
  const preenchida = saudeNoServidor ?? (user && user.anamnese_preenchida);
  const respondeu = !user || user.tipo !== "paciente" || preenchida;
  if (respondeu && location.hash === "#saude") location.hash = "inicio";
  if (!respondeu && location.hash !== "#saude") location.hash = "saude";
}
window.addEventListener("hashchange", exigirSaude);
exigirSaude();
if (sessao.token) {
  api("/users/me").then((user) => {
    sessao.atualizarUser(user);
    saudeNoServidor = !!user.anamnese_preenchida;
    exigirSaude();
  }).catch(() => {});
}

iniciarArea({ tipo: "paciente", rotulo: "Paciente", telas });
