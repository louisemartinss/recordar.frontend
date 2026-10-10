let idConsultaAberta = null;
let abaConsultas = "agendada";
let remediosDaConsulta = [];
let idRemedioEditando = null;

const formRemedio = $("#form-remedio");

const HORARIOS_DO_DIA = [];
for (let hora = 7; hora <= 18; hora++) {
  for (const minuto of ["00", "30"]) HORARIOS_DO_DIA.push(`${String(hora).padStart(2, "0")}:${minuto}`);
}

function desenharHorarios() {
  $("#campo-horarios").innerHTML = caixasHTML("horarios", "Horários disponíveis (marque um ou mais)",
    HORARIOS_DO_DIA.map((h) => ({ id: h, nome: h })));
  $("#campo-horarios .caixas").classList.add("horas");
}
desenharHorarios();

function sairDaEdicao() {
  idRemedioEditando = null;
  formRemedio.reset();
  formRemedio.data_inicio.value = hojeISO();
  formRemedio.data_fim.min = hojeISO();
  $("#titulo-remedio").textContent = "Adicionar remédio";
  $("#botao-remedio").textContent = "Adicionar";
  $("#cancelar-edicao").hidden = true;
}

function desenharAvisos(avisos) {
  $("#avisos").hidden = !avisos.length;
  $("#avisos").innerHTML = `<h2>${icone("relogio")} Avisos</h2>` + avisos.map((c) => `
    <div class="item">
      <p><b>${esc(c.nome_paciente)}</b> trocou o horário da consulta.</p>
      <p>Antes: <b>${dataBR(c.aviso_troca.data_anterior)} às ${esc(c.aviso_troca.horario_anterior)}</b></p>
      <p>Agora: <b>${dataBR(c.data_consulta)} às ${esc(c.horario_consulta)}</b></p>
      <div class="acoes">
        <a class="btn pequeno" href="#consulta/${c.id}">Abrir ${icone("seta")}</a>
        <button class="btn suave pequeno" data-visto="${c.id}">${icone("ok")} OK</button>
      </div>
    </div>`).join("");
}

$("#avisos").addEventListener("click", async (e) => {
  const id = e.target.closest("[data-visto]")?.dataset.visto;
  if (!id) return;
  try {
    await api(`/consultas/${id}/aviso-visto`, { method: "PUT" });
    recarregarTela();
  } catch (falha) { toast(falha.message, "erro"); }
});

const cartaoRemedio = (r) => `
  <article class="cartao item">
    <h3>${esc(r.nome_remedio)}</h3>
    <p>${icone("relogio")} Horário: <b>${esc(r.horario_remedio)}</b></p>
    <p>${icone("remedio")} Quantidade: <b>${esc(r.quantidade_remedio)}</b></p>
    <p>${icone("calendario")} Período: <b>${periodoRemedio(r)}</b></p>
    ${seloSituacao(r)}
    <div class="acoes">
      <button class="btn suave pequeno" data-editar="${r.id}">${icone("editar")} Editar</button>
      <button class="btn perigo pequeno" data-excluir="${r.id}">${icone("lixeira")} Excluir</button>
    </div>
  </article>`;

async function carregarRemedios() {
  remediosDaConsulta = await api(`/remedios?consulta=${idConsultaAberta}`);
  preencherLista($("#lista-remedios"), remediosDaConsulta, "Nenhum remédio.", cartaoRemedio);
}

let idPacienteAberto = null;
let remediosDoPaciente = [];

async function carregarRemediosDoPaciente() {
  remediosDoPaciente = await api(`/remedios?paciente=${encodeURIComponent(idPacienteAberto)}`);
  preencherLista($("#lista-remedios-paciente"), remediosDoPaciente, "Nenhum remédio receitado para este paciente.", cartaoRemedio);
}

