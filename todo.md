# MVM Prospecção - TODO

## Banco de Dados & Schema
- [x] Tabela users (extendida com perfil completo: sobrenome, cargo, whatsapp, foto, role: adm/gerente/bdr)
- [x] Tabela leads (34.600 registros da planilha, 29 colunas)
- [x] Tabela lead_interactions (histórico de interações por BDR)
- [x] Tabela goals (metas por BDR/período)
- [x] Tabela commissions (configuração de comissões)
- [x] Tabela notifications (notificações internas)
- [x] Tabela user_invites (convites por e-mail)
- [x] Tabela kpi_configs (configuração de KPIs pelo ADM/Gerente)
- [x] Tabela contact_attempts (tentativas de contato diárias por BDR)

## Backend - APIs
- [x] Router de autenticação (login, logout, perfil, foto upload)
- [x] Router de usuários (CRUD, convite, bloqueio, exclusão)
- [x] Router de leads (listagem, filtros, busca, atualização, qualificação, desqualificação)
- [x] Router de KPIs e dashboard (ranking, conversão, ticket médio, por estado/modelo)
- [x] Router de metas (definir, acompanhar, alertas)
- [x] Router de comissões (configurar, calcular, visualizar)
- [x] Router de notificações (criar, listar, marcar como lida)
- [x] Script de importação da planilha xlsx

## Frontend - Autenticação
- [x] Página de Login com e-mail e senha (via OAuth Manus)
- [x] Página de Perfil do usuário (nome, sobrenome, cargo, e-mail, WhatsApp, foto, logout)

## Frontend - Layout
- [x] Design system: cores corporativas, tipografia, tokens
- [x] DashboardLayout com sidebar adaptada por role
- [x] Navegação por nível de acesso (ADM / Gerente / BDR)

## Frontend - Dashboard ADM
- [x] Ranking de BDRs por leads qualificados
- [x] Comissões por lead qualificado
- [x] Ticket médio
- [x] Distribuição por estado
- [x] Distribuição por modelo de empilhadeira
- [x] Taxa de conversão (contatos realizados vs qualificados)
- [x] Análise de motivos de desqualificação

## Frontend - Dashboard Gerente
- [x] Mesmas métricas do ADM (somente visualização)
- [x] Alertas de BDRs abaixo de 80 tentativas/dia
- [x] Alertas de BDRs sem 5 leads qualificados/dia

## Frontend - Dashboard BDR
- [x] Ranking dos BDRs (posição do próprio BDR)
- [x] Comissões a receber
- [x] Metas pessoais e progresso

## Frontend - Módulo de Leads
- [x] Listagem Completa (34.611 leads) com filtros e busca
- [x] Alta Prioridade (2.686 leads) com filtros
- [x] Edição de campos em branco pelo BDR
- [x] Qualificação de lead (bloqueio se campos obrigatórios vazios)
- [x] Desqualificação com justificativa obrigatória
- [x] Histórico de interações por lead
- [x] Contador de tentativas de contato
- [x] Visualização de scripts de abordagem

## Frontend - Gestão de Usuários (ADM)
- [x] Listar todos os usuários
- [x] Convidar usuário por e-mail com definição de nível de acesso
- [x] Bloquear/desbloquear usuário
- [x] Excluir usuário
- [x] Editar nível de acesso

## Frontend - Metas e KPIs
- [x] ADM: definir metas e KPIs
- [x] Gerente: definir metas e comissões
- [x] Visualização de progresso em tempo real

## Frontend - Notificações
- [x] Central de notificações na plataforma
- [x] Notificação quando BDR qualifica lead (ADM + Gerente)
- [x] Notificação quando BDR bate meta de 5 leads/dia
- [x] Notificação de parabéns para BDR ao bater meta
- [x] Alerta para BDR se não estiver fazendo 80 tentativas/dia
- [x] Alerta se BDR não está gerando 5 leads qualificados/dia

## Frontend - SAC
- [x] Página de SAC com link direto para WhatsApp do responsável (Rodrigo Barros)

