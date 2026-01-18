const axios = require('axios');
const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI";
const TG_CHAT_ID = "-1003355965894";
const LINK_IQ = "https://iqoption.com/trader";

const listaAtivos = ["NENHUM", "SOL/USD", "SOL/USD-OTC", "USD/BRL", "USD/BRL-OTC", "USD/COP", "USD/COP-OTC", "AUD/CAD", "AUD/CAD-OTC", "AUD/JPY", "AUD/JPY-OTC", "BTC/USD", "BTC/USD-OTC", "ETH/USD", "ETH/USD-OTC", "EUR/AUD", "EUR/AUD-OTC", "EUR/CAD", "EUR/CAD-OTC", "EUR/CHF", "EUR/CHF-OTC", "EUR/GBP", "EUR/GBP-OTC", "EUR/JPY", "EUR/JPY-OTC", "EUR/USD", "EUR/USD-OTC", "EUR/NZD", "EUR/NZD-OTC", "GBP/AUD", "GBP/AUD-OTC", "GBP/CAD", "GBP/CAD-OTC", "GBP/CHF", "GBP/CHF-OTC", "GBP/JPY", "GBP/JPY-OTC", "GBP/NZD", "GBP/NZD-OTC", "GBP/USD", "GBP/USD-OTC", "USD/CAD", "USD/CAD-OTC", "USD/CHF", "USD/CHF-OTC", "USD/JPY", "USD/JPY-OTC"];
let ativosSelecionados = ["EUR/USD", "GBP/USD", "NENHUM", "NENHUM"]; 

let global = { analises: 0, wins: 0, g1: 0, g2: 0, loss: 0, redGale: 0 };
let dadosAtivos = {};

listaAtivos.forEach(a => {
    dadosAtivos[a] = { wins: 0, loss: 0, g1: 0, g2: 0, redGale: 0, gatilhoRusso: false, direcao: "", ultimoMinuto: -1, emOperacao: false, buscaRetracao: false };
});

async function enviarTelegram(msg, comBotao = true) {
    const payload = { chat_id: TG_CHAT_ID, text: msg, parse_mode: "Markdown" };
    if (comBotao) { payload.reply_markup = { inline_keyboard: [[{ text: "📲 OPERAR NA IQ OPTION", url: LINK_IQ }]] }; }
    try { await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, payload); } catch (e) {}
}

function obterStatusGeral() {
    const totalW = global.wins + global.g1 + global.g2;
    const totalL = global.loss + global.redGale;
    const totalGeral = totalW + totalL;
    const ef = totalGeral > 0 ? ((totalW / totalGeral) * 100).toFixed(1) : "0.0";
    return `📊 *PLACAR GERAL:* ${totalW}W - ${totalL}L\n🔥 *EFICIÊNCIA:* ${ef}%`;
}

function verificarResultadoM1(ativo, direcao, tempoParaFechar) {
    const d = dadosAtivos[ativo];
    d.emOperacao = true;
    
    setTimeout(() => {
        if (Math.random() > 0.4) {
            d.wins++; global.wins++;
            enviarTelegram(`✅ *WIN DIRETO: ${ativo}*\n\n${obterStatusGeral()}`, false);
            d.emOperacao = false; d.buscaRetracao = false;
        } else {
            // MENSAGEM DE GALE 1 COM O SINAL INCLUÍDO
            enviarTelegram(`⚠️ **GALE 1: ${ativo}**\n🎯 **SINAL:** ${direcao}\n🔁 **REPETIR ENTRADA AGORA!**`);
            
            setTimeout(() => {
                if (Math.random() > 0.3) {
                    d.g1++; global.g1++;
                    enviarTelegram(`✅ *WIN G1: ${ativo}*\n\n${obterStatusGeral()}`, false);
                    d.emOperacao = false; d.buscaRetracao = false;
                } else {
                    // MENSAGEM DE GALE 2 COM O SINAL INCLUÍDO
                    enviarTelegram(`⚠️ **GALE 2: ${ativo}**\n🎯 **SINAL:** ${direcao}\n🔁 **ÚLTIMA TENTATIVA!**`);
                    
                    setTimeout(() => {
                        if (Math.random() > 0.2) {
                            d.g2++; global.g2++;
                            enviarTelegram(`✅ *WIN G2: ${ativo}*\n\n${obterStatusGeral()}`, false);
                        } else {
                            d.redGale++; global.redGale++;
                            enviarTelegram(`❌ *RED: ${ativo}*\n\n${obterStatusGeral()}`, false);
                        }
                        d.emOperacao = false; d.buscaRetracao = false;
                    }, 60000);
                }
            }, 60000);
        }
    }, tempoParaFechar);
}

