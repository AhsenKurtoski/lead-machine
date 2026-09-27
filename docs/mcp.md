# MCP servers — Lead Machine

Questo progetto usa **6 MCP server** configurati in `.vscode/mcp.json`.
Funzionano con VS Code (Cline), Claude Desktop e qualsiasi client MCP.

| # | Server | Pacchetto | A cosa serve |
|---|--------|-----------|--------------|
| 1 | `filesystem` | `@modelcontextprotocol/server-filesystem` | Accesso controllato ai file del repo (solo `lead-machine/`) |
| 2 | `memory` | `@modelcontextprotocol/server-memory` | Memoria persistente: decisioni, contesto, TODO → agente "più intelligente" |
| 3 | `playwright` | `@playwright/mcp` | Browser reale: naviga il sito, testa click/form, fa screenshot desktop+mobile |
| 4 | `fetch` | `@modelcontextprotocol/server-fetch` | Testa API esterne (Overpass/OSM/Geoapify) e le API locali Next.js |
| 5 | `github` | `@modelcontextprotocol/server-github` | Automazione repo `AxsenXzc/lead-machine`: status, commit, PR, issue |
| 6 | `sequential-thinking` | `@modelcontextprotocol/server-sequential-thinking` | Ragionamento step-by-step per debug e refactor complessi |

## Setup

1. Node.js 18.17+ o 20 LTS.
2. Nessuna installazione manuale: i server partono via `npx -y` al primo uso.
3. Solo `github` richiede un token:
   - Crea un PAT su https://github.com/settings/tokens (scope `repo`).
   - Quando VS Code lo chiede, incollalo nel prompt `github_token`
     (oppure esporta `GITHUB_PERSONAL_ACCESS_TOKEN` nell'ambiente).
4. Playwright scarica Chromium (~300 MB) al primo uso:
   `npm run setup:screenshot`.

## Uso tipico

- **Test sito web**: "con playwright, apri http://localhost:3000/dashboard e fai screenshot".
- **Memoria**: "ricorda che la città default è Feltre e il DB è SQLite locale".
- **Fetch**: "verifica che Overpass API risponda per Feltre".
- **GitHub**: "apri una issue per il bug X" / "crea PR per il fix Y".
- **Thinking**: "ragiona step-by-step sul bug di scoring e proponi 3 fix".

## Sicurezza

- `filesystem` è limitato alla cartella del progetto, non a tutto il disco.
- Il token GitHub non è mai committato: sta solo nel prompt/env locale.
- Non committare mai `.env` con chiavi reali.
