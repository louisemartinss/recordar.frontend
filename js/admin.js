let abaUsuarios = "paciente";
let usuariosNaTela = [];
let clinicasNaTela = [];
let especialidadesNaTela = [];
let idClinicaEditando = null;
let idEspecialidadeEditando = null;

function abrirFormulario(titulo, camposHTML, aoSalvar) {
  const d = document.createElement("dialog");
  d.className = "largo";
  d.innerHTML = `
    <h2>${esc(titulo)}</h2>
    <form>
      ${camposHTML}
      <p class="erro-form" hidden></p>
      <div class="acoes">
        <button type="button" class="btn suave" data-fechar>Cancelar</button>
        <button type="submit" class="btn">${icone("ok")} Salvar</button>
      </div>
    </form>`;
  document.body.appendChild(d);
  d.querySelector("[data-fechar]").addEventListener("click", () => d.close());
  d.addEventListener("close", () => d.remove());
  aoEnviar(d.querySelector("form"), async (valores) => {
    await aoSalvar(valores);
    d.close();
  });
  d.showModal();
}

function sairDaEdicaoClinica() {
  idClinicaEditando = null;
  $("#form-clinica").reset();
  $("#titulo-clinica").textContent = "Cadastrar clínica";
  $("#botao-clinica").textContent = "Cadastrar";
  $("#cancelar-clinica").hidden = true;
}
function sairDaEdicaoEspecialidade() {
  idEspecialidadeEditando = null;
  $("#form-especialidade").reset();
  $("#titulo-especialidade").textContent = "Cadastrar especialidade";
  $("#botao-especialidade").textContent = "Cadastrar";
  $("#cancelar-especialidade").hidden = true;
}

