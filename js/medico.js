let idConsultaAberta = null;
let remediosDaConsulta = [];
let idRemedioEditando = null;

const formRemedio = $("#form-remedio");

function sairDaEdicao() {
  idRemedioEditando = null;
  formRemedio.reset();
  $("#titulo-remedio").textContent = "Adicionar remédio";
  $("#botao-remedio").textContent = "Adicionar";
  $("#cancelar-edicao").hidden = true;
}

async function carregarRemedios() {
  remediosDaConsulta = await api(`/remedios?consulta=${idConsultaAberta}`);
  preencherLista($("#lista-remedios"), remediosDaConsulta, "Nenhum remédio.", (r) => `
    <article class="cartao item">
      <h3>${esc(r.nome_remedio)}</h3>
      <p>${icone("relogio")} Horário: <b>${esc(r.horario_remedio)}</b></p>
      <p>${icone("remedio")} Quantidade: <b>${esc(r.quantidade_remedio)}</b></p>
      <div class="acoes">
        <button class="btn suave pequeno" data-editar="${r.id}">${icone("editar")} Editar</button>
        <button class="btn perigo pequeno" data-excluir="${r.id}">${icone("lixeira")} Excluir</button>
      </div>
    </article>`);
}

const telas = {
  inicio: {
    titulo: "Minhas consultas",
    instrucoes: "Escolha a clínica, o dia e o horário e aperte Criar consulta. Abaixo ficam as suas consultas. As que já têm paciente mostram o nome dele.",
    async carregar() {
      $("#form-consulta input[name=data_consulta]").min = hojeISO();
      const [eu, consultas] = await Promise.all([api("/users/me"), api("/consultas")]);
      const campoClinica = $("#campo-clinica");
      const escolhida = campoClinica.value || (eu.clinicas.length === 1 ? eu.clinicas[0].id : "");
      campoClinica.innerHTML = opcoesHTML(eu.clinicas.map(comoOpcaoClinica), escolhida);
      $("#sem-clinica").hidden = eu.clinicas.length > 0;
      preencherLista($("#lista-consultas"), consultas, "Nenhuma consulta criada.", (c) => `
        <article class="cartao item">
          <span class="selo ${c.status === "disponivel" ? "livre" : ""}">${c.status === "agendada" ? "Agendada" : "Disponível"}</span>
          <h3>${c.nome_paciente ? esc(c.nome_paciente) : "Aguardando paciente"}</h3>
          <p>${icone("clinica")} Clínica: <b>${esc(c.nome_clinica)}</b></p>
          <p>${icone("calendario")} Data: <b>${dataBR(c.data_consulta)}</b></p>
          <p>${icone("relogio")} Horário: <b>${esc(c.horario_consulta)}</b></p>
          <div class="acoes">
            ${c.status === "agendada" ? `<a class="btn pequeno" href="#consulta/${c.id}">Abrir ${icone("seta")}</a>` : ""}
            <button class="btn perigo pequeno" data-excluir="${c.id}" data-agendada="${c.status === "agendada"}">${icone("lixeira")} Excluir</button>
          </div>
        </article>`);
    }
  },

  pacientes: {
    titulo: "Pacientes",
    instrucoes: "Aqui estão os pacientes que marcaram consulta com você. Aperte Abrir para ver a anamnese e receitar remédios.",
    async carregar() {
      const busca = encodeURIComponent($("#busca-paciente").value.trim());
      const pacientes = await api(`/consultas/meus-pacientes?busca=${busca}`);
      preencherLista($("#lista-pacientes"), pacientes, "Nenhum paciente encontrado.", (p) => `
        <article class="cartao item">
          <h3>${esc(p.nome_paciente)}</h3>
          <p>${p.idade_paciente ?? "—"} anos · Consulta: <b>${dataBR(p.data_consulta)}</b> às <b>${esc(p.horario_consulta)}</b></p>
          <div class="acoes"><a class="btn pequeno" href="#consulta/${p.id_consulta}">Abrir ${icone("seta")}</a></div>
        </article>`);
    }
  },

  consulta: {
    titulo: "Consulta",
    instrucoes: "À esquerda está o que o paciente escreveu. À direita, digite o nome do remédio, o horário e a quantidade, e aperte Adicionar.",
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
      $("#anamnese").innerHTML = `
        <h2>Anamnese da consulta</h2>
        <table class="tabela">
          ${linha("Idade", `${c.idade_paciente ?? "—"} anos`)}
          ${linha("Clínica", c.nome_clinica)}
          ${linha("Data e horário", `${dataBR(c.data_consulta)} às ${c.horario_consulta}`)}
          ${linha("Queixa principal", a.queixa_principal)}
          ${linha("Sintomas", a.sintomas)}
          ${linha("Quando começou", a.inicio_sintomas ? dataBR(a.inicio_sintomas) : "")}
          ${linha("Condições de saúde", a.condicoes_saude)}
          ${linha("Alergias", a.alergias)}
          ${linha("Medicamentos em uso", a.medicamentos_em_uso)}
          ${linha("Telefone", c.telefone_paciente)}
          ${linha("E-mail", c.email_paciente)}
        </table>`;
      await carregarRemedios();
    }
  },

  perfil: {
    titulo: "Perfil",
    instrucoes: "Aqui você vê e edita seus dados. Aperte Editar meus dados para trocar a especialidade ou marcar as clínicas onde atende.",
    carregar: montarPerfil($("#view-perfil"), [
      { chave: "nome_medico", rotulo: "Nome completo" },
      {
        chave: "id_especialidade", rotulo: "Especialidade", tipo: "select",
        opcoes: async () => (await api("/especialidades")).map(comoOpcaoEspecialidade),
        mostrar: (u) => u.nome_especialidade
      },
      { chave: "crm", rotulo: "CRM" },
      {
        chave: "clinicas", rotulo: "Clínicas onde você atende", tipo: "caixas",
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
  await api("/consultas", { method: "POST", body: valores });
  $("#form-consulta").data_consulta.value = "";
  $("#form-consulta").horario_consulta.value = "";
  toast("Consulta criada!");
  recarregarTela();
});

$("#lista-consultas").addEventListener("click", async (e) => {
  const botao = e.target.closest("[data-excluir]");
  if (!botao) return;
  const aviso = botao.dataset.agendada === "true"
    ? "Um paciente já marcou esta consulta. Ela e os remédios receitados nela serão apagados."
    : "Este horário deixará de aparecer para os pacientes.";
  if (!(await confirmar("Excluir esta consulta?", aviso, "Sim, excluir"))) return;
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

iniciarArea({ tipo: "medico", rotulo: "Médico", telas });
