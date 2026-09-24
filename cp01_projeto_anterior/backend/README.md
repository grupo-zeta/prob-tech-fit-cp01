# API do Grupo Zeta

API Express definida em [index.js](index.js), com CORS e leitura de variáveis via dotenv.

## Executar

Dentro de `backend/`:

```sh
npm ci
node index.js
```

O servidor usa `PORT` do ambiente, ou `3001` quando não definida. Um `.env` local com `PORT=3001` é opcional e não deve ser versionado.

## Verificação manual

Abra `http://localhost:3001/api/health` enquanto o servidor estiver rodando. Resposta prevista pelo código:

```json
{"status":"ok","message":"Backend do Grupo Zeta rodando!"}
```

Se definir outra porta, ajuste o endereço. Use `Ctrl+C` no terminal para encerrar o servidor.

`npm test` ainda é o placeholder que retorna erro, e não uma suíte de testes. O frontend atual não chama a API.

## CP-02

Os arquivos Python em [cp02_arquiteturas](cp02_arquiteturas/README.md) são um experimento separado. A instalação das dependências Node não instala as dependências desse experimento.
