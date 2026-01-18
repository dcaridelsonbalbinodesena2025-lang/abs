const axios = require('axios');
const express = require('express');
const WebSocket = require('ws');
const app = express();

const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI";
const TG_CHAT_ID = "-1003355965894";
const LINK_CORRETORA = "https://track.deriv.com/_S_W1N_";

// --- LISTA COMPLETA E EXPANDIDA DERIV REAL ---
const ATIVOS_DADOS = [
    // FOREX
    { id: "frxEURUSD", nome: "EUR/USD" }, { id: "frxGBPUSD", nome: "GBP/USD" },
    { id: "frxUSDJPY", nome: "USD/JPY" }, { id: "frxAUDUSD", nome: "AUD/USD" },
    { id: "frxUSDCAD", nome: "USD/CAD" }, { id: "frxUSDCHF", nome: "USD/CHF" },
    { id: "frxEURGBP", nome: "EUR/GBP" }, { id: "frxEURJPY", nome: "EUR/JPY" },
    { id: "frxGBPJPY", nome: "GBP/JPY" }, { id: "frxAUDJPY", nome: "AUD/JPY" },
    { id: "frxXAUUSD", nome: "OURO (XAU/USD)" },
    // CRIPTO
    { id: "cryBTCUSD", nome: "BITCOIN (BTC)" }, { id: "cryETHUSD", nome: "ETHEREUM (ETH)" },
    { id: "cryLTCUSD", nome: "LITECOIN (LTC)" }, { id: "cryXRPUSD", nome: "RIPPLE (XRP)" },
    // SINTÉTICOS
    { id: "1HZ10V", nome: "Volatility 10 (1s)" }, { id: "1HZ25V", nome: "Volatility 25 (1s)" },
    { id: "1HZ50V", nome: "Volatility 50 (1s)" }, { id: "1HZ75V", nome: "Volatility 75 (1s)" },
    { id: "1HZ100V", nome: "Volatility 100 (1s)" }, { id: "R_10", nome: "Volatility 10" },
    { id: "R_25", nome: "Volatility 25" }, { id: "R_50", nome: "Volatility 50" },
    { id: "R_75", nome: "Volatility 75" }, { id: "R_100", nome: "Volatility 100" },
    { id: "BOOM500", nome: "Boom 500" }, { id: "CRASH500", nome: "Crash 500" }
];

let globalStats = { analises: 0, winDireto: 0, winGales: 0, loss: 0 };
let motores = {};

ATIVOS_DADOS.forEach(a => {
    motores[a.id] = { 
        nome: a.nome, wins: 0, loss: 0, aberturaVela: 0, fechamentoAnterior: 0, 
        forca: 50, buscandoTaxa: false, operacaoAtiva: null, galeAtual: 0, 
        tempoOp: 0, precoEntrada: 0, sinalPendente: null 
    };
});

async function enviarTelegram(msg, comBotao = true) {
    const payload = { chat_id: TG_CHAT_ID, text: msg, parse_mode: "Markdown" };
    if (comBotao) payload.reply_markup = { inline_keyboard: [[{ text: "📲 OPERAR AGORA", url: LINK_CORRETORA }]] };
    try { await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, payload); } catch (e) {}
}

