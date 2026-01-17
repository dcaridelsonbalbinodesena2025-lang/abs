const axios = require('axios');
const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI";
const TG_CHAT_ID = "-1003355965894";
const LINK_IQ = "https://iqoption.com/trader"; // Link direto para a corretora

const listaAtivos = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "EUR/JPY", "EUR/USD-OTC", "GBP/USD-OTC", "USD/JPY-OTC"];
let ativosSelecionados = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD"];

let global = { wins: 0, loss: 0, g1: 0, g2: 0 };
let dadosAtivos = {};
listaAtivos.forEach(a => {
    dadosAtivos[a] = { wins: 0, loss: 0, g1: 0, g2: 0, gatilho: false, direcao: "" };
});

// FUNÇÃO PARA ENVIAR MENSAGEM COM O BOTÃO DA CORRETORA
async function enviarTelegram(msg, comBotao = true) {
    const payload = {
        chat_id: TG_CHAT_ID,
        text: msg,
        parse_mode: "Markdown"
    };
    if (comBotao) {
        payload.reply_markup = {
            inline_keyboard: [[{ text: "📲 OPERAR NA IQ OPTION", url: LINK_IQ }]]
        };
    }
    try { await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, payload); } catch (e) {}
}

function calcEficiencia(nome) {
    const d = dadosAtivos[nome];
    const t = d.wins + d.g1 + d.g2 + d.loss;
    return t > 0 ? ((d.wins + d.g1 + d.g2) / t * 100).toFixed(1) : "0.0";
}

function obterRank() {
    return Object.keys(dadosAtivos)
        .map(nome => ({ nome, aproveitamento: parseFloat(calcEficiencia(nome)) }))
        .sort((a, b) => b.aproveitamento - a.aproveitamento)
        .slice(0, 3)
        .map((r, i) => `${i+1}º ${r.nome} (${r.aproveitamento}%)`).join("\n");
}

setInterval(() => {
    const segs = new Date().getSeconds();
    ativosSelecionados.forEach(ativo => {
        const d = dadosAtivos[ativo];
        const efGlobal = (global.wins + global.g1 + global.g2 + global.loss) > 0 ? 
            (((global.wins + global.g1 + global.g2) / (global.wins + global.g1 + global.g2 + global.loss)) * 100).toFixed(1) : "0.0";

        if (segs === 50) {
            d.direcao = Math.random() > 0.5 ? "🟢 CALL" : "🔴 PUT";
            d.gatilho = true;
            enviarTelegram(`⚠️ *ATENÇÃO ANALISANDO ENTRADA*\n\n💎 Ativo: ${ativo}\n📈 Direção: ${d.direcao}\n\n📊 *ATUAL:* ${d.wins}W - ${d.loss}L\n🌍 *GLOBAL:* ${global.wins}W - ${global.loss}L\n✅ *GALE:* G1: ${d.g1} | G2: ${d.g2}\n⚡ *ASSERTIVIDADE:* ${calcEficiencia(ativo)}%`);
        }

        if (segs === 0 && d.gatilho) {
            enviarTelegram(`🚀 *ENTRADA CONFIRMADA*\n👉 CLIQUE AGORA\n\n💎 Ativo: ${ativo}\n🎯 Sinal: ${d.direcao}\n📉 Taxa: Retração 30%\n🏆 *RANKING ATIVOS:*\n${obterRank()}\n\n🔥 *EFICIÊNCIA ROBO:* ${efGlobal}%`);
            d.gatilho = false;
            simularResultado(ativo, d.direcao);
        }
    });
}, 1000);

function simularResultado(ativo, direcao) {
    const d = dadosAtivos[ativo];
    setTimeout(() => {
        if (Math.random() > 0.4) {
            d.wins++; global.wins++;
            enviarTelegram(`✅ *WIN DIRETO: ${ativo}*\n🎯 Direção: ${direcao}\n📊 Ativo: ${d.wins}W - ${d.loss}L\n🌍 Global: ${global.wins}W - ${global.loss}L`, false);
        } else {
            enviarTelegram(`⚠️ *GALE 1: ${ativo}*\n🔁 Direção: ${direcao}\n📊 Placar: ${d.wins}W - ${d.loss}L`);
            // Lógica simplificada de Gale 1 e 2 segue o mesmo padrão...
        }
    }, 60000);
}

// ROTAS DO PAINEL (NÃO MEXER)
app.get('/lista-ativos', (req, res) => res.json(listaAtivos));
app.post('/selecionar-ativo', (req, res) => { ativosSelecionados[req.body.index] = req.body.ativo; res.json({status: "ok"}); });
app.get('/dados', (req, res) => {
    const resp = ativosSelecionados.map(a => ({ nome: a, wins: dadosAtivos[a].wins, loss: dadosAtivos[a].loss, forca: Math.floor(Math.random() * 15) + 80 }));
    res.json(resp);
});
app.listen(process.env.PORT || 3000);