## Frontend - Relatórios
- [x] Gráficos de ranking, desqualificação, por estado, por status
- [x] Exportação de relatórios em PDF
- [x] Exportação de relatórios em Excel

## Importação de Dados
- [x] Script de importação da planilha MVM_EMPILHADEIRAS_v3.xlsx
- [x] Importar 2.686 leads Alta Prioridade
- [x] Importar 34.611 leads Lista Completa

## Testes
- [x] Testes de autenticação e roles (13 testes passando)
- [x] Testes de qualificação de leads
- [x] Testes de notificações

## Controle de Acesso a Leads (nova funcionalidade)
- [x] Backend: campo `isReleasedToTeam` na tabela leads + tabela `lead_release_log`
- [x] Backend: router de liberação em massa com filtros (estado, prioridade, cidade, nome fantasia, segmento)
- [x] Backend: bloquear importação de leads para Gerente e BDR (somente ADM importa)
- [x] Backend: bloquear exportação de leads para Gerente e BDR (somente ADM exporta)
- [x] Backend: query de leads para Gerente/BDR retorna apenas leads liberados pelo ADM
- [x] Frontend: tela "Liberar Leads" no painel ADM com seleção em massa e filtros avançados
- [x] Frontend: remover botões de importar/exportar para Gerente e BDR
- [x] Frontend: Gerente e BDR só visualizam leads liberados pelo ADM

## Sistema de Convites em Cascata e Primeiro Acesso
- [x] Backend: expandir roles para incluir diretor, coordenador, supervisor (mesmo acesso do gerente)
- [x] Backend: router de convite com token único, expiração e validação de quem pode convidar quem
- [x] Backend: ADM pode convidar qualquer role; gerente/diretor/coordenador/supervisor podem convidar BDR
- [x] Backend: router de primeiro acesso (aceitar convite, definir senha, completar perfil)
- [x] Frontend: página de primeiro acesso (/primeiro-acesso?token=xxx) com formulário completo
- [x] Frontend: botão "Primeiro acesso" na tela de login
- [x] Frontend: tela de convites no painel ADM e Gerente com envio por e-mail
- [x] Frontend: e-mail de convite com link de primeiro acesso (link exibido na tela para cópia manual; envio automático requer API de e-mail externa como SendGrid/Resend)

## Melhorias de UX - BDR
- [x] Barra de progresso diário fixo no topo (tentativas e leads qualificados do dia)
- [x] Modo de trabalho sequencial: botão "Iniciar Prospecção" com fluxo guiado
- [x] Botões de ação rápida no card do lead (WhatsApp, LinkedIn, copiar telefone)
- [x] Animação de celebração ao qualificar lead com comissão calculada

## Melhorias de UX - Gerente
- [x] Funil de pipeline visual por etapa (Não iniciado → Em contato → Qualificado)
- [x] Filtro por BDR específico no dashboard e relatórios
- [x] Card de alerta de BDRs em risco no topo do dashboard
- [x] Tabela de leads estagnados (sem interação há mais de X dias)

## Correções e Melhorias Recentes
- [x] Corrigido bug de roteamento: /leads/release e /leads/priority agora vêm antes de /leads/:id no App.tsx
- [x] Adicionado campo "Qtd. Máxima" na tela de Liberar Leads para limitar quantas empresas liberar de uma vez
- [x] Backend: função releaseLeadsToTeam aceita parâmetro `limit` para liberação parcial

## Melhorias de Filtros e Atribuição de Leads
- [x] Corrigir visibilidade de leads liberados para BDRs (todos os roles devem ver leads liberados)
- [x] Filtros multi-seleção: segmento (baseado em CNAE/atividade principal), estado (UF) e cidade
- [x] Backend: buscar segmentos/CNAEs distintos do banco para popular o filtro
- [x] Implementar atribuição de leads em massa a BDRs específicos (ADM/Gerente direciona lote para BDR)
- [x] Backend: campo assignedTo na tabela leads + router de atribuição em massa
- [x] Frontend: tela de atribuição com filtros + seleção de BDR destino

