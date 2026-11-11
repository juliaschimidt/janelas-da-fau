# janelas da FAU

Site único com 4 páginas:

- `/` → tela de desenho (link do QR code). Funciona no notebook e no celular deitado; com o celular em pé pede "gire o celular".
- `/parede` → projeção (abrir em tela cheia, F11, no computador do projetor). Busca o desenho atual a cada 2 s.
- `/cartaz` → cartaz A4 com o QR code já apontando pro endereço publicado.
- `/moderar` → página interna da equipe, com senha: ver denúncias, remover desenho, baixar todos.

Rodar: `python server.py` (só biblioteca padrão do Python). No Render: Build `pip install -r requirements.txt`, Start `python server.py`, e a variável de ambiente `MODERACAO_SENHA` com a senha da moderação (sem ela, a moderação fica desligada).

- `static/config.js`: temperatura → 3 cores, níveis de vento, espessuras.
- Clima: IAG (página "Condições Atuais") → Open-Meteo → preto e branco.
- Umidade = transparência (80% de umidade → traço 80% transparente).
- Cada desenho fica 20 min (`SLOT_SECONDS` em `server.py`); os seguintes entram numa fila. Remover um desenho puxa a fila pra frente.
- Desenhos em `data/desenhos.json`, denúncias em `data/denuncias.json`.
