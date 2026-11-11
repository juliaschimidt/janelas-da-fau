// Ajustes do projeto. As faixas de temperatura abaixo são EXEMPLO: troque pela tabela da equipe.
const CONFIG = {
  slotMin: 20,
  paletas: [
    { min: 29, rotulo: 'acima de 29 °C', cores: ['#ff4a2b', '#ff9a1f', '#ffd84a'] },
    { min: 25, rotulo: 'de 25 a 29 °C', cores: ['#ff7a59', '#ffc145', '#ff9ecb'] },
    { min: 20, rotulo: 'de 20 a 25 °C', cores: ['#ffe066', '#8be08b', '#ff8fab'] },
    { min: 15, rotulo: 'de 15 a 20 °C', cores: ['#7fe0c4', '#5ab4ff', '#c9a7ff'] },
    { min: -99, rotulo: 'abaixo de 15 °C', cores: ['#5ab4ff', '#a8e6ff', '#f4f7ff'] },
  ],
  // usada quando nenhuma fonte de clima responde: o desenho fica em preto e branco
  semDados: { rotulo: 'sem dados do clima', cores: ['#ffffff', '#a6a6a6', '#5a5a5a'] },
  vento: [
    { max: 5, nivel: 0, texto: 'quase parado' },
    { max: 20, nivel: 1, texto: 'balança um pouco' },
    { max: Infinity, nivel: 2, texto: 'balança muito' },
  ],
  // deslocamento máximo de cada ponto do traço (px do canvas) para uma velocidade de vento em km/h
  amplitude: (kmh) => Math.min(10, 0.6 + kmh * 0.3),
  espessuras: [4, 8, 14, 22, 32],
};

const temDados = (c) => c && c.temperatura != null && c.vento != null && c.umidade != null;
const paletaPara = (t) => (t == null ? CONFIG.semDados : CONFIG.paletas.find((p) => t >= p.min));
const ventoPara = (v) => (v == null ? { nivel: -1, texto: 'sem dados' } : CONFIG.vento.find((n) => v < n.max));
// umidade = transparência: 80% de umidade → traço 80% transparente (20% de opacidade)
const opacidadePara = (c) => (temDados(c) ? Math.max(0.08, Math.min(1, 1 - c.umidade / 100)) : 1);
const amplitudePara = (c) => CONFIG.amplitude(temDados(c) ? c.vento : 0);