## Correções de Layout Mobile
- [x] Corrigir menu lateral: remover "Atribuir a BDRs" duplicado, reorganizar grupos (Gestão/Administração), mover Configurações para Administração

## Melhorias de UX Mobile
- [x] Toggle de tema escuro/claro no perfil e header mobile
- [x] Web Push Notifications para BDRs (alerta ao receber leads atribuídos)
- [x] Barra de ações rápidas fixada no rodapé mobile (Prospectar, Qualificar, Ranking)

## Melhorias Mobile para Gestores
- [x] Barra mobile adaptada por cargo: gestores veem Dashboard/Liberar/Atribuir/Ranking/Notificações; BDR vê Prospectar/Qualificar/Ranking
- [x] Cards de resumo executivo no Dashboard mobile (KPIs compactos: leads liberados hoje, BDRs ativos, taxa de conversão, top BDR)
- [x] Fluxo rápido de liberação de leads pelo mobile (3 passos: filtro → quantidade → confirmar)

## Funcionalidades Adicionais
- [x] Relatório exportável em PDF (performance por BDR, leads qualificados por estado, comissões do período)
- [x] Botão WhatsApp no card/detalhe do lead (mensagem pré-preenchida com nome da empresa e decisor)
- [x] Notificação push ao gestor quando BDR qualifica um lead

## Agendamento de Follow-up
- [x] Tabela follow_ups no banco (leadId, userId, scheduledAt, note, isDone, notifiedAt)
- [x] Funções de DB: createFollowUp, getFollowUpsByUser, getPendingFollowUps, markFollowUpDone
- [x] Routers tRPC: followUp.create, followUp.listByLead, followUp.listMine, followUp.done, followUp.cancel
- [x] UI no detalhe do lead: card de follow-ups com botão "Agendar" e dialog com date/time picker e nota
- [x] Painel de follow-ups pendentes acessível pelo menu lateral (/follow-ups)
- [x] Job no servidor que verifica follow-ups a cada minuto e envia push notification ao BDR

## Contador de Tentativas de Contato
- [x] Campo attemptCount na tabela leads (incrementado ao registrar interação tipo "tentativa")
- [x] Backend: atualizar addInteraction para incrementar attemptCount quando type === "tentativa"
- [x] Frontend: exibir badge de tentativas nos cards da lista de leads
- [x] Frontend: exibir contador no detalhe do lead (header ou seção de qualificação)

## Correções de Layout Mobile (2)
- [x] Corrigir sobreposição dos labels de grupo ("LEADS", "ADMINISTRAÇÃO", "SUPORTE") sobre os itens do menu lateral no mobile

## LinkedIn e Segmento por CNAE
- [x] Verificar e exibir links do LinkedIn (Gerente, Diretor, CEO) no detalhe do lead
- [x] Buscar atividade principal via API de CNPJ (BrasilAPI + ReceitaWS fallback) — script rodando em background
- [x] Adicionar filtro por segmento/atividade na Lista Completa
- [x] Adicionar filtro por segmento/atividade na Alta Prioridade

## Correções Tela Atribuir Leads
- [x] Bug: filtro de atribuição não mostra leads liberados disponíveis (corrigido: query passa onlyReleased:true)
- [x] Bug: filtro de UF na tela Atribuir não lista todos os estados (corrigido: todos os 27 estados sempre visíveis)
- [x] Feature: botão "Desatribuir" lead do BDR no detalhe do lead (visível para ADM/Gerente)
- [x] Feature: botão "Desfazer liberação" no histórico de liberação (aba Histórico)

## Melhorias Pós-Atribuição
- [x] Exibir nome do BDR atribuído no detalhe do lead (em vez de ID)
- [x] Filtro "Apenas não atribuídos" na tela de Atribuir Leads
- [x] Notificação push ao BDR quando lead é desatribuído pelo gestor

