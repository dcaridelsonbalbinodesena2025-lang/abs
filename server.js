const axios = require('axios');
const express = require('express');
const WebSocket = require('ws');
const app = express();

const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI";
const TG_CHAT_ID = "-1003355965894";
const LINK_CORRETORA = "https://track.deriv.com/_S_W1N_";

// --- LISTA DE ATIVOS COMPLETA E ATUALIZADA (SINTÉTICOS, FOREX, METAIS E CRIPTO) ---
const LISTA_ATIVOS = [
    { id: "NONE", nome: "❌ DESATIVAR SLOT" },
    
    // --- ÍNDICES SINTÉTICOS (24/7 - OS MELHORES PARA O ROBÔ) ---
    { id: "1HZ10V", nome: "📈 Volatility 10 (1s)" },
    { id: "1HZ25V", nome: "📈 Volatility 25 (1s)" },
    { id: "1HZ50V", nome: "📈 Volatility 50 (1s)" },
    { id: "1HZ75V", nome: "📈 Volatility 75 (1s)" },
    { id: "1HZ100V", nome: "📈 Volatility 100 (1s)" },
    { id: "R_10", nome: "📊 Volatility 10" },
    { id: "R_25", nome: "📊 Volatility 25" },
    { id: "R_50", nome: "📊 Volatility 50" },
    { id: "R_75", nome: "📊 Volatility 75" },
    { id: "R_100", nome: "📊 Volatility 100" },
    { id: "JD10", nome: "🚀 Jump 10" },
    { id: "JD25", nome: "🚀 Jump 25" },
    { id: "JD50", nome: "🚀 Jump 50" },
    { id: "JD75", nome: "🚀 Jump 75" },
    { id: "JD100", nome: "🚀 Jump 100" },
    { id: "BOOM300", nome: "💥 Boom 300" },
    { id: "BOOM500", nome: "💥 Boom 500" },
    { id: "BOOM1000", nome: "💥 Boom 1000" },
    { id: "CRASH300", nome: "📉 Crash 300" },
    { id: "CRASH500", nome: "📉 Crash 500" },
    { id: "CRASH1000", nome: "📉 Crash 1000" },
    { id: "ST50", nome: "🎢 Step Index" },

    // --- FOREX (PARES MAIORES - SEGUNDA A SEXTA) ---
    { id: "frxEURUSD", nome: "💱 EUR/USD (Euro/Dólar)" },
    { id: "frxGBPUSD", nome: "💱 GBP/USD (Libra/Dólar)" },
    { id: "frxUSDJPY", nome: "💱 USD/JPY (Dólar/Iene)" },
    { id: "frxAUDUSD", nome: "💱 AUD/USD (Dólar Aus./Dólar)" },
    { id: "frxUSDCAD", nome: "💱 USD/CAD (Dólar/Dólar Can.)" },
    { id: "frxUSDCHF", nome: "💱 USD/CHF (Dólar/Franco Suíço)" },
    { id: "frxEURGBP", nome: "💱 EUR/GBP (Euro/Libra)" },
    { id: "frxEURJPY", nome: "💱 EUR/JPY (Euro/Iene)" },
    { id: "frxGBPJPY", nome: "💱 GBP/JPY (Libra/Iene)" },

    // --- METAIS E ENERGIA (COMMODITIES) ---
    { id: "frxXAUUSD", nome: "🪙 OURO (XAU/USD)" },
    { id: "frxXAGUSD", nome: "🥈 PRATA (XAG/USD)" },
    { id: "frxXPDUSD", nome: "🧪 PALÁDIO (XPD/USD)" },
    { id: "frxXPTUSD", nome: "⚪ PLATINA (XPT/USD)" },

    // --- CRIPTOMOEDAS (24/7) ---
    { id: "cryBTCUSD", nome: "₿ BITCOIN (BTC/USD)" },
    { id: "cryETHUSD", nome: "♢ ETHEREUM (ETH/USD)" },
    { id: "cryLTCUSD", nome: "Ł LITECOIN (LTC/USD)" },
    { id: "cryXRPUSD", nome: "✕ RIPPLE (XRP/USD)" },
    { id: "cryBCHUSD", nome: "₿ BITCOIN CASH (BCH/USD)" },
    { id: "cryEOSUSD", nome: "🌐 EOS (EOS/USD)" },
    { id: "cryDSHUSD", nome: "💨 DASH (DASH/USD)" }
];


let statsDia = { analises: 0, winDireto: 0, winGales: 0, loss: 0 };
let statsSemana = { analises: 0, winDireto: 0, winGales: 0, loss: 0 };
let motores = {};
let slots = ["1HZ100V", "R_100", "frxEURUSD", "NONE"];