function editarRemedioEmJanela(r) {
  const d = document.createElement("dialog");
  d.className = "largo";
  d.innerHTML = `
    <h2>Editar ${esc(r.nome_remedio)}</h2>
    <form>
      <label class="campo"><span>Nome do remédio</span><input name="nome_remedio" value="${esc(r.nome_remedio)}" required></label>
      <div class="grade-2">
        <label class="campo"><span>Horário</span><input name="horario_remedio" type="time" value="${esc(r.horario_remedio)}" required></label>
        <label class="campo"><span>Quantidade</span><input name="quantidade_remedio" value="${esc(r.quantidade_remedio)}" required></label>
      </div>
      <div class="grade-2">
        <label class="campo"><span>Data inicial do remédio</span><input name="data_inicio" type="date" value="${esc(r.data_inicio)}" required></label>
        <label class="campo"><span>Data final do remédio</span><input name="data_fim" type="date" value="${esc(r.data_fim)}" min="${esc(r.data_inicio)}" required></label>
      </div>
      <p class="dica">Para tirar o remédio da agenda a partir de amanhã, coloque a data final como hoje.</p>
      <p class="erro-form" hidden></p>
      <div class="acoes">
        <button type="button" class="btn suave" data-fechar>Cancelar</button>
        <button type="submit" class="btn">${icone("ok")} Salvar</button>
      </div>
    </form>`;
  document.body.appendChild(d);
  const form = d.querySelector("form");
  form.data_inicio.addEventListener("change", () => {
    form.data_fim.min = form.data_inicio.value;
    if (form.data_fim.value && form.data_fim.value < form.data_inicio.value) form.data_fim.value = form.data_inicio.value;
  });
  d.querySelector("[data-fechar]").addEventListener("click", () => d.close());
  d.addEventListener("close", () => d.remove());
  aoEnviar(form, async (valores) => {
    await api(`/remedios/${r.id}`, { method: "PUT", body: valores });
    d.close();
    toast("Remédio atualizado!");
    await carregarRemediosDoPaciente();
  });
  d.showModal();
}