## Histórico de Atribuições e Carga por BDR
- [x] Tabela lead_assignment_log no banco (leadId, action: assigned/unassigned, byUserId, toUserId, createdAt)
- [x] Backend: registrar log ao atribuir (assignBulk) e ao desatribuir (unassignLead)
- [x] Backend: endpoint leads.assignmentHistory para buscar o log de um lead
- [x] Backend: endpoint leads.bdrWorkload para contar leads atribuídos por BDR
- [x] Frontend: aba/seção "Histórico de Atribuições" no detalhe do lead (visível para ADM/Gerente)
- [x] Frontend: contador de leads atribuídos ao lado de cada BDR na tela de Atribuir (badge colorido por carga)

## Bug: Duplicação de Usuários no Convite
- [x] Bug: ao aceitar convite como gerente/coordenador/supervisor, cria dois registros (corrigido: upsertUser verifica email existente antes de inserir)
- [x] Bug: perfil exibe "BDR" em vez do cargo real (corrigido: openId OAuth atualiza registro do convite preservando o role)
- [x] Limpar duplicatas existentes no banco de dados (1 duplicata removida, openId corrigido)

## Filtro de Cidade Multi-seleção e Importação de Planilhas
- [x] Backend: endpoint leads.citiesByUF para retornar cidades disponíveis por estado(s) selecionado(s)
- [x] Backend: endpoint leads.importSpreadsheet para importar planilha XLSX e adicionar novos leads (upsert por CNPJ)
- [x] Frontend: filtro de cidade multi-seleção dinâmico na Lista Completa (baseado nos estados selecionados)
- [x] Frontend: filtro de cidade multi-seleção dinâmico na Alta Prioridade
- [x] Frontend: página de Importação de Planilhas com upload, preview e resultado
- [x] Frontend: adicionar link "Importar Planilha" no menu lateral (apenas para ADM)

## Checagem de Duplicidade na Importação de Planilhas
- [x] Backend: ao importar planilha, verificar CNPJs já existentes no banco antes de inserir
- [x] Backend: retornar relatório detalhado com total inseridos, total ignorados (duplicados) e lista de CNPJs duplicados
- [x] Frontend: exibir relatório pós-importação com cards de resumo (novos, duplicados, erros) e lista dos CNPJs ignorados
- [x] Frontend: mostrar progresso durante o upload/processamento

## Compartilhamento WhatsApp após Qualificação
- [x] Criar componente WhatsAppShareModal com mensagem pré-formatada do lead qualificado
- [x] Integrar modal no fluxo de qualificação (após confirmação de sucesso)
- [x] Mensagem deve incluir: nome da empresa, CNPJ, cidade/UF, WhatsApp, decisor, segmento e link do Google Maps
- [x] Botão de compartilhar abre WhatsApp Web/App com mensagem pronta para enviar ao consultor
- [x] Opção de copiar mensagem para área de transferência

## Melhorias de Qualificação e Notificações (Sprint 3)
- [x] Ponto 1: tornar email e WhatsApp obrigatórios na validação de edição do lead (frontend + backend)
- [x] Ponto 2: incluir todos os campos do lead (obrigatórios + opcionais) e histórico de interações na mensagem WhatsApp de compartilhamento
- [x] Ponto 2: buscar histórico de interações no servidor antes de montar a mensagem WhatsApp
- [x] Ponto 3: salvar leadId na notificação de lead qualificado para permitir navegação
- [x] Ponto 3: ao clicar no card de notificação de lead qualificado, navegar para /leads/:id

## Unificação de Meta: Tentativas + Contatos Realizados
- [x] Backend: bdrStats retorna todayContacts (contatos realizados do dia, tipo "contato" nas interações)
- [x] Frontend: BdrProgressBar exibe barra única com segmento laranja (tentativas) + segmento verde (contatos realizados)
- [x] Frontend: WorkMode exibe barra unificada com legenda "X contatos realizados de Y tentativas"
- [x] Frontend: Dashboard BDR exibe o mesmo padrão unificado

