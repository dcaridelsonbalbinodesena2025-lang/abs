const axios = require('axios');
const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI";
const TG_CHAT_ID = "-1003355965894";
const LINK_IQ = "https://iqoption.com/trader";

const listaAtivos = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "EUR/JPY", "EUR/USD-OTC", "GBP/USD-OTC", "USD/JPY-OTC"];
let ativosSelecionados = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD"];

let global = { wins: 0, loss: 0, g1: 0, g2: 0 };
let dadosAtivos = {};
listaAtivos.forEach(a => {
    dadosAtivos[a] = { wins: 0, loss: 0, g1: 0, g2: 0, gatilho: false, direcao: "" };
});

async function enviarTelegram(msg, comBotao = true) {
    const payload = { chat_id: TG_CHAT_ID, text: msg, parse_mode: "Markdown" };
    if (comBotao) {
        payload.reply_markup = { inline_keyboard: [[{ text: "📲 OPERAR AGORA", url: LINK_IQ }]] };
    }
    try { await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, payload); } catch (e) {}
}

function calcEficiencia(nome) {
    const d = dadosAtivos[nome];
    const t = d.wins + d.g1 + d.g2 + d.loss;
    return t > 0 ? ((d.wins + d.g1 + d.g2) / t * 100).toFixed(1) : "0.0";
}

// RANKING LIMITADO A APENAS 1º E 2º LUGAR
function obterRank() {
    return Object.keys(dadosAtivos)
        .map(nome => ({ nome, aproveitamento: parseFloat(calcEficiencia(nome)) }))
        .sort((a, b) => b.aproveitamento - a.aproveitamento)
        .slice(0, 2)
        .map((r, i) => `🏆 ${i+1}º ${r.nome} (${r.aproveitamento}%)`).join("\n");
}

setInterval(() => {
    const segs = new Date().getSeconds();
    ativosSelecionados.forEach(ativo => {
        const d = dadosAtivos[ativo];
        const efG = (global.wins + global.g1 + global.g2 + global.loss) > 0 ? 
            (((global.wins + global.g1 + global.g2) / (global.wins + global.g1 + global.g2 + global.loss)) * 100).toFixed(1) : "0.0";

        if (segs === 50) {
            d.direcao = Math.random() > 0.5 ? "🟢 CALL" : "🔴 PUT";
            d.gatilho = true;
            // MENSAGEM CURTA DE ATENÇÃO
            enviarTelegram(`⚠️ *ANALISANDO:* ${ativo}\n🎯 *SINAL:* ${d.direcao}\n\n\`📊 ATIVO: ${d.wins}W-${d.loss}L\`\n\`🌍 GLOB: ${global.wins}W-${global.loss}L\`\n\`⚡ ASSERT: ${calcEficiencia(ativo)}%\``);
        }

        if (segs === 0 && d.gatilho) {
            // MENSAGEM CURTA DE CONFIRMAÇÃO (SEM "RETRAÇÃO")
            enviarTelegram(`🚀 *ENTRADA CONFIRMADA*\n\n💎 *${ativo}* | *${d.direcao}*\n\n${obterRank()}\n\`🔥 EFIC: ${efG}%\``);
            d.gatilho = false;
        }
    });
}, 1000);

// ROTAS DO PAINEL MANTIDAS
app.get('/lista-ativos', (req, res) => res.json(listaAtivos));
app.post('/selecionar-ativo', (req, res) => { ativosSelecionados[req.body.index] = req.body.ativo; res.json({status: "ok"}); });
app.get('/dados', (req, res) => {
    const resp = ativosSelecionados.map(a => ({ nome: a, wins: dadosAtivos[a].wins, loss: dadosAtivos[a].loss, forca: Math.floor(Math.random() * 15) + 80 }));
    res.json(resp);
});
app.listen(process.env.PORT || 3000);
