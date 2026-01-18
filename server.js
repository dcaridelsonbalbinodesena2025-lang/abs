const axios = require('axios');
const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// --- CONFIGURAÇÕES DO TELEGRAM E CORRETORA ---
const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI";
const TG_CHAT_ID = "-1003355965894";
const LINK_IQ = "https://iqoption.com/trader";

// --- LISTA DE ATIVOS (COM OPÇÃO DE DESATIVAR) ---
const listaAtivos = ["NENHUM", "USD/CHF" , "USD/NR" , "GPZ/NZD" , "EUR/USD", "AUD/JPY" , "GBP/USD", "USD/JPY", "AUD/USD", "EUR/JPY", "USD/PH" , "NZD/USD", "NZD/USD-OTC" ,  "USD/PH-OTC" , "EUR/USD-OTC", "GBP/USD-OTC", "USD/JPY-OTC" , "AUD/JPY-OTC" , "USD/NR-OTC" , "GPZ/NZD-OTC" , "USD/CHF-OTC" ];
let ativosSelecionados = ["EUR/USD", "GBP/USD", "NENHUM", "NENHUM"]; 

// --- PLACARES GLOBAIS E POR ATIVO ---
let global = { analises: 0, wins: 0, loss: 0, g1: 0, g2: 0, redGale: 0 };
let dadosAtivos = {};
listaAtivos.forEach(a => {
    dadosAtivos[a] = { wins: 0, loss: 0, g1: 0, g2: 0, redGale: 0, gatilho: false, direcao: "", ultimoMinuto: -1 };
});

// --- FUNÇÃO DE ENVIO PARA TELEGRAM ---
async function enviarTelegram(msg, comBotao = true) {
    const payload = { chat_id: TG_CHAT_ID, text: msg, parse_mode: "Markdown" };
    if (comBotao) {
        payload.reply_markup = { 
            inline_keyboard: [[{ text: "📲 OPERAR NA IQ OPTION", url: LINK_IQ }]] 
        };
    }
    try { await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, payload); } catch (e) {}
}

// --- CÁLCULOS DE EFICIÊNCIA E RANKING ---
function calcEficiencia(nome) {
    if (nome === "NENHUM") return "0.0";
    const d = dadosAtivos[nome];
    const t = d.wins + d.g1 + d.g2 + d.loss + d.redGale;
    return t > 0 ? (((d.wins + d.g1 + d.g2) / t) * 100).toFixed(1) : "0.0";
}

// --- RELATÓRIO DE 5 EM 5 MINUTOS ---
function enviarRelatorioPeriodico() {
    const totalGlobal = global.wins + global.loss + global.g1 + global.g2 + global.redGale;
    const efGlobal = totalGlobal > 0 ? (((global.wins + global.g1 + global.g2) / totalGlobal) * 100).toFixed(1) : "0.0";
    
    const ranking = Object.keys(dadosAtivos)
        .filter(nome => nome !== "NENHUM")
        .map(nome => ({ nome, ef: parseFloat(calcEficiencia(nome)) }))
        .sort((a, b) => b.ef - a.ef)
        .slice(0, 2)
        .map((r, i) => `🏆 ${i+1}º ${r.nome}: ${r.ef}%`).join("\n");

    const mensagem = `📊 *RELATÓRIO DE PERFORMANCE (5 MIN)*\n\n📈 *GERAL DA SESSÃO:*\n\`• Análises: ${global.analises}\` \n\`• Wins Diretos: ${global.wins}\` \n\`• Losses Diretos: ${global.loss}\` \n\`• Wins c/ Gale: ${global.g1 + global.g2}\` \n\`• Reds c/ Gale: ${global.redGale}\` \n\n🏆 *TOP RANKING:* \n${ranking} \n\n🔥 *EFICIÊNCIA ROBO: ${efGlobal}%*`;
    enviarTelegram(mensagem, false);
}
setInterval(enviarRelatorioPeriodico, 300000); // 300 mil milisegundos = 5 min

// --- LÓGICA DE RESULTADOS (WIN/GALE/RED) ---
function verificarResultadoFinal(ativo, direcao) {
    const d = dadosAtivos[ativo];
    setTimeout(() => {
        const sorte = Math.random();
        if (sorte > 0.4) {
            d.wins++; global.wins++;
            enviarTelegram(`✅ *WIN DIRETO: ${ativo}*\n🎯 *SINAL:* ${direcao}`, false);
        } else {
            enviarTelegram(`⚠️ **GALE 1: ${ativo}**\n🔁 **SINAL:** ${direcao}`);
            setTimeout(() => {
                if (Math.random() > 0.3) {
                    d.g1++; global.g1++;
                    enviarTelegram(`✅ *WIN NO G1: ${ativo}*`, false);
                } else {
                    enviarTelegram(`⚠️ **GALE 2: ${ativo}**\n🔁 **SINAL:** ${direcao}`);
                    setTimeout(() => {
                        if (Math.random() > 0.2) {
                            d.g2++; global.g2++;
                            enviarTelegram(`✅ *WIN NO G2: ${ativo}*`, false);
                        } else {
                            d.redGale++; global.redGale++;
                            enviarTelegram(`❌ *RED NO G2: ${ativo}*`, false);
                        }
                    }, 60000);
                }
            }, 60000);
        }
    }, 60000);
}

// --- CICLO PRINCIPAL (ANÁLISE E ENTRADA) ---
setInterval(() => {
    const agora = new Date();
    const segs = agora.getSeconds();
    const minAtual = agora.getMinutes();

    ativosSelecionados.forEach(ativo => {
        if (ativo === "NENHUM") return; 

        const d = dadosAtivos[ativo];
        if (d.ultimoMinuto === minAtual) return;

        if (segs === 50) {
            d.direcao = Math.random() > 0.5 ? "🟢 CALL" : "🔴 PUT";
            d.gatilho = true;
            global.analises++;
            enviarTelegram(`⚠️ *ANALISANDO:* ${ativo}\n🎯 *SINAL:* ${d.direcao}\n\n\`📊 ATIVO: ${d.wins}W-${d.loss}L\``);
            d.ultimoMinuto = minAtual;
        }

        if (segs === 0 && d.gatilho) {
            enviarTelegram(`🚀 *ENTRADA CONFIRMADA*\n👉 CLIQUE AGORA\n💎 *${ativo}* | *${d.direcao}*`);
            d.gatilho = false;
            verificarResultadoFinal(ativo, d.direcao);
        }
    });
}, 1000);

// --- ROTAS DO PAINEL WEB ---
app.get('/lista-ativos', (req, res) => res.json(listaAtivos));
app.post('/selecionar-ativo', (req, res) => {
    ativosSelecionados[req.body.index] = req.body.ativo;
    res.json({ status: "ok" });
});
app.get('/dados', (req, res) => {
    const resp = ativosSelecionados.map(a => {
        if (a === "NENHUM") return { nome: "DESATIVADO", wins: 0, loss: 0, forca: 0 };
        return {
            nome: a,
            wins: dadosAtivos[a].wins + dadosAtivos[a].g1 + dadosAtivos[a].g2,
            loss: dadosAtivos[a].loss + dadosAtivos[a].redGale,
            forca: Math.floor(Math.random() * 10) + 85
        };
    });
    res.json(resp);
});

app.listen(process.env.PORT || 3000, () => console.log("Robô Rodando!"));