const telas = {
  inicio: {
    titulo: "Administração",
    instrucoes: "Aperte Usuários para ver pacientes e médicos. Em Clínicas e Especialidades você faz os cadastros que os médicos usam. Em Consultas estão todas as consultas do sistema.",
    async carregar() {
      const [usuarios, clinicas, especialidades, consultas] = await Promise.all([
        api("/users"), api("/clinicas"), api("/especialidades"), api("/consultas")
      ]);
      $("#total-usuarios").textContent = usuarios.length;
      $("#total-clinicas").textContent = clinicas.length;
      $("#total-especialidades").textContent = especialidades.length;
      $("#total-consultas").textContent = consultas.length;
    }
  },

  usuarios: {
    titulo: "Usuários",
    instrucoes: "Escolha Pacientes ou Médicos. Aperte Editar para mudar o cadastro ou as clínicas do médico. Para apagar uma conta, aperte Deletar.",
    voltar: "inicio",
    async carregar() {
      document.querySelectorAll("[data-aba]").forEach((b) => b.classList.toggle("ativa", b.dataset.aba === abaUsuarios));
      const busca = encodeURIComponent($("#busca-usuario").value.trim());
      const usuarios = await api(`/users?tipo=${abaUsuarios}&busca=${busca}`);
      usuariosNaTela = usuarios;

      preencherLista($("#lista-usuarios"), usuarios, "Nenhum usuário encontrado.", (u) => {
        const nome = u.nome_paciente || u.nome_medico;
        const detalhes = u.tipo === "paciente"
          ? `<p>${icone("calendario")} Data de nascimento: <b>${dataBR(u.data_nascimento)}</b></p>`
          : `<p>CRM: <b>${esc(u.crm)}</b></p>
             <p>${icone("especialidade")} Especialidade: <b>${esc(u.nome_especialidade) || "Não informada"}</b></p>
             <p>${icone("clinica")} Clínicas: <b>${esc(u.clinicas.map((c) => c.nome_clinica).join(", ")) || "Nenhuma"}</b></p>`;
        return `
          <article class="cartao item">
            <h3>${esc(nome)}</h3>
            ${detalhes}
            <p>${icone("telefone")} Telefone: <b>${esc(u.telefone) || "Não informado"}</b></p>
            <p>${icone("email")} E-mail: <b>${esc(u.email)}</b></p>
            <p>Senha: <b>•••••••• (criptografada)</b></p>
            <div class="acoes">
              <button class="btn suave pequeno" data-editar="${u.id}">${icone("editar")} Editar</button>
              <button class="btn perigo pequeno" data-deletar="${u.id}" data-nome="${esc(nome)}" data-tipo="${u.tipo}">${icone("lixeira")} Deletar</button>
            </div>
          </article>`;
      });
    }
  },

  clinicas: {
    titulo: "Clínicas",
    instrucoes: "Preencha o nome, o telefone e o endereço e aperte Cadastrar. Embaixo ficam as clínicas cadastradas. Use a pesquisa para achar uma clínica pelo nome ou pelo endereço.",
    voltar: "inicio",
    async carregar() {
      const busca = encodeURIComponent($("#busca-clinica").value.trim());
      clinicasNaTela = await api(`/clinicas?busca=${busca}`);
      preencherLista($("#lista-clinicas"), clinicasNaTela, "Nenhuma clínica encontrada.", (c) => `
        <article class="cartao item">
          <h3>${esc(c.nome_clinica)}</h3>
          <p>${icone("clinica")} Endereço: <b>${esc(c.endereco_clinica) || "Não informado"}</b></p>
          <p>${icone("telefone")} Telefone: <b>${esc(c.telefone_clinica) || "Não informado"}</b></p>
          <div class="acoes">
            <button class="btn suave pequeno" data-editar="${c.id}">${icone("editar")} Editar</button>
            <button class="btn perigo pequeno" data-excluir="${c.id}" data-nome="${esc(c.nome_clinica)}">${icone("lixeira")} Excluir</button>
          </div>
        </article>`);
    }
  },

  especialidades: {
    titulo: "Especialidades",
    instrucoes: "Digite o nome da especialidade e aperte Cadastrar. Os médicos escolhem uma delas ao criar a conta.",
    voltar: "inicio",
    async carregar() {
      especialidadesNaTela = await api("/especialidades");
      preencherLista($("#lista-especialidades"), especialidadesNaTela, "Nenhuma especialidade cadastrada.", (e) => `
        <article class="cartao item">
          <h3>${esc(e.nome_especialidade)}</h3>
          <div class="acoes">
            <button class="btn suave pequeno" data-editar="${e.id}">${icone("editar")} Editar</button>
            <button class="btn perigo pequeno" data-excluir="${e.id}" data-nome="${esc(e.nome_especialidade)}">${icone("lixeira")} Excluir</button>
          </div>
        </article>`);
    }
  },

  consultas: {
    titulo: "Consultas",
    instrucoes: "Aqui estão todas as consultas, com o médico, a clínica, o paciente, o dia e o horário.",
    voltar: "inicio",
    async carregar() {
      const consultas = await api("/consultas");
      preencherLista($("#lista-consultas"), consultas, "Nenhuma consulta no sistema.", (c) => `
        <article class="cartao item">
          <span class="selo ${c.status === "disponivel" ? "livre" : ""}">${c.status === "agendada" ? "Agendada" : "Disponível"}</span>
          <p>${icone("medico")} Médico: <b>${esc(c.nome_medico)}</b></p>
          <p>${icone("especialidade")} Especialidade: <b>${esc(c.nome_especialidade)}</b></p>
          <p>${icone("clinica")} Clínica: <b>${esc(c.nome_clinica)}</b></p>
          <p>${icone("user")} Paciente: <b>${c.nome_paciente ? esc(c.nome_paciente) : "Ainda sem paciente"}</b></p>
          <p>${icone("calendario")} Data: <b>${dataBR(c.data_consulta)}</b></p>
          <p>${icone("relogio")} Horário: <b>${esc(c.horario_consulta)}</b></p>
          <div class="acoes">
            <button class="btn perigo pequeno" data-excluir="${c.id}">${icone("lixeira")} Excluir</button>
          </div>
        </article>`);
    }
  }
};

