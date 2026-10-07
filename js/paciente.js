let idConsultaEscolhida = null;

const cartaoRemedio = (r) => `
  <article class="cartao item">
    <h3>${esc(r.nome_remedio)}</h3>
    <p>${icone("relogio")} Horário: <b>${esc(r.horario_remedio)}</b></p>
    <p>${icone("remedio")} Quantidade: <b>${esc(r.quantidade_remedio)}</b></p>
    <p>${icone("medico")} Receitado por: <b>${esc(r.nome_medico)}</b></p>
  </article>`;

async function buscarMedicos() {
  const filtros = new URLSearchParams({
    clinica: $("#filtro-clinica").value,
    especialidade: $("#filtro-especialidade").value,
    nome: $("#filtro-nome").value.trim()
  });
  const medicos = await api(`/medicos?${filtros}`);
  preencherLista($("#lista-medicos"), medicos, "Nenhum profissional encontrado.", (m) => `
    <article class="cartao item">
      <h3>${esc(m.nome_medico)}</h3>
      <p>${icone("especialidade")} ${esc(m.nome_especialidade)}</p>
      <p>${icone("clinica")} Atende em:</p>
      <div class="etiquetas">${m.clinicas.length
        ? m.clinicas.map((c) => `<span class="selo">${esc(c.nome_clinica)}</span>`).join("")
        : `<span class="selo livre">Sem clínica</span>`}</div>
      <div class="acoes"><a class="btn" href="#horarios/${m.id}">Ver horários ${icone("seta")}</a></div>
    </article>`);
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
    instrucoes: "Esta é a sua tela inicial. Aperte Marcar consulta para escolher um médico. Na Agenda do dia estão os seus remédios e o horário de cada um. Quando tomar um remédio, aperte o quadrado ao lado dele.",
    async carregar() {
      const primeiroNome = (sessao.user.nome_paciente || "").split(" ")[0];
      $("#titulo").textContent = `Olá, ${primeiroNome}!`;

      const [remedios, consultas] = await Promise.all([api("/remedios"), api("/consultas")]);
      desenharAgenda(remedios);

      const proxima = consultas[0];
      $("#resumo-consulta").innerHTML = `<h2>CONSULTAS</h2>` + (proxima ? `
           <div class="item">
             <h3>${esc(proxima.nome_medico)}</h3>
             <p><b>${esc(proxima.nome_especialidade)}</b></p>
             <p>${icone("clinica")} <b>${esc(proxima.nome_clinica)}</b></p>
             <p>${icone("calendario")} <b>${dataBR(proxima.data_consulta)}</b> ${icone("relogio")} <b>${esc(proxima.horario_consulta)}</b></p>
           </div>` : "");
    }
  },

  marcar: {
    titulo: "Marcar consulta",
    instrucoes: "Escolha a clínica e a especialidade, ou digite o nome do profissional. Depois aperte Ver horários no cartão do profissional que você quer.",
    menu: "inicio",
    voltar: "inicio",
    async carregar() {
      const [clinicas, especialidades] = await Promise.all([api("/clinicas"), api("/especialidades")]);
      const clinica = $("#filtro-clinica");
      const especialidade = $("#filtro-especialidade");
      clinica.innerHTML = opcoesHTML(clinicas.map(comoOpcaoClinica), clinica.value, "Todas as clínicas");
      especialidade.innerHTML = opcoesHTML(especialidades.map(comoOpcaoEspecialidade), especialidade.value, "Todas as especialidades");
      await buscarMedicos();
    }
  },

  horarios: {
    titulo: "Escolha o dia e o horário",
    instrucoes: "Estes são os dias e horários livres deste profissional. Aperte Escolher no horário que você prefere.",
    menu: "inicio",
    voltar: "marcar",
    async carregar(idMedico) {
      const clinica = $("#filtro-clinica").value;
      const [medicos, horarios] = await Promise.all([
        api("/medicos"),
        api(`/consultas/disponiveis?medico=${encodeURIComponent(idMedico)}&clinica=${encodeURIComponent(clinica)}`)
      ]);
      const m = medicos.find((x) => x.id === idMedico);
      if (!m) {
        location.hash = "marcar";
        throw new Error("Profissional não encontrado.");
      }
      $("#medico-escolhido").innerHTML = `
        <div class="item">
          <h3>${esc(m.nome_medico)}</h3>
          <p>${icone("especialidade")} ${esc(m.nome_especialidade)} · CRM ${esc(m.crm)}</p>
        </div>`;
      preencherLista($("#lista-disponiveis"), horarios, "Sem horários livres.", (c) => `
        <article class="cartao item">
          <h3>${dataBR(c.data_consulta)} às ${esc(c.horario_consulta)}</h3>
          <p>${icone("clinica")} Clínica: <b>${esc(c.nome_clinica)}</b></p>
          <p><b>${esc(c.endereco_clinica)}</b></p>
          <div class="acoes"><a class="btn" href="#anamnese/${c.id}">Escolher ${icone("seta")}</a></div>
        </article>`);
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
    instrucoes: "Aqui estão as consultas que você marcou. Para desmarcar, aperte Cancelar consulta.",
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
          <div class="acoes"><button class="btn perigo largo" data-cancelar="${c.id}">${icone("x")} Cancelar consulta</button></div>
        </article>`);
    }
  },

  remedios: {
    titulo: "Remédios",
    instrucoes: "Aqui estão os remédios que o médico receitou, com o horário e a quantidade de cada um.",
    async carregar() {
      preencherLista($("#lista-remedios"), await api("/remedios"), "Nenhum remédio.", cartaoRemedio);
    }
  },

  perfil: {
    titulo: "Perfil",
    instrucoes: "Aqui você vê e edita seus dados, aumenta o tamanho do texto, liga o modo claro e sai da conta.",
    carregar: montarPerfil($("#view-perfil"), [
      { chave: "nome_paciente", rotulo: "Nome completo" },
      { chave: "data_nascimento", rotulo: "Data de nascimento", tipo: "date" },
      { chave: "telefone", rotulo: "Telefone", tipo: "tel", opcional: true },
      { chave: "email", rotulo: "E-mail", tipo: "email" }
    ])
  }
};

aoEnviar($("#form-anamnese"), async (valores) => {
  await api(`/consultas/${idConsultaEscolhida}/agendar`, { method: "PUT", body: valores });
  toast("Consulta marcada!");
  location.hash = "consultas";
});

$("#filtro-medicos").addEventListener("submit", (e) => e.preventDefault());
$("#filtro-clinica").addEventListener("change", () => buscarMedicos().catch((falha) => toast(falha.message, "erro")));
$("#filtro-especialidade").addEventListener("change", () => buscarMedicos().catch((falha) => toast(falha.message, "erro")));
let relogioBusca;
$("#filtro-nome").addEventListener("input", () => {
  clearTimeout(relogioBusca);
  relogioBusca = setTimeout(() => buscarMedicos().catch((falha) => toast(falha.message, "erro")), 300);
});

$("#agenda").addEventListener("click", async (e) => {
  const botao = e.target.closest("[data-tomar]");
  if (!botao) return;
  botao.disabled = true;
  try {
    await api(`/remedios/${botao.dataset.tomar}/tomar`, { method: "PUT", body: { tomado: botao.dataset.tomado !== "true" } });
    desenharAgenda(await api("/remedios"));
  } catch (falha) {
    toast(falha.message, "erro");
    botao.disabled = false;
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

iniciarArea({ tipo: "paciente", rotulo: "Paciente", telas });
