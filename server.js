const axios = require('axios');
const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI";
const TG_CHAT_ID = "-1003355965894";

const listaAtivos = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "EUR/JPY", "EUR/USD-OTC", "GBP/USD-OTC", "USD/JPY-OTC"];
let ativosSelecionados = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD"];

// PLACARES GLOBAIS E POR ATIVO
let global = { wins: 0, loss: 0, g1: 0, g2: 0 };
let dadosAtivos = {};
listaAtivos.forEach(a => {
    dadosAtivos[a] = { wins: 0, loss: 0, g1: 0, g2: 0, gatilho: false, direcao: "" };
});

async function enviarTelegram(msg) {
    try { await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, { chat_id: TG_CHAT_ID, text: msg, parse_mode: "Markdown" }); } catch (e) {}
}

// CALCULA EFICIÊNCIA E GERA O RANKING
function obterRelatorio(ativoNome) {
    const d = dadosAtivos[ativoNome];
    const totalAtivo = d.wins + d.g1 + d.g2 + d.loss;
    const efAtivo = totalAtivo > 0 ? ((d.wins + d.g1 + d.g2) / totalAtivo * 100).toFixed(1) : "0.0";
    
    const totalGlobal = global.wins + global.g1 + global.g2 + global.loss;
    const efGlobal = totalGlobal > 0 ? ((global.wins + global.g1 + global.g2) / totalGlobal * 100).toFixed(1) : "0.0";

    // Ranking: Ordena ativos do melhor para o pior
    const ranking = Object.keys(dadosAtivos)
        .map(nome => ({ nome, aproveitamento: parseFloat(calcEficiencia(nome)) }))
        .sort((a, b) => b.aproveitamento - a.aproveitamento)
        .slice(0, 3); // Top 3

    let rankTexto = ranking.map((r, i) => `${i+1}º ${r.nome} (${r.aproveitamento}%)`).join("\n");

    return { efAtivo, efGlobal, rankTexto, totalAtivo, totalGlobal };
}

function calcEficiencia(nome) {
    const d = dadosAtivos[nome];
    const t = d.wins + d.g1 + d.g2 + d.loss;
    return t > 0 ? ((d.wins + d.g1 + d.g2) / t * 100).toFixed(1) : "0.0";
}

// LOGICA DE SINAIS
setInterval(() => {
    const segs = new Date().getSeconds();

    ativosSelecionados.forEach(ativo => {
        const d = dadosAtivos[ativo];
        const rel = obterRelatorio(ativo);

        // GATILHO 1: ATENÇÃO (50s)
        if (segs === 50) {
            d.direcao = Math.random() > 0.5 ? "🟢 CALL" : "🔴 PUT";
            d.gatilho = true;
            enviarTelegram(`⚠️ *ATENÇÃO ANALISANDO ENTRADA*\n\n💎 Ativo: ${ativo}\n📈 Direção: ${d.direcao}\n\n📊 *PLACAR ATIVO:* ${d.wins}W - ${d.loss}L\n🌍 *PLACAR GLOBAL:* ${global.wins}W - ${global.loss}L\n✅ *GALE:* G1: ${d.g1} | G2: ${d.g2}\n⚡ *ASSERTIVIDADE:* ${rel.efAtivo}%`);
        }

        // GATILHO 2: CONFIRMAÇÃO (00s)
        if (segs === 0 && d.gatilho) {
            enviarTelegram(`🚀 *ENTRADA CONFIRMADA*\n\n💎 Ativo: ${ativo}\n🎯 Sinal: ${d.direcao}\n📉 Taxa: Retração 30%\n🏆 *RANKING ATIVOS:*\n${rel.rankTexto}\n\n🔥 *EFICIÊNCIA ROBO:* ${rel.efGlobal}%`);
            d.gatilho = false;
            
            // Simulação de Resultado (Win/Gale/Loss)
            executarSimulacaoResultado(ativo, d.direcao);
        }
    });
}, 1000);

function executarSimulacaoResultado(ativo, direcao) {
    const d = dadosAtivos[ativo];
    setTimeout(() => {
        const sorte = Math.random();
        if (sorte > 0.4) { // WIN DIRETO
            d.wins++; global.wins++;
            enviarTelegram(`✅ *WIN DIRETO: ${ativo}*\n\n🎯 Entrada: ${direcao}\n📊 Ativo: ${d.wins}W - ${d.loss}L\n🌍 Global: ${global.wins}W - ${global.loss}L\n⚡ Eficiência: ${calcEficiencia(ativo)}%`);
        } else { // GALE 1
            enviarTelegram(`⚠️ *GALE 1: ${ativo}*\n🔁 Mesma Direção: ${direcao}`);
            setTimeout(() => {
                if (Math.random() > 0.3) { // WIN GALE 1
                    d.g1++; global.g1++;
                    enviarTelegram(`✅ *WIN NO G1: ${ativo}*\n📊 G1 Total: ${d.g1}\n⚡ Eficiência: ${calcEficiencia(ativo)}%`);
                } else { // GALE 2
                    enviarTelegram(`⚠️ *GALE 2: ${ativo}*\n🔁 Mesma Direção: ${direcao}`);
                    setTimeout(() => {
                        if (Math.random() > 0.2) { // WIN GALE 2
                            d.g2++; global.g2++;
                            enviarTelegram(`✅ *WIN NO G2: ${ativo}*\n📊 G2 Total: ${d.g2}\n⚡ Eficiência: ${calcEficiencia(ativo)}%`);
                        } else { // LOSS (RED)
                            d.loss++; global.loss++;
                            enviarTelegram(`❌ *RED NO ATIVO: ${ativo}*\n📊 Placar Ativo: ${d.wins}W - ${d.loss}L\n🌍 Global: ${global.wins}W - ${global.loss}L`);
                        }
                    }, 60000);
                }
            }, 60000);
        }
    }, 60000);
}

app.get('/lista-ativos', (req, res) => res.json(listaAtivos));
app.post('/selecionar-ativo', (req, res) => {
    ativosSelecionados[req.body.index] = req.body.ativo;
    res.json({status: "ok"});
});
app.get('/dados', (req, res) => {
    const resp = ativosSelecionados.map(a => ({ nome: a, wins: dadosAtivos[a].wins, loss: dadosAtivos[a].loss, forca: Math.floor(Math.random() * 15) + 80 }));
    res.json(resp);
});

app.listen(process.env.PORT || 3000);