$("#sair").addEventListener("click", sair);

document.querySelectorAll("[data-aba]").forEach((botao) => {
  botao.addEventListener("click", () => {
    abaUsuarios = botao.dataset.aba;
    recarregarTela();
  });
});

let relogioBusca;
for (const campo of ["#busca-usuario", "#busca-clinica"]) {
  $(campo).addEventListener("input", () => {
    clearTimeout(relogioBusca);
    relogioBusca = setTimeout(recarregarTela, 300);
  });
}

async function editarUsuario(u) {
  let campos;
  if (u.tipo === "medico") {
    const [especialidades, clinicas] = await Promise.all([api("/especialidades"), api("/clinicas")]);
    campos = `
      <label class="campo"><span>Nome completo</span><input name="nome_medico" value="${esc(u.nome_medico)}" required></label>
      <div class="grade-2">
        <label class="campo"><span>CRM</span><input name="crm" value="${esc(u.crm)}" required></label>
        <label class="campo"><span>Telefone</span><input name="telefone" type="tel" value="${esc(u.telefone)}"></label>
      </div>
      <label class="campo"><span>Especialidade</span>
        <select name="id_especialidade" required>${opcoesHTML(especialidades.map(comoOpcaoEspecialidade), u.id_especialidade)}</select></label>
      ${caixasHTML("clinicas", "Clínicas onde atende", clinicas.map(comoOpcaoClinica), u.clinicas.map((c) => c.id), "Nenhuma clínica cadastrada.")}`;
  } else {
    campos = `
      <label class="campo"><span>Nome completo</span><input name="nome_paciente" value="${esc(u.nome_paciente)}" required></label>
      <div class="grade-2">
        <label class="campo"><span>Data de nascimento</span><input name="data_nascimento" type="date" value="${esc(u.data_nascimento)}" max="${hojeISO()}" required></label>
        <label class="campo"><span>Telefone</span><input name="telefone" type="tel" value="${esc(u.telefone)}"></label>
      </div>`;
  }
  abrirFormulario(`Editar ${u.nome_medico || u.nome_paciente}`, campos, async (valores) => {
    await api(`/users/${u.id}`, { method: "PUT", body: valores });
    toast("Cadastro atualizado!");
    recarregarTela();
  });
}

$("#lista-usuarios").addEventListener("click", async (e) => {
  const editar = e.target.closest("[data-editar]")?.dataset.editar;
  if (editar) {
    const u = usuariosNaTela.find((x) => x.id === editar);
    if (u) editarUsuario(u).catch((falha) => toast(falha.message, "erro"));
    return;
  }
  const botao = e.target.closest("[data-deletar]");
  if (!botao) return;
  const aviso = botao.dataset.tipo === "medico"
    ? "As consultas deste médico e os remédios que ele receitou também serão apagados."
    : "Os remédios deste paciente serão apagados e as consultas que ele marcou voltam a ficar disponíveis.";
  if (!(await confirmar(`Deletar ${botao.dataset.nome}?`, aviso, "Sim, deletar"))) return;
  try {
    await api(`/users/${botao.dataset.deletar}`, { method: "DELETE" });
    toast("Usuário deletado.");
    recarregarTela();
  } catch (falha) { toast(falha.message, "erro"); }
});

$("#lista-consultas").addEventListener("click", async (e) => {
  const id = e.target.closest("[data-excluir]")?.dataset.excluir;
  if (!id) return;
  if (!(await confirmar("Excluir esta consulta?", "A consulta e os remédios receitados nela serão apagados.", "Sim, excluir"))) return;
  try {
    await api(`/consultas/${id}`, { method: "DELETE" });
    toast("Consulta excluída.");
    recarregarTela();
  } catch (falha) { toast(falha.message, "erro"); }
});