const telas = {
  inicio: {
    titulo: "Olá!",
    instrucoes: "Se um paciente trocar o horário, aparece um aviso no topo; aperte OK depois de ler. Para criar consultas, escolha a clínica e o dia, marque todos os horários em que você vai atender e aperte Criar consulta. Cada horário marcado fica disponível para os pacientes. Suas consultas ficam no menu Consultas.",
    async carregar() {
      $("#form-consulta input[name=data_consulta]").min = hojeISO();
      const [eu, consultas] = await Promise.all([api("/users/me"), api("/consultas?status=agendada")]);
      const partes = (eu.nome_medico || "").split(" ");
      const nome = partes[0] && partes[0].endsWith(".") ? partes.slice(0, 2).join(" ") : partes[0];
      $("#titulo").textContent = `Olá, ${nome}!`;
      const campoClinica = $("#campo-clinica");
      const escolhida = campoClinica.value || (eu.clinicas.length === 1 ? eu.clinicas[0].id : "");
      campoClinica.innerHTML = opcoesHTML(eu.clinicas.map(comoOpcaoClinica), escolhida, "Escolha a clínica");
      $("#sem-clinica").hidden = eu.clinicas.length > 0;
      desenharAvisos(consultas.filter((c) => c.aviso_troca));
    }
  },

  consultas: {
    titulo: "Consultas",
    instrucoes: "Em Agendadas estão as consultas que os pacientes marcaram. Depois de atender, aperte Consulta realizada. Em Disponíveis estão os horários que ainda estão livres.",
    async carregar() {
      document.querySelectorAll("[data-aba]").forEach((b) => b.classList.toggle("ativa", b.dataset.aba === abaConsultas));
      const consultas = await api(`/consultas?status=${abaConsultas}`);
      const vazio = abaConsultas === "agendada" ? "Nenhuma consulta agendada." : "Nenhum horário disponível.";
      preencherLista($("#lista-consultas"), consultas, vazio, (c) => c.status === "agendada" ? `
        <article class="cartao item">
          <span class="selo">Agendada</span>
          <h3>${esc(c.nome_paciente)}</h3>
          <p>${icone("clinica")} Clínica: <b>${esc(c.nome_clinica)}</b></p>
          <p>${icone("calendario")} Data: <b>${dataBR(c.data_consulta)}</b></p>
          <p>${icone("relogio")} Horário: <b>${esc(c.horario_consulta)}</b></p>
          <div class="acoes">
            <button class="btn verde pequeno" data-realizada="${c.id}" data-nome="${esc(c.nome_paciente)}">${icone("ok")} Consulta realizada</button>
          </div>
        </article>` : `
        <article class="cartao item">
          <span class="selo livre">Disponível</span>
          <h3>Aguardando paciente</h3>
          <p>${icone("clinica")} Clínica: <b>${esc(c.nome_clinica)}</b></p>
          <p>${icone("calendario")} Data: <b>${dataBR(c.data_consulta)}</b></p>
          <p>${icone("relogio")} Horário: <b>${esc(c.horario_consulta)}</b></p>
          <div class="acoes">
            <button class="btn perigo pequeno" data-excluir="${c.id}">${icone("lixeira")} Excluir</button>
          </div>
        </article>`);
    }
  },

  pacientes: {
    titulo: "Pacientes",
    instrucoes: "Aqui estão os pacientes que marcaram consulta com você e os que já foram atendidos e ainda têm remédios seus em uso. O paciente sai desta lista quando a data final de todos os remédios passar. Aperte Abrir para ver a anamnese e receitar remédios. Aperte Remédios para ver, editar ou excluir todos os remédios que você receitou para o paciente.",
    async carregar() {
      const busca = encodeURIComponent($("#busca-paciente").value.trim());
      const pacientes = await api(`/consultas/meus-pacientes?busca=${busca}`);
      const qtd = (p) => {
        const ativos = p.remedios_ativos || 0;
        const total = p.total_remedios || 0;
        if (!total) return "Nenhum remédio receitado";
        const texto = ativos === 1 ? "1 remédio ativo" : `${ativos} remédios ativos`;
        return total > ativos ? `${texto} (${total} no total)` : texto;
      };
      preencherLista($("#lista-pacientes"), pacientes, "Nenhum paciente encontrado.", (p) => `
        <article class="cartao item">
          <h3>${esc(p.nome_paciente)}</h3>
          <p>${p.idade_paciente ?? "—"} anos</p>
          <p>${icone("calendario")} ${p.id_consulta
            ? `Consulta: <b>${dataBR(p.data_consulta)}</b> às <b>${esc(p.horario_consulta)}</b>`
            : "<b>Sem consulta agendada</b>"}</p>
          <p>${icone("remedio")} <b>${qtd(p)}</b></p>
          <div class="acoes">
            ${p.id_consulta ? `<a class="btn pequeno" href="#consulta/${p.id_consulta}">Abrir ${icone("seta")}</a>` : ""}
            <a class="btn suave pequeno" href="#remedios/${p.id_paciente}">${icone("remedio")} Remédios</a>
          </div>
        </article>`);
    }
  },

  remedios: {
    titulo: "Remédios do paciente",
    instrucoes: "Aqui estão todos os remédios que você receitou para este paciente, inclusive os de consultas que já foram realizadas. Aperte Editar para mudar o horário, a quantidade ou as datas. Aperte Excluir para tirar o remédio da agenda do paciente.",
    menu: "pacientes",
    voltar: "pacientes",
    async carregar(idPaciente) {
      idPacienteAberto = idPaciente;
      const [pacientes] = await Promise.all([api("/consultas/meus-pacientes"), carregarRemediosDoPaciente()]);
      const p = pacientes.find((x) => String(x.id_paciente) === String(idPaciente));
      const nome = p?.nome_paciente || remediosDoPaciente[0]?.nome_paciente;
      if (!nome) {
        location.hash = "pacientes";
        throw new Error("Paciente não encontrado.");
      }
      $("#titulo").textContent = nome;
      $("#remedios-paciente").innerHTML = `
        <div class="item">
          <h2>Remédios que você receitou</h2>
          <p>Os remédios aparecem na Agenda do dia do paciente só entre a data inicial e a data final.</p>
          ${p?.id_consulta ? `<div class="acoes"><a class="btn pequeno" href="#consulta/${p.id_consulta}">Abrir consulta ${icone("seta")}</a></div>` : ""}
        </div>`;
    }
  },

  consulta: {
    titulo: "Consulta",
    instrucoes: "À esquerda estão a anamnese geral do paciente e a anamnese desta consulta. À direita, digite o nome do remédio, o horário, a quantidade, a data inicial e a data final, e aperte Adicionar. O remédio só aparece na agenda do paciente entre essas duas datas.",
    menu: "pacientes",
    voltar: "pacientes",
    async carregar(id) {
      idConsultaAberta = id;
      sairDaEdicao();
      const c = await api(`/consultas/${id}`);
      if (c.status !== "agendada") {
        location.hash = "pacientes";
        throw new Error("Esta consulta não tem mais paciente.");
      }
      const a = c.anamnese || {};
      const linha = (rotulo, valor) => `<tr><th>${rotulo}</th><td>${esc(valor) || "Não informado"}</td></tr>`;
      $("#titulo").textContent = c.nome_paciente;
      const g = c.anamnese_geral || {};
      $("#anamnese").innerHTML = `
        <div class="cartao">
          <h2>Anamnese geral</h2>
          <table class="tabela">
            ${linha("Idade", `${c.idade_paciente ?? "—"} anos`)}
            ${linha("Condições de saúde", g.condicoes_saude)}
            ${linha("Alergias", g.alergias)}
            ${linha("Medicamentos em uso", g.medicamentos_em_uso)}
            ${linha("Telefone", c.telefone_paciente)}
            ${linha("E-mail", c.email_paciente)}
          </table>
        </div>
        <div class="cartao">
          <h2>Anamnese da consulta</h2>
          <table class="tabela">
            ${linha("Clínica", c.nome_clinica)}
            ${linha("Data e horário", `${dataBR(c.data_consulta)} às ${c.horario_consulta}`)}
            ${linha("Queixa principal", a.queixa_principal)}
            ${linha("Sintomas", a.sintomas)}
            ${linha("Quando começou", a.inicio_sintomas ? dataBR(a.inicio_sintomas) : "")}
          </table>
        </div>`;
      await carregarRemedios();
    }
  },

  perfil: {
    titulo: "Perfil",
    instrucoes: "Aqui você vê e edita seus dados. Aperte Editar para trocar a especialidade ou marcar as clínicas onde atende.",
    carregar: montarPerfil($("#view-perfil"), [
      { chave: "nome_medico", rotulo: "Nome completo" },
      {
        chave: "id_especialidade", rotulo: "Especialidade", tipo: "select",
        opcoes: async () => (await api("/especialidades")).map(comoOpcaoEspecialidade),
        mostrar: (u) => u.nome_especialidade
      },
      { chave: "crm", rotulo: "CRM" },
      {
        chave: "clinicas", rotulo: "Clínicas onde você atende", tipo: "seletor",
        opcoes: async () => (await api("/clinicas")).map(comoOpcaoClinica),
        marcados: (u) => u.clinicas.map((c) => c.id),
        mostrar: (u) => u.clinicas.map((c) => c.nome_clinica).join(", ") || "Nenhuma clínica ainda"
      },
      { chave: "telefone", rotulo: "Telefone", tipo: "tel", opcional: true },
      { chave: "email", rotulo: "E-mail", tipo: "email" }
    ])
  }
};