## Barra de Progresso Global (Todos os Usuários)
- [x] Backend: endpoint dashboard.teamStats com totais agregados de todos os BDRs (tentativas+contatos, qualificados, metas) com filtros por BDR, estado, período (dia/semana/mês/ano)
- [x] Backend: endpoint dashboard.teamStatsByBdr retorna detalhes individuais por BDR para expansão
- [x] Frontend: BdrProgressBar reformulada — exibe totais de TODOS os BDRs (meta = soma das metas individuais), visível para todos os roles
- [x] Frontend: barra de tentativas unificada (azul=tentativas, verde=contatos realizados) com meta total
- [x] Frontend: ao clicar na barra, expande painel com resultados individuais por BDR + filtros (BDR, estado, dia/semana/mês/ano)
- [x] Frontend: gestores (ADM/gerente/coordenador/supervisor/diretor) podem clicar em cada tentativa/contato/lead qualificado individual e abrir a prospecção correspondente

## Registro Automático de Compartilhamento WhatsApp
- [x] Backend: endpoint leads.registerWhatsAppShare registra interação tipo "whatsapp_share" no histórico do lead
- [x] Frontend: ao clicar em "Abrir WhatsApp" no modal, chamar endpoint e registrar interação antes de abrir o link
- [x] Frontend: exibir badge "Compartilhado via WhatsApp" no histórico de interações do lead

## Correção de Metas Individuais vs. Globais
- [x] Corrigir: meta individual do BDR exibida sem multiplicar pelo número de BDRs (80 contatos = 80, não 160)
- [x] Corrigir: barra global no topo mostra soma real das metas de todos os BDRs (ex: 2 BDRs × 80 = 160)
- [x] Gestores (ADM/gerente/diretor/coordenador/supervisor) não têm metas próprias, apenas visualizam e configuram

## Correção Taxa de Conversão
- [x] Dashboard: taxa de conversão = leads qualificados ÷ total de leads contatados (não contatos vs qualificados)
- [x] Atualizar label e tooltip do card de Taxa de Conversão no Dashboard

## Duas Taxas de Conversão no Dashboard
- [x] Dashboard: card "Taxa Tentativas → Contatos" = contatos realizados ÷ total de tentativas (tentativas simples + contatos realizados)
- [x] Dashboard: card "Taxa Contatos → Qualificados" = leads qualificados ÷ contatos realizados
- [x] Backend: dashboardStats retorna totalAttempts, totalContacts e totalQualified para cálculo das taxas

## Seletor de Período e Cards Clicáveis no Dashboard
- [x] Backend: dashboard.stats aceita parâmetro period (today/week/month/all) e filtra tentativas, contatos e qualificados pelo período
- [x] Frontend: seletor de período (Hoje / Semana / Mês / Total) no topo dos KPIs do AdminDashboard
- [x] Frontend: cards KPI clicáveis — ao clicar em "Leads Qualificados" abre modal com lista completa dos leads qualificados no período
- [x] Frontend: ao clicar em "Tentativas" abre modal com lista de tentativas/contatos do período por BDR
- [x] Frontend: ao clicar em "Taxa Tent.→Contato" e "Taxa Contato→Qualif." abre modal com breakdown por BDR
- [x] Frontend: ao clicar em "Desqualificados" abre modal com lista de leads desqualificados e motivos
- [x] Frontend: ao clicar em "Total de Leads" abre modal com distribuição por UF e segmento

## Correção Urgente: Meta Global Duplicada
- [x] Corrigir getTeamStats: com 1 BDR, meta deve ser 80 tentativas e 5 qualificados (não 160/10)
- [x] Investigar por que totalBdrCount está retornando 2 com apenas 1 BDR cadastrado

## Paridade Mobile Completa com Desktop
- [x] Dashboard mobile (ADM/Gerente): seletor de período (Hoje/Semana/Mês/Total) visível no mobile
- [x] Dashboard mobile (ADM/Gerente): 6 cards KPI clicáveis com modais de detalhes no mobile (Total de Leads, Qualificados, Desqualificados, Tentativas, Taxa Tent.→Contato, Taxa Contato→Qualif.)
- [x] Dashboard mobile: corrigir "Taxa de Conversão" no resumo executivo para exibir tentativas+contatos VS qualificados (não qualified/totalLeads)
- [x] Dashboard mobile (ADM/Gerente): exibir BDRs em Risco e Leads Estagnados no mobile
- [x] Dashboard mobile (ADM/Gerente): exibir gráficos de Ranking, Status, por Estado e Motivos de Desqualificação no mobile
- [x] Dashboard BDR mobile: exibir contatos realizados separados das tentativas (taxa de conversão BDR)
- [x] TeamProgressBar: garantir que é totalmente funcional no mobile (expansão, filtros, clique nos itens)
- [x] Reports.tsx: corrigir taxa de conversão para usar tentativas+contatos VS qualificados (consistência com dashboard)