function inicializarMotores() {
    slots.forEach(id => {
        if (id !== "NONE" && !motores[id]) {
            const info = LISTA_ATIVOS.find(a => a.id === id);
            motores[id] = { 
                nome: info ? info.nome : id, wins: 0, loss: 0, aberturaVela: 0, 
                forca: 50, operacaoAtiva: null, galeAtual: 0, tempoOp: 0, precoEntrada: 0,
                analiseEnviada: false, precoAtual: 0 
            };
        }
    });
}

async function enviarTelegram(msg, comBotao = false) {
    const payload = { chat_id: TG_CHAT_ID, text: msg, parse_mode: "Markdown" };
    if (comBotao) payload.reply_markup = { inline_keyboard: [[{ text: "📲 OPERAR AGORA", url: LINK_CORRETORA }]] };
    try { await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, payload); } catch (e) {}
}

function gerarPlacarMsg(id) {
    const m = motores[id];
    const totalW = statsDia.winDireto + statsDia.winGales;
    const assert = statsDia.analises > 0 ? ((totalW / statsDia.analises) * 100).toFixed(1) : "0";
    return `\n\n🏆 *PLACAR ATUAL*\n📊 *ATIVO:* ${m.wins}W - ${m.loss}L\n🌍 *GLOBAL HOJE:* ${totalW}W - ${statsDia.loss}L\n🔥 EFICIÊNCIA(${assert}%)`;
}

function registrarResultado(id, win, gale) {
    const m = motores[id];
    if (win) {
        m.wins++;
        if (gale === 0) { statsDia.winDireto++; statsSemana.winDireto++; }
        else { statsDia.winGales++; statsSemana.winGales++; }
    } else {
        m.loss++;
        statsDia.loss++; statsSemana.loss++;
    }
    statsDia.analises++;
    statsSemana.analises++;
}