aoEnviar($("#form-consulta"), async (valores) => {
  if (!valores.horarios.length) throw new Error("Marque pelo menos um horário.");
  const resposta = await api("/consultas", { method: "POST", body: valores });
  $("#form-consulta").data_consulta.value = "";
  desenharHorarios();
  const repetidos = resposta.horarios_repetidos.length
    ? ` Você já tinha consulta às ${resposta.horarios_repetidos.join(", ")}.` : "";
  toast(`${resposta.message}${repetidos} Veja em Consultas.`);
  recarregarTela();
});

document.querySelectorAll("[data-aba]").forEach((botao) => {
  botao.addEventListener("click", () => {
    abaConsultas = botao.dataset.aba;
    recarregarTela();
  });
});

$("#lista-consultas").addEventListener("click", async (e) => {
  const feita = e.target.closest("[data-realizada]");
  if (feita) {
    const sim = await confirmar(
      "Consulta realizada?",
      `A consulta de ${feita.dataset.nome} sai da sua lista e da administração. Os remédios receitados continuam com o paciente.`,
      "Sim", "Não"
    );
    if (!sim) return;
    try {
      await api(`/consultas/${feita.dataset.realizada}/realizada`, { method: "PUT" });
      toast("Consulta realizada!");
      recarregarTela();
    } catch (falha) { toast(falha.message, "erro"); }
    return;
  }
  const botao = e.target.closest("[data-excluir]");
  if (!botao) return;
  if (!(await confirmar("Excluir este horário?", "Este horário deixará de aparecer para os pacientes.", "Sim, excluir"))) return;
  try {
    await api(`/consultas/${botao.dataset.excluir}`, { method: "DELETE" });
    toast("Consulta excluída.");
    recarregarTela();
  } catch (falha) { toast(falha.message, "erro"); }
});