function conectarDeriv() {
    const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');

    ws.on('open', () => {
        console.log("Conectado na Deriv! Monitorando Lista Expandida.");
        ATIVOS_DADOS.forEach(a => ws.send(JSON.stringify({ ticks: a.id })));
    });

    ws.on('message', (data) => {
        const res = JSON.parse(data);
        if (!res.tick) return;
        const m = motores[res.tick.symbol];
        if (!m) return;

        const preco = res.tick.quote;
        const segs = new Date().getSeconds();

        // 1. Cálculo da Força Real
        if (m.aberturaVela > 0) {
            let diff = preco - m.aberturaVela;
            m.forca = 50 + (diff / (m.aberturaVela * 0.0002) * 20);
            m.forca = Math.min(98, Math.max(2, m.forca));
        }

        // 2. Lógica de Retração Real de 20% (Confirmação)
        if (m.buscandoTaxa && !m.operacaoAtiva && segs <= 30) {
            let diffVelaAnterior = Math.abs(m.fechamentoAnterior - m.aberturaVela) || 0.0001;
            let alvo = diffVelaAnterior * 0.20; 
            
            let confirmou = (m.sinalPendente === "CALL" && preco <= (m.aberturaVela - alvo)) || 
                            (m.sinalPendente === "PUT" && preco >= (m.aberturaVela + alvo));

            if (confirmou) {
                m.operacaoAtiva = m.sinalPendente;
                m.precoEntrada = preco;
                m.tempoOp = (60 - segs);
                m.buscandoTaxa = false;
                enviarTelegram(`🚀 *ENTRADA CONFIRMADA*\n👉 *CLIQUE AGORA*\n\n💎 *Ativo:* ${m.nome}\n🎯 *Sinal:* ${m.operacaoAtiva === "CALL" ? "🟢 CALL" : "🔴 PUT"}\n⏱ *Expiração:* M1`);
            }
        }

        // 3. Abortar se não retrair até os 31 segundos
        if (segs === 31 && m.buscandoTaxa) {
            m.buscandoTaxa = false;
            enviarTelegram(`❌ *ANÁLISE ABORTADA: ${m.nome}*\n⚠️ *MOTIVO:* Taxa de retração não atingida.`, false);
        }

        // 4. Virada de Vela (Segundo 00)
        if (segs === 0 && m.aberturaVela !== preco) {
            m.fechamentoAnterior = m.aberturaVela;
            m.aberturaVela = preco;
            
            if (m.forca >= 70) m.sinalPendente = "CALL";
            else if (m.forca <= 30) m.sinalPendente = "PUT";
            else m.sinalPendente = null;

            if (m.sinalPendente && !m.operacaoAtiva) {
                m.buscandoTaxa = true;
                enviarTelegram(`⚠️ *ANALISANDO:* ${m.nome}\n🔥 *FORÇA:* ${m.forca.toFixed(0)}%\n🎯 *SINAL:* ${m.sinalPendente === "CALL" ? "🟢 CALL" : "🔴 PUT"}\n\n⏳ *AGUARDANDO RETRAÇÃO...*`);
            }
        }

        // 5. Verificação de Resultados e Gales
        if (m.tempoOp > 0) {
            m.tempoOp--;
            if (m.tempoOp <= 0) {
                const win = (m.operacaoAtiva === "CALL" && preco > m.precoEntrada) || (m.operacaoAtiva === "PUT" && preco < m.precoEntrada);
                const sinalOriginal = m.operacaoAtiva;

                if (win) {
                    if (m.galeAtual === 0) globalStats.winDireto++; else globalStats.winGales++;
                    m.wins++; globalStats.analises++;
                    enviarTelegram(`✅ *WIN ${m.galeAtual === 0 ? 'DIRETO' : 'GALE ' + m.galeAtual}: ${m.nome}*\n📊 *PLACAR:* ${globalStats.winDireto + globalStats.winGales}W - ${globalStats.loss}L`, false);
                    m.operacaoAtiva = null; m.galeAtual = 0;
                } else if (m.galeAtual < 2) {
                    m.galeAtual++;
                    m.precoEntrada = preco;
                    m.tempoOp = 60;
                    enviarTelegram(`⚠️ **GALE ${m.galeAtual}: ${m.nome}**\n🎯 **SINAL:** ${sinalOriginal === "CALL" ? "🟢 CALL" : "🔴 PUT"}\n🔁 **ENTRAR AGORA!**`);
                } else {
                    m.loss++; globalStats.loss++; globalStats.analises++;
                    enviarTelegram(`❌ *RED: ${m.nome}*\n📊 *PLACAR:* ${globalStats.winDireto + globalStats.winGales}W - ${globalStats.loss}L`, false);
                    m.operacaoAtiva = null; m.galeAtual = 0;
                }
            }
        }
    });

    ws.on('close', () => setTimeout(conectarDeriv, 5000));
}

// 📊 RELATÓRIO ROBUSTO (A CADA 5 MINUTOS)
setInterval(() => {
    const totalW = globalStats.winDireto + globalStats.winGales;
    const ef = globalStats.analises > 0 ? ((totalW / (totalW + globalStats.loss)) * 100).toFixed(1) : 0;
    
    let ranking = Object.values(motores)
        .filter(m => (m.wins + m.loss) > 0)
        .sort((a,b) => b.wins - a.wins)
        .slice(0, 4)
        .map((item, i) => `${i+1}º ${item.nome}: ${item.wins}W`)
        .join("\n");

    const msg = `📊 *RELATÓRIO DE PERFORMANCE*\n\n📈 *GERAL:*\n` +
                `• Análises: ${globalStats.analises}\n` +
                `• Wins Diretos: ${globalStats.winDireto}\n` +
                `• Wins c/ Gale: ${globalStats.winGales}\n` +
                `• Reds Total: ${globalStats.loss}\n\n` +
                `🏆 *RANKING ATIVOS:*\n${ranking || "Sem operações no momento"}\n\n` +
                `🔥 *EFICIÊNCIA ROBO: ${ef}%*`;
    
    enviarTelegram(msg, false);
}, 300000);

conectarDeriv();
app.get('/', (req, res) => res.send("Robô KCM Deriv 24h Online"));
app.listen(process.env.PORT || 3000);
