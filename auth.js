desenharIcones();

function entrar(resposta) {
  sessao.salvar(resposta.token, resposta.user);
  location.href = PAGINA_DA_AREA[resposta.user.tipo];
}

const formLogin = $("#form-login");
if (formLogin) {
  if (sessao.token && sessao.user && PAGINA_DA_AREA[sessao.user.tipo]) {
    location.replace(PAGINA_DA_AREA[sessao.user.tipo]);
  }

  const parametros = new URLSearchParams(location.search);
  const pedido = parametros.get("tipo");
  if (parametros.get("conta") === "criada") toast("Conta criada! Agora entre com seu e-mail e senha.");
  let tipoLogin = PAGINA_DA_AREA[pedido] ? pedido : "paciente";

  function mostrarAba() {
    document.documentElement.dataset.tema = TEMA_DA_AREA[tipoLogin];
    document.querySelectorAll("[data-tipo]").forEach((b) => { b.hidden = b.dataset.tipo === tipoLogin; });
    document.querySelectorAll("[data-so]").forEach((el) => { el.hidden = !el.dataset.so.split(" ").includes(tipoLogin); });
    $("#esqueci").href = `recuperar.html?tipo=${tipoLogin}`;
    const erro = $(".erro-form", formLogin);
    if (erro) erro.hidden = true;
  }
  document.querySelectorAll("[data-tipo]").forEach((b) => {
    b.addEventListener("click", () => { tipoLogin = b.dataset.tipo; mostrarAba(); });
  });
  mostrarAba();

  aoEnviar(formLogin, async ({ email, senha }) => {
    entrar(await api("/auth/login", { method: "POST", body: { email, senha, tipo: tipoLogin } }));
  });

  $("#ouvir").addEventListener("click", () =>
    falar("Digite seu e-mail e sua senha e aperte Entrar. Se ainda não tem conta, aperte Criar conta. Médicos e administradores usam os botões no fim da tela."));
}

const formCadastro = $("#form-cadastro");
if (formCadastro) {
  formCadastro.data_nascimento.max = hojeISO();

  aoEnviar(formCadastro, async (valores) => {
    if (valores.senha !== valores.confirmar_senha) throw new Error("As senhas não são iguais.");
    await api("/auth/register", { method: "POST", body: { ...valores, tipo: "paciente" } });
    location.href = "login.html?tipo=paciente&conta=criada";
  });

  $("#ouvir").addEventListener("click", () =>
    falar("Preencha seus dados, escolha uma senha com pelo menos seis letras ou números e aperte Criar conta. Depois entre com o seu e-mail e a sua senha."));
}

const formRecuperar = $("#form-recuperar");
if (formRecuperar) {
  const tipoRecuperar = new URLSearchParams(location.search).get("tipo") === "medico" ? "medico" : "paciente";

  function mostrarTipo() {
    document.documentElement.dataset.tema = TEMA_DA_AREA[tipoRecuperar];
    $(".voltar").href = `login.html?tipo=${tipoRecuperar}`;
    for (const t of ["paciente", "medico"]) {
      document.querySelectorAll(`.so-${t}`).forEach((el) => {
        el.hidden = t !== tipoRecuperar;
        el.querySelector("input").required = t === tipoRecuperar;
      });
    }
  }
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
    falar(tipoRecuperar === "medico"
      ? "Digite seu e-mail e o seu C R M. Depois escolha uma senha nova e aperte Salvar senha."
      : "Digite seu e-mail e a sua data de nascimento. Depois escolha uma senha nova e aperte Salvar senha."));
}