let relogioBusca;
$("#busca-paciente").addEventListener("input", () => {
  clearTimeout(relogioBusca);
  relogioBusca = setTimeout(recarregarTela, 300);
});

aoEnviar(formRemedio, async (valores) => {
  if (idRemedioEditando) {
    await api(`/remedios/${idRemedioEditando}`, { method: "PUT", body: valores });
    toast("Remédio atualizado!");
  } else {
    await api("/remedios", { method: "POST", body: { ...valores, id_consulta: idConsultaAberta } });
    toast("Remédio receitado!");
  }
  sairDaEdicao();
  await carregarRemedios();
});
$("#cancelar-edicao").addEventListener("click", sairDaEdicao);
formRemedio.data_inicio.addEventListener("change", () => {
  formRemedio.data_fim.min = formRemedio.data_inicio.value;
  if (formRemedio.data_fim.value && formRemedio.data_fim.value < formRemedio.data_inicio.value) {
    formRemedio.data_fim.value = formRemedio.data_inicio.value;
  }
});

$("#lista-remedios").addEventListener("click", async (e) => {
  const editar = e.target.closest("[data-editar]")?.dataset.editar;
  const excluir = e.target.closest("[data-excluir]")?.dataset.excluir;

  if (editar) {
    const r = remediosDaConsulta.find((x) => x.id === editar);
    if (!r) return;
    idRemedioEditando = editar;
    formRemedio.nome_remedio.value = r.nome_remedio;
    formRemedio.horario_remedio.value = r.horario_remedio;
    formRemedio.quantidade_remedio.value = r.quantidade_remedio;
    formRemedio.data_inicio.value = r.data_inicio || "";
    formRemedio.data_fim.value = r.data_fim || "";
    formRemedio.data_fim.min = r.data_inicio || "";
    $("#titulo-remedio").textContent = "Editar remédio";
    $("#botao-remedio").textContent = "Salvar";
    $("#cancelar-edicao").hidden = false;
    formRemedio.nome_remedio.focus();
  }

  if (excluir) {
    if (!(await confirmar("Excluir este remédio?", "Ele sai da lista e da agenda do paciente.", "Sim, excluir"))) return;
    try {
      await api(`/remedios/${excluir}`, { method: "DELETE" });
      toast("Remédio excluído.");
      if (idRemedioEditando === excluir) sairDaEdicao();
      await carregarRemedios();
    } catch (falha) { toast(falha.message, "erro"); }
  }
});

$("#lista-remedios-paciente").addEventListener("click", async (e) => {
  const editar = e.target.closest("[data-editar]")?.dataset.editar;
  const excluir = e.target.closest("[data-excluir]")?.dataset.excluir;

  if (editar) {
    const r = remediosDoPaciente.find((x) => x.id === editar);
    if (r) editarRemedioEmJanela(r);
  }

  if (excluir) {
    if (!(await confirmar("Excluir este remédio?", "Ele sai da lista e da agenda do paciente.", "Sim, excluir"))) return;
    try {
      await api(`/remedios/${excluir}`, { method: "DELETE" });
      toast("Remédio excluído.");
      await carregarRemediosDoPaciente();
    } catch (falha) { toast(falha.message, "erro"); }
  }
});

iniciarArea({ tipo: "medico", rotulo: "Médico", telas });