function processarTick(id, preco) {
    const m = motores[id]; if (!m) return;
    m.precoAtual = preco;
    
    // --- SINCRONIZAÇÃO COM HORÁRIO DE BRASÍLIA ---
    const agoraUTC = new Date();
    const agoraBR = new Date(agoraUTC.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    const segs = agoraBR.getSeconds();
    const direcaoTxt = (s) => s === "CALL" ? "🟢 COMPRA" : "🔴 VENDA";

    if (m.aberturaVela > 0) {
        m.forca = 50 + ((preco - m.aberturaVela) / (m.aberturaVela * 0.0002) * 20);
        m.forca = Math.min(98, Math.max(2, m.forca));
    }

    // --- ANALISANDO TAXA (ALERTA PRÉVIO AOS 45s) ---
    if (segs >= 40 && segs <= 50 && !m.analiseEnviada && !m.operacaoAtiva) {
        let sinalPrevia = m.forca >= 60 ? "CALL" : m.forca <= 35 ? "PUT" : null;
        if (sinalPrevia) {
            const proxMinuto = new Date(agoraBR.getTime() + 60000);
            const horaEntrada = proxMinuto.getHours().toString().padStart(2, '0') + ":" + proxMinuto.getMinutes().toString().padStart(2, '0');
            enviarTelegram(`🔍 *ANALISANDO ATIVO*\n💎 Ativo: ${m.nome}\n⏰ Possível entrada: *${horaEntrada}:00*\n⏳ _Aguardando taxa de segurança..._`, false);
            m.analiseEnviada = true;
        }
    }

    // --- CONFIRMAÇÃO OU ABORTO (00 SEGUNDOS) ---
    if (segs === 0 && m.aberturaVela !== preco) {
        m.aberturaVela = preco;
        let sinalFinal = m.forca >= 70 ? "CALL" : m.forca <= 30 ? "PUT" : null;

        if (sinalFinal && !m.operacaoAtiva) {
            m.operacaoAtiva = sinalFinal; m.precoEntrada = preco; m.tempoOp = 60;
            enviarTelegram(`🚀 *ENTRADA CONFIRMADA*\n👉 CLIQUE AGORA\n\n💎 *Ativo:* ${m.nome}\n🎯 *Sinal:* ${direcaoTxt(sinalFinal)}${gerarPlacarMsg(id)}`, false);
        } 
        else if (m.analiseEnviada && !sinalFinal && !m.operacaoAtiva) {
            enviarTelegram(`⚠️ *OPERAÇÃO ABORTADA*\nO ativo ${m.nome} não buscou a taxa de segurança. Não entre!`, false);
        }
        m.analiseEnviada = false;
    }

    // --- PROCESSAMENTO DE RESULTADO E GALE ---
    if (m.tempoOp > 0) {
        m.tempoOp--;
        if (m.tempoOp <= 0) {
            const win = (m.operacaoAtiva === "CALL" && preco > m.precoEntrada) || (m.operacaoAtiva === "PUT" && preco < m.precoEntrada);
            if (win) {
                registrarResultado(id, true, m.galeAtual);
                enviarTelegram(`✅ *GREEN: ${m.nome}*${gerarPlacarMsg(id)}`, true); // Link só no GREEN
                m.operacaoAtiva = null; m.galeAtual = 0;
            } else if (m.galeAtual < 2) {
                m.galeAtual++; m.precoEntrada = preco; m.tempoOp = 60;
                enviarTelegram(`🔄 *GALE ${m.galeAtual}: ${m.nome}*\n🎯 *Sinal:* ${direcaoTxt(m.operacaoAtiva)}${gerarPlacarMsg(id)}`, false);
            } else {
                registrarResultado(id, false, m.galeAtual);
                enviarTelegram(`❌ *LOSS: ${m.nome}*${gerarPlacarMsg(id)}`, false);
                m.operacaoAtiva = null; m.galeAtual = 0;
            }
        }
    }
}

// Relatórios Automáticos (5 em 5 minutos)
setInterval(() => {
    if (statsDia.analises === 0) return;
    const hoje = ["DOMINGO", "SEGUNDA-FEIRA", "TERÇA-FEIRA", "QUARTA-FEIRA", "QUINTA-FEIRA", "SEXTA-FEIRA", "SÁBADO"][new Date().getDay()];
    enviarTelegram(`📊 *BALANÇO DIÁRIO - ${hoje}*\n📈 Análises: ${statsDia.analises}\n✅ Win Direto: ${statsDia.winDireto}\n🔄 Win Gale: ${statsDia.winGales}\n❌ Loss: ${statsDia.loss}\n🔥 EFICIÊNCIA: ${(((statsDia.winDireto+statsDia.winGales)/statsDia.analises)*100).toFixed(1)}%`, false);
}, 300000);

// Reset Diário (Meia-noite de Brasília)
setInterval(() => {
    const n = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    if (n.getHours() === 0 && n.getMinutes() === 0) {
        statsDia = { analises: 0, winDireto: 0, winGales: 0, loss: 0 };
        Object.keys(motores).forEach(k => { motores[k].wins = 0; motores[k].loss = 0; });
        if (n.getDay() === 1) statsSemana = { analises: 0, winDireto: 0, winGales: 0, loss: 0 };
    }
}, 60000);

let ws;
function conectar(){
    ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
    ws.on('open', () => slots.forEach(id => id!=="NONE" && ws.send(JSON.stringify({ticks:id}))));
    ws.on('message', data => { const r=JSON.parse(data); if(r.tick) processarTick(r.tick.symbol, r.tick.quote); });
    ws.on('close', () => setTimeout(conectar, 5000));
}

app.get('/api/status', (req, res) => res.json({ slots, motores, statsDia, statsSemana }));
app.get('/mudar/:index/:novoId', (req, res) => {
    const { index, novoId } = req.params;
    if (ws && slots[index] !== "NONE") ws.send(JSON.stringify({ forget: slots[index] }));
    slots[index] = novoId; inicializarMotores();
    if (ws && novoId !== "NONE") ws.send(JSON.stringify({ ticks: novoId }));
    res.redirect('/');
});
app.get('/', (req, res) => {
    let options = LISTA_ATIVOS.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
    res.send(`<!DOCTYPE html><html><head><title>KCM V24</title><meta name="viewport" content="width=device-width, initial-scale=1">
    <style>body{background:#05070a; color:white; font-family:sans-serif; text-align:center; padding:20px;}
    .card{background:#111418; padding:15px; border-radius:15px; border:1px solid #1e90ff; margin-bottom:10px;}</style></head>
    <body><h3>KCM ULTIMATE - PAINEL</h3><div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
    ${slots.map((id, i) => `<div class="card"><div id="n-${i}">Lendo...</div><div id="p-${i}" style="font-size:18px; font-weight:bold; margin:10px 0;">---</div>
    <select onchange="location.href='/mudar/${i}/'+this.value" style="width:100%;"><option value="">Trocar Ativo</option>${options}</select></div>`).join('')}
    </div><script>setInterval(async()=>{ const r=await fetch('/api/status'); const d=await r.json(); 
    d.slots.forEach((id,i)=>{ const m=d.motores[id]||{nome:"OFF", precoAtual:0}; 
    document.getElementById('n-'+i).innerText=m.nome; document.getElementById('p-'+i).innerText=id==="NONE"?"---":m.precoAtual.toFixed(4); });
    }, 2000);</script></body></html>`);
});

inicializarMotores(); conectar(); app.listen(process.env.PORT || 3000);
