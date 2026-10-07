const tipoPedido = new URLSearchParams(location.search).get("tipo");
const tipo = PAGINA_DA_AREA[tipoPedido] ? tipoPedido : "paciente";
const NOME_DA_AREA = { paciente: "Paciente", medico: "Médico", administrador: "Administrador" };

document.documentElement.dataset.tema = TEMA_DA_AREA[tipo];
desenharIcones();

function entrar(resposta) {
  sessao.salvar(resposta.token, resposta.user);
  location.href = PAGINA_DA_AREA[resposta.user.tipo];
}

const formLogin = $("#form-login");
if (formLogin) {
  $("#titulo").textContent = `Entrar · ${NOME_DA_AREA[tipo]}`;
  if (tipo === "administrador") {
    $("#area-criar").hidden = true;
    $("#area-esqueci").hidden = true;
    $("#aviso-admin").hidden = false;
  } else {
    $("#criar").href = `cadastro.html?tipo=${tipo}`;
    $("#esqueci").href = `recuperar.html?tipo=${tipo}`;
  }

  aoEnviar(formLogin, async ({ email, senha }) => {
    entrar(await api("/auth/login", { method: "POST", body: { email, senha, tipo } }));
  });

  $("#ouvir").addEventListener("click", () =>
    falar("Digite seu e-mail e sua senha e aperte Entrar. Se ainda não tem conta, aperte Criar conta."));
}

const formCadastro = $("#form-cadastro");
if (formCadastro) {
  if (tipo === "administrador") location.replace("login.html?tipo=administrador");
  $("#voltar").href = `login.html?tipo=${tipo}`;
  $("#titulo").textContent = `Criar conta · ${NOME_DA_AREA[tipo]}`;

  const outro = tipo === "paciente" ? "medico" : "paciente";
  document.querySelectorAll(`.so-${outro}`).forEach((el) => el.remove());
  document.querySelectorAll(`.so-${tipo} input, .so-${tipo} select`).forEach((el) => { el.required = true; });

  if (tipo === "medico") {
    Promise.all([api("/especialidades"), api("/clinicas")]).then(([especialidades, clinicas]) => {
      $("#campo-especialidade").innerHTML = opcoesHTML(especialidades.map(comoOpcaoEspecialidade), "",
        especialidades.length ? "Escolha..." : "Nenhuma especialidade cadastrada");
      $("#campo-clinicas").innerHTML = caixasHTML("clinicas", "Clínicas onde você atende",
        clinicas.map(comoOpcaoClinica), [], "Nenhuma clínica cadastrada.");
      if (!especialidades.length) toast("Peça ao administrador para cadastrar as especialidades antes de criar a conta.", "erro");
    }).catch((falha) => toast(falha.message, "erro"));
  }
  $("#campo-nome").name = tipo === "paciente" ? "nome_paciente" : "nome_medico";
  const nascimento = $("input[name=data_nascimento]");
  if (nascimento) nascimento.max = hojeISO();

  aoEnviar(formCadastro, async (valores) => {
    if (valores.senha !== valores.confirmar_senha) throw new Error("As senhas não são iguais.");
    entrar(await api("/auth/register", { method: "POST", body: { ...valores, tipo } }));
  });

  $("#ouvir").addEventListener("click", () =>
    falar((tipo === "medico" ? "Escolha a sua especialidade e marque as clínicas onde você atende. " : "") + "Preencha seus dados, escolha uma senha com pelo menos seis letras ou números e aperte Criar conta."));
}

const formRecuperar = $("#form-recuperar");
if (formRecuperar) {
  let tipoRecuperar = tipo === "medico" ? "medico" : "paciente";

  function mostrarTipo() {
    document.documentElement.dataset.tema = TEMA_DA_AREA[tipoRecuperar];
    document.querySelectorAll("[data-tipo]").forEach((b) => b.classList.toggle("ativa", b.dataset.tipo === tipoRecuperar));
    for (const t of ["paciente", "medico"]) {
      document.querySelectorAll(`.so-${t}`).forEach((el) => {
        el.hidden = t !== tipoRecuperar;
        el.querySelector("input").required = t === tipoRecuperar;
      });
    }
  }
  document.querySelectorAll("[data-tipo]").forEach((b) => {
    b.addEventListener("click", () => { tipoRecuperar = b.dataset.tipo; mostrarTipo(); });
  });
  formRecuperar.data_nascimento.max = hojeISO();
  mostrarTipo();

  aoEnviar(formRecuperar, async (valores) => {
    if (valores.nova_senha !== valores.confirmar_senha) throw new Error("As senhas não são iguais.");
    const corpo = { tipo: tipoRecuperar, email: valores.email, nova_senha: valores.nova_senha, confirmar_senha: valores.confirmar_senha };
    if (tipoRecuperar === "paciente") corpo.data_nascimento = valores.data_nascimento;
    else corpo.crm = valores.crm;
    await api("/auth/recuperar-senha", { method: "POST", body: corpo });
    toast("Senha alterada! Entre com a nova senha.");
    setTimeout(() => { location.href = `login.html?tipo=${tipoRecuperar}`; }, 1800);
  });

  $("#ouvir").addEventListener("click", () =>
    falar("Escolha Paciente ou Médico. Digite seu e-mail. Se você é paciente, informe sua data de nascimento. Se é médico, informe o seu C R M. Depois escolha uma senha nova e aperte Criar nova senha."));
}