aoEnviar($("#form-clinica"), async (valores) => {
  if (idClinicaEditando) {
    await api(`/clinicas/${idClinicaEditando}`, { method: "PUT", body: valores });
    toast("Clínica atualizada!");
  } else {
    await api("/clinicas", { method: "POST", body: valores });
    toast("Clínica cadastrada!");
  }
  sairDaEdicaoClinica();
  recarregarTela();
});
$("#cancelar-clinica").addEventListener("click", sairDaEdicaoClinica);

$("#lista-clinicas").addEventListener("click", async (e) => {
  const editar = e.target.closest("[data-editar]")?.dataset.editar;
  const botaoExcluir = e.target.closest("[data-excluir]");

  if (editar) {
    const c = clinicasNaTela.find((x) => x.id === editar);
    if (!c) return;
    const form = $("#form-clinica");
    idClinicaEditando = editar;
    form.nome_clinica.value = c.nome_clinica;
    form.telefone_clinica.value = c.telefone_clinica;
    form.endereco_clinica.value = c.endereco_clinica;
    $("#titulo-clinica").textContent = "Editar clínica";
    $("#botao-clinica").textContent = "Salvar";
    $("#cancelar-clinica").hidden = false;
    window.scrollTo(0, 0);
    form.nome_clinica.focus();
  }

  if (botaoExcluir) {
    if (!(await confirmar(`Excluir ${botaoExcluir.dataset.nome}?`, "Só é possível excluir uma clínica sem médicos associados e sem consultas.", "Sim, excluir"))) return;
    try {
      await api(`/clinicas/${botaoExcluir.dataset.excluir}`, { method: "DELETE" });
      toast("Clínica excluída.");
      if (idClinicaEditando === botaoExcluir.dataset.excluir) sairDaEdicaoClinica();
      recarregarTela();
    } catch (falha) { toast(falha.message, "erro"); }
  }
});

aoEnviar($("#form-especialidade"), async (valores) => {
  if (idEspecialidadeEditando) {
    await api(`/especialidades/${idEspecialidadeEditando}`, { method: "PUT", body: valores });
    toast("Especialidade atualizada!");
  } else {
    await api("/especialidades", { method: "POST", body: valores });
    toast("Especialidade cadastrada!");
  }
  sairDaEdicaoEspecialidade();
  recarregarTela();
});
$("#cancelar-especialidade").addEventListener("click", sairDaEdicaoEspecialidade);

$("#lista-especialidades").addEventListener("click", async (e) => {
  const editar = e.target.closest("[data-editar]")?.dataset.editar;
  const botaoExcluir = e.target.closest("[data-excluir]");

  if (editar) {
    const esp = especialidadesNaTela.find((x) => x.id === editar);
    if (!esp) return;
    idEspecialidadeEditando = editar;
    $("#form-especialidade").nome_especialidade.value = esp.nome_especialidade;
    $("#titulo-especialidade").textContent = "Editar especialidade";
    $("#botao-especialidade").textContent = "Salvar";
    $("#cancelar-especialidade").hidden = false;
    $("#form-especialidade").nome_especialidade.focus();
  }

  if (botaoExcluir) {
    if (!(await confirmar(`Excluir ${botaoExcluir.dataset.nome}?`, "Só é possível excluir uma especialidade que nenhum médico usa.", "Sim, excluir"))) return;
    try {
      await api(`/especialidades/${botaoExcluir.dataset.excluir}`, { method: "DELETE" });
      toast("Especialidade excluída.");
      if (idEspecialidadeEditando === botaoExcluir.dataset.excluir) sairDaEdicaoEspecialidade();
      recarregarTela();
    } catch (falha) { toast(falha.message, "erro"); }
  }
});

iniciarArea({ tipo: "administrador", rotulo: "Administrador", telas });
