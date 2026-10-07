# Recordar · Saúde na Palma da Mão

Sistema de agendamento de consultas para pessoas idosas, com três perfis: paciente, médico e administrador.

- **Front-end:** HTML, CSS e JavaScript puros, PWA (instalável), responsivo para computador, tablet e celular.
- **Back-end:** Node.js + Express, API REST em JSON.
- **Banco de dados:** MongoDB, com Mongoose (ODM).
- **Segurança:** login com JWT, senha com bcrypt, autorização por tipo de conta.
- **Documentação da API:** Swagger em `/api-docs`. As rotas também estão em `backend/API.md`.

```
recordar/
├── backend/    API, regras e banco
└── frontend/   telas (roxo = paciente · azul = médico · laranja = administrador)
```

## Rodar no computador

Precisa do Node.js 18 ou mais novo e de um banco MongoDB (o MongoDB Atlas gratuito serve).

1. Abra o terminal na pasta `backend` e rode `npm install`.
2. Copie o arquivo `.env.example` para `.env` e preencha:
   - `MONGO_URI`: o endereço do seu banco
   - `JWT_SECRET`: qualquer texto grande e secreto
   - `ADMIN_EMAIL` e `ADMIN_SENHA`: o login do administrador
3. Rode `npm start` (ou `npm run dev`, que reinicia sozinho a cada alteração).
4. Abra http://localhost:3000

Ao ligar, o servidor cria a conta de administrador com o e-mail e a senha do `.env`, se ela ainda não existir.
A API entrega as telas da pasta `frontend`, então é um servidor só.
A documentação das rotas fica em http://localhost:3000/api-docs.

## Roteiro de demonstração (nesta ordem)

1. **Acesso administrativo:** entre com o e-mail e a senha do `.env`.
   - Especialidades → cadastre duas (ex.: Cardiologia, Ortopedia).
   - Clínicas → cadastre duas, com endereço. Teste a pesquisa e o Editar.
   - Sair da área administrativa.
2. **Sou médico → Criar conta:** escolha a especialidade e marque as clínicas onde atende.
   - Em Início, crie duas ou três consultas (clínica, dia e horário).
   - Perfil → Sair da conta.
3. **Sou paciente → Criar conta.**
   - Marcar consulta → escolha clínica e especialidade → Ver horários → Escolher → anamnese → Concluir.
   - Próximas consultas mostra o agendamento. Sair.
   - Na primeira tela, teste **Recuperar senha**: e-mail + data de nascimento (paciente) ou CRM (médico) e a nova senha.
4. **Médico:** Pacientes → Abrir → veja a anamnese e adicione remédios.
5. **Paciente:** os remédios estão na Agenda do dia e na aba Remédios. Aperte o quadrado ao lado de um remédio para marcar como tomado (a marcação vale para o dia). Em Perfil, edite um dado. Cancele a consulta em Próximas consultas.
6. **Administrador:** Usuários (editar, deletar), Consultas (excluir). Tente excluir uma clínica em uso: o sistema avisa e não deixa.

## Publicar (ambiente acessível)

O projeto sobe como um único serviço Node, com o banco no MongoDB Atlas.

1. No MongoDB Atlas, libere o acesso de qualquer IP (Network Access → `0.0.0.0/0`) e copie o endereço de conexão.
2. Em um serviço de hospedagem Node (por exemplo, Render ou Railway), crie um Web Service a partir do repositório:
   - comando de instalação: `cd backend && npm install`
   - comando de início: `cd backend && npm start`
   - variáveis de ambiente: `MONGO_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_SENHA`
3. O administrador é criado sozinho na primeira vez que o serviço liga.

Para publicar o front separado da API (dois repositórios), suba a pasta `frontend` em uma hospedagem de site estático e coloque o endereço completo da API na primeira linha de `frontend/app.js` (ex.: `https://sua-api.onrender.com/api`).

## Front: onde fica cada coisa

| Arquivo | O que é |
|---|---|
| `index.html` | Quem está usando? |
| `app.js` | Funções usadas por todas as telas: endereço da API, chamada à API, sessão, avisos, confirmação, perfil |
| `auth.js` | Entrar, Criar conta e Recuperar senha |
| `style.css` | Todo o visual; as cores de cada área ficam no topo do arquivo |
| `manifest.json`, `service-worker.js`, `icons/` | PWA (instalar como aplicativo) |
| `html/login.html`, `html/cadastro.html`, `html/recuperar.html` | Telas de entrada (o tipo vem no endereço: `?tipo=medico`) |
| `html/paciente.html` + `js/paciente.js` | Início, Marcar consulta (profissional e horário), Anamnese, Próximas consultas, Remédios, Perfil |
| `html/medico.html` + `js/medico.js` | Minhas consultas, Pacientes, Consulta (anamnese + remédios), Perfil |
| `html/admin.html` + `js/admin.js` | Painel, Usuários, Clínicas, Especialidades, Consultas |
| Logo | Coloque a imagem em `icons/` e uma `<img src="../icons/logo.png">` dentro de `<div class="logo-espaco">` em `html/paciente.html`, `html/medico.html` e `html/admin.html` |

Ao alterar qualquer arquivo do front, aumente a versão `CACHE_NAME` em `service-worker.js`.
