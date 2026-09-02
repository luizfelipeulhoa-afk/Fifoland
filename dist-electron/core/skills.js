"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUILTIN_SKILLS = void 0;
exports.BUILTIN_SKILLS = [
    {
        id: "task-capture",
        name: "Captura de tarefas",
        description: "Transforma uma intenção falada em rascunho revisável.",
        risk: "draft",
        permissions: [{ id: "tasks", label: "Tarefas locais", access: "draft" }],
        enabled: true,
        estimatedCost: "free",
        requiresConfirmation: true
    },
    {
        id: "next-step",
        name: "Planejador de próximo passo",
        description: "Quebra objetivos em uma ação pequena e executável.",
        risk: "local",
        permissions: [{ id: "memories", label: "Metas confirmadas", access: "read" }],
        enabled: true,
        estimatedCost: "low",
        requiresConfirmation: false
    },
    {
        id: "life-interviewer",
        name: "Entrevistador contínuo",
        description: "Faz uma pergunta por vez e propõe memórias candidatas.",
        risk: "draft",
        permissions: [{ id: "memories", label: "Memórias locais", access: "draft" }],
        enabled: true,
        estimatedCost: "low",
        requiresConfirmation: true
    },
    {
        id: "memory-archivist",
        name: "Arquivista de memória",
        description: "Organiza fontes, confiança e contradições sem promover inferências.",
        risk: "draft",
        permissions: [{ id: "memories", label: "Memórias locais", access: "draft" }],
        enabled: true,
        estimatedCost: "free",
        requiresConfirmation: true
    },
    {
        id: "decision-challenger",
        name: "Desafiador de decisões",
        description: "Testa premissas e aponta autoengano com respeito.",
        risk: "local",
        permissions: [{ id: "memories", label: "Contexto confirmado", access: "read" }],
        enabled: true,
        estimatedCost: "low",
        requiresConfirmation: false
    },
    {
        id: "weekly-review",
        name: "Diário e revisão",
        description: "Compara intenção, ação e aprendizado sem culpa.",
        risk: "local",
        permissions: [
            { id: "tasks", label: "Histórico de tarefas", access: "read" },
            { id: "memories", label: "Diário local", access: "read" }
        ],
        enabled: true,
        estimatedCost: "low",
        requiresConfirmation: false
    },
    {
        id: "personal-rhythm",
        name: "Ritmo pessoal e celebrações",
        description: "Aprende como organizar tempo, reconhecer progresso e respeitar os limites de cobrança de cada pessoa.",
        risk: "draft",
        permissions: [
            { id: "calendar", label: "Agenda local", access: "draft" },
            { id: "memories", label: "Preferências confirmadas", access: "read" }
        ],
        enabled: true,
        estimatedCost: "low",
        requiresConfirmation: true
    },
    {
        id: "cheer-planner",
        name: "Planejador de aulas de cheer",
        description: "Estrutura aulas para crianças e universitários.",
        risk: "draft",
        permissions: [{ id: "tasks", label: "Planos como rascunho", access: "draft" }],
        enabled: true,
        estimatedCost: "low",
        requiresConfirmation: true
    },
    {
        id: "sourced-research",
        name: "Pesquisador com fontes",
        description: "Separa evidência atual de opinião e memória pessoal.",
        risk: "local",
        permissions: [{ id: "internet", label: "Pesquisa pública", access: "read" }],
        enabled: false,
        estimatedCost: "variable",
        requiresConfirmation: false
    }
];