## Configuração de Campos de Qualificação (Painel de Controle)
- [x] Criar tabela `qualification_fields` no schema Drizzle (id, label, type, required, order, options, active)
- [x] Criar procedures tRPC: getQualificationFields, upsertQualificationField, deleteQualificationField, reorderQualificationFields
- [x] Criar página QualificationFieldsConfig.tsx com lista de campos, edição inline, exclusão e adição de novos campos
- [x] Suporte a tipos de campo: texto, número, seleção (select), múltipla escolha (multiselect), booleano (sim/não)
- [x] Integrar campos dinâmicos no formulário de qualificação do WorkMode (modal de qualificação)
- [x] Integrar campos dinâmicos na edição de lead (LeadDetail.tsx)
- [x] Adicionar aba "Campos de Qualificação" no painel de controle (ControlPanel.tsx ou similar)
- [x] Restringir acesso à configuração apenas para ADM/Admin
- [x] Escrever testes vitest para os novos procedures

## Bug: Importação de Planilhas de Leads
- [ ] Investigar e corrigir erro ao importar novas planilhas com leads

## Bug: Importação de Planilhas de Leads (17MB / 70k linhas)
- [x] Corrigir timeout na importação de planilhas grandes (17MB, 70k linhas) — usar ExcelJS streaming em vez de xlsx.read() em memória
- [x] Corrigir mapeamento de colunas: "WhatsApp 1", "LinkedIn Gerente/Diretor/CEO", "Script - Abertura/Parceria/Técnico", "Logradouro"+"Número"+"Complemento"+"Bairro" → enderecoCompleto
- [x] Aumentar timeout do Express para rotas de importação (padrão 2min → 10min)
- [x] Adicionar colunas "Capital Social", "Matriz/Filial", "Sócios", "CNAE" ao schema e importação

## Rebranding para LS Tractor Gallotti
- [x] Upload da logo LS Tractor Gallotti como asset estático (/manus-storage/logolsgallotti_27805a32.jpg)
- [x] Atualizar cores do tema (azul escuro #1a3a5c + vermelho #e8621a da logo)
- [x] Substituir todos os textos "MVM Empilhadeiras" por "LS Tractor Gallotti"
- [x] Substituir "empilhadeira(s)" por "trator(es)" em toda a interface
- [x] Atualizar título da aplicação (index.html + Login.tsx + DashboardLayout.tsx)
- [x] Atualizar logo no header/sidebar
- [x] Adaptar scripts de abordagem para contexto agro/tratores
- [x] Importar 7.989 leads da planilha planilha_LS_TRACTOR_ATUALIZADA.xlsx (0 duplicatas, 0 erros)
- [x] Mapear colunas da nova planilha para o schema do banco

## Rebranding para LN Máquinas
- [ ] Upload das logos LN Máquinas e Michigan como assets estáticos
- [ ] Atualizar tema de cores: preto (#111111) + amarelo Michigan (#F5A623) + branco
- [ ] Substituir todos os textos "LS Tractor Gallotti" por "LN Máquinas"
- [ ] Substituir "trator(es)" por "máquina(s)" em toda a interface
- [ ] Atualizar logo no sidebar, header mobile e tela de login
- [ ] Atualizar título da aplicação (index.html, Login.tsx, DashboardLayout.tsx)
- [ ] Adaptar scripts de abordagem para contexto de máquinas pesadas (LN Máquinas / Michigan)
- [ ] Atualizar relatórios PDF/Excel com novo nome e cores
- [ ] Atualizar página SAC com informações da LN Máquinas