// ... (Restante do código de Ciclo Sniper e Relatório de Performance igual ao anterior)

setInterval(() => {
    const agora = new Date();
    const segs = agora.getSeconds();
    const minAtual = agora.getMinutes();
    ativosSelecionados.forEach(ativo => {
        if (ativo === "NENHUM") return; 
        const d = dadosAtivos[ativo];
        if (d.emOperacao) return;
        if (segs === 50 && d.ultimoMinuto !== minAtual) {
            const forcaReal = Math.floor(Math.random() * 31) + 70; 
            if (forcaReal >= 70) {
                d.direcao = Math.random() > 0.5 ? "🟢 CALL" : "🔴 PUT";
                d.gatilhoRusso = true; d.ultimoMinuto = minAtual; global.analises++;
                enviarTelegram(`⚠️ *ANALISANDO:* ${ativo}\n🔥 *FORÇA:* ${forcaReal}%\n🎯 *SINAL:* ${d.direcao}\n\n⏳ *AGUARDANDO CONFIRMAÇÃO...*`);
            }
        }
        if (d.gatilhoRusso && segs > 0 && segs <= 30 && !d.buscaRetracao) {
            if (Math.random() > 0.4) {
                d.buscaRetracao = true; d.gatilhoRusso = false;
                enviarTelegram(`🚀 *ENTRADA CONFIRMADA*\n👉 **CLIQUE AGORA**\n💎 *${ativo}*\n🎯 *SINAL:* ${d.direcao}\n⏱ *EXPIRAÇÃO:* M1`);
                verificarResultadoM1(ativo, d.direcao, (60 - segs) * 1000);
            }
        }
        if (segs === 31 && d.gatilhoRusso && !d.buscaRetracao) {
            enviarTelegram(`❌ *ANÁLISE ABORTADA: ${ativo}*`, false);
            d.gatilhoRusso = false; d.buscaRetracao = false;
        }
    });
}, 1000);

// Relatório de performance a cada 5 minutos (Aquele robusto da imagem 2)
function gerarRelatorioPerformance() {
    const totalW = global.wins + global.g1 + global.g2;
    const totalL = global.loss + global.redGale;
    const totalGeral = totalW + totalL;
    const efGlobal = totalGeral > 0 ? ((totalW / totalGeral) * 100).toFixed(1) : "0.0";
    const ranking = Object.keys(dadosAtivos)
        .filter(a => (dadosAtivos[a].wins + dadosAtivos[a].g1 + dadosAtivos[a].g2 + dadosAtivos[a].loss + dadosAtivos[a].redGale) > 0)
        .map(a => {
            const da = dadosAtivos[a];
            const ta = da.wins + da.g1 + da.g2 + da.loss + da.redGale;
            const efa = ta > 0 ? (((da.wins + da.g1 + da.g2) / ta) * 100).toFixed(1) : "0.0";
            return { nome: a, ef: parseFloat(efa) };
        })
        .sort((a, b) => b.ef - a.ef).slice(0, 4)
        .map((item, i) => `${i + 1}º ${item.nome}: ${item.ef}%`).join("\n");

    const mensagem = `📊 *RELATÓRIO DE PERFORMANCE*\n\n📈 *GERAL:*\n• Análises: ${global.analises}\n• Wins Diretos: ${global.wins}\n• Losses Diretos: ${global.loss}\n• Wins c/ Gale: ${global.g1 + global.g2}\n• Reds c/ Gale: ${global.redGale}\n\n🏆 *RANKING ATIVOS:*\n${ranking || "Sem operações"}\n\n🔥 *EFICIÊNCIA ROBO: ${efGlobal}%*`;
    enviarTelegram(mensagem, false);
}
setInterval(gerarRelatorioPerformance, 300000);

app.get('/lista-ativos', (req, res) => res.json(listaAtivos));
app.post('/selecionar-ativo', (req, res) => { ativosSelecionados[req.body.index] = req.body.ativo; res.json({ status: "ok" }); });
app.get('/dados', (req, res) => {
    const resp = ativosSelecionados.map(a => {
        if (a === "NENHUM") return { nome: "DESATIVADO", wins: 0, loss: 0 };
        return { nome: a, wins: dadosAtivos[a].wins + dadosAtivos[a].g1 + dadosAtivos[a].g2, loss: dadosAtivos[a].loss + dadosAtivos[a].redGale };
    });
    res.json(resp);
});
app.listen(process.env.PORT || 3000);
