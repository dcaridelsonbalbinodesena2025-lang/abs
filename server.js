const axios = require('axios');
const express = require('express');
const WebSocket = require('ws');
const cors = require('cors'); 
const app = express();

app.use(express.json());
app.use(cors());

const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI";
const TG_CHAT_ID = "-1003355965894";
const LINK_CORRETORA = "https://track.deriv.com/_S_W1N_";

const FORCA_MINIMA = 70; 
const PCT_RECUO_TAXA = 30; 

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


let statsDiario = { analises: 0, winDireto: 0, lossDireto: 0, winGale: 0, lossGale: 0, ativos: {} };
let historico = []; 
let motores = {};
let slots = ["1HZ100V", "R_100", "frxEURUSD", "cryBTCUSD"];

// --- RELATÓRIO DE PERFORMANCE (A CADA 5 MINUTOS) ---
setInterval(() => {
    if (statsDiario.analises === 0) return;
    let winsTotais = statsDiario.winDireto + statsDiario.winGale;
    let efGeral = ((winsTotais / statsDiario.analises) * 100).toFixed(1);
    let ranking = Object.keys(statsDiario.ativos).map(nome => {
        let a = statsDiario.ativos[nome];
        let porc = (a.w + a.l) > 0 ? ((a.w / (a.w + a.l)) * 100).toFixed(0) : 0;
        return { nome, porc: parseInt(porc) };
    }).sort((a, b) => b.porc - a.porc).slice(0, 4);

    let msg = `📊 *RELATÓRIO DE PERFORMANCE*\n\n📈 *GERAL:*\n• Análises: ${statsDiario.analises}\n• Wins Diretos: ${statsDiario.winDireto}\n• Losses Diretos: ${statsDiario.lossDireto}\n• Wins c/ Gale: ${statsDiario.winGale}\n• Reds c/ Gale: ${statsDiario.lossGale}\n\n🏆 *RANKING ATIVOS:*\n` + 
              ranking.map((a, i) => `${i + 1}º ${a.nome}: ${a.porc}%`).join('\n') + 
              `\n\n🔥 *EFICIÊNCIA ROBÔ: ${efGeral}%*`;
    enviarTelegram(msg);
}, 5 * 60 * 1000);

// --- PAINEL VISUAL ---
app.get('/', (req, res) => {
    if (req.query.slotIdx !== undefined && req.query.ativoId) {
        slots[parseInt(req.query.slotIdx)] = req.query.ativoId;
        reiniciarWS();
    }
    const segs = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"})).getSeconds();
    const timerGeral = (60 - segs).toString().padStart(2, '0');
    let winsTotal = statsDiario.winDireto + statsDiario.winGale;
    let eficiencia = statsDiario.analises > 0 ? ((winsTotal / statsDiario.analises) * 100).toFixed(1) : 0;

    res.send(`
    <html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>K.C.M V19</title>
    <style>
        :root { --neon-blue: #1e90ff; --neon-green: #00ff88; --neon-red: #ff3355; --bg-dark: #05070a; }
        body { background: var(--bg-dark); color: white; font-family: sans-serif; margin: 0; padding: 15px; display: flex; flex-direction: column; align-items: center; }
        .header { width: 100%; max-width: 600px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #1e2228; padding-bottom: 10px; }
        .stats-global { display: flex; gap: 10px; background: #111418; padding: 10px; border-radius: 50px; border: 1px solid var(--neon-blue); }
        .stat-item { text-align: center; font-size: 10px; } .stat-val { font-weight: bold; display: block; font-size: 14px; }
        .grid-container { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; width: 100%; max-width: 600px; }
        .card { background: #111418; border-radius: 15px; padding: 15px; border: 1px solid #1e2228; text-align: center; }
        .card.active { border-color: var(--neon-green); box-shadow: 0 0 10px rgba(0,255,136,0.2); }
        .timer-large { font-size: 38px; font-weight: bold; margin: 5px 0; }
        select { background: #000; color: #fff; border: 1px solid var(--neon-blue); width: 100%; padding: 8px; border-radius: 8px; font-size: 11px; }
        .history-panel { width: 100%; max-width: 600px; margin-top: 20px; background: #111418; border-radius: 15px; padding: 15px; border: 1px solid #1e2228; }
        .history-item { display: flex; justify-content: space-between; font-size: 11px; padding: 5px 0; border-bottom: 1px solid #1a1a1a; }
    </style>
    <script>setTimeout(() => { if(!window.location.search) location.reload(); }, 2000);</script>
    </head><body>
        <div class="header">
            <div style="font-weight:900">K.C<span style="color:var(--neon-blue)">📈</span>M V19</div>
            <div class="stats-global">
                <div class="stat-item"><span class="stat-val">${statsDiario.analises}</span>ANÁLISES</div>
                <div class="stat-item"><span class="stat-val" style="color:var(--neon-green)">${winsTotal}</span>WINS</div>
                <div class="stat-item"><span class="stat-val" style="color:var(--neon-red)">${statsDiario.lossDireto + statsDiario.lossGale}</span>LOSS</div>
                <div class="stat-item"><span class="stat-val">${eficiencia}%</span>ASSERT.</div>
            </div>
        </div>
        <div class="grid-container">
            ${slots.map((idAtivo, i) => {
                const m = motores[idAtivo] || { forca: 50 };
                return `<div class="card ${m.operacaoAtiva ? 'active' : ''}">
                    <div style="font-size:9px;color:#888">FORÇA</div>
                    <div class="timer-large">${timerGeral}</div>
                    <form action="/" method="get">
                        <input type="hidden" name="slotIdx" value="${i}">
                        <select name="ativoId" onchange="this.form.submit()">
                            ${LISTA_ATIVOS.map(a => `<option value="${a.id}" ${a.id === idAtivo ? 'selected' : ''}>${a.nome}</option>`).join('')}
                        </select>
                    </form>
                </div>`}).join('')}
        </div>
        <div class="history-panel">
            <div style="font-size:11px;color:var(--neon-blue);margin-bottom:8px">HISTÓRICO RECENTE</div>
            ${historico.map(h => `<div class="history-item"><span>${h.hora} - ${h.ativo}</span><span style="color:${h.res==='WIN'?'#0f8':'#f35'}">${h.res}</span></div>`).join('')}
        </div>
    </body></html>`);
});

function inicializarMotores() {
    slots.forEach(id => {
        if (id !== "NONE" && !motores[id]) {
            const info = LISTA_ATIVOS.find(a => a.id === id);
            motores[id] = { nome: info ? info.nome : id, aberturaVelaAtual: 0, corpoVelaAnterior: 0, fechamentoVelaAnterior: 0, forca: 50, operacaoAtiva: null, galeAtual: 0, tempoOp: 0, precoEntrada: 0, buscandoTaxa: false, sinalPendente: null };
        }
    });
}

function getHoraBR(offsetSegundos = 0) {
    const data = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    if (offsetSegundos) data.setSeconds(data.getSeconds() + offsetSegundos);
    return data.getHours().toString().padStart(2, '0') + ":" + data.getMinutes().toString().padStart(2, '0') + ":" + data.getSeconds().toString().padStart(2, '0');
}

async function enviarTelegram(msg) {
    const payload = { chat_id: TG_CHAT_ID, text: msg, parse_mode: "Markdown", disable_web_page_preview: true, reply_markup: { inline_keyboard: [[{ text: "📲 DERIV.COM", url: LINK_CORRETORA }]] } };
    try { await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, payload); } catch (e) {}
}

function registrarResultado(ativoNome, resultado, foiGale) {
    if (!statsDiario.ativos[ativoNome]) statsDiario.ativos[ativoNome] = { w: 0, l: 0 };
    if (resultado === "WIN") { if (foiGale) statsDiario.winGale++; else statsDiario.winDireto++; statsDiario.ativos[ativoNome].w++; } 
    else { if (foiGale) statsDiario.lossGale++; else statsDiario.lossDireto++; statsDiario.ativos[ativoNome].l++; }
    statsDiario.analises++;
    historico.unshift({ hora: getHoraBR(), ativo: ativoNome, res: resultado });
    if (historico.length > 5) historico.pop();
}

function processarTick(id, preco) {
    const m = motores[id]; if (!m) return;
    const segs = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"})).getSeconds();
    if (m.aberturaVelaAtual > 0) { m.forca = 50 + ((preco - m.aberturaVelaAtual) / (m.aberturaVelaAtual * 0.0002) * 20); m.forca = Math.min(98, Math.max(2, m.forca)); }

    if (!m.operacaoAtiva && !m.buscandoTaxa && segs === 0) {
        if (m.forca >= FORCA_MINIMA || m.forca <= (100 - FORCA_MINIMA)) { m.sinalPendente = m.forca >= FORCA_MINIMA ? "CALL" : "PUT"; m.buscandoTaxa = true; }
        m.corpoVelaAnterior = Math.abs(preco - m.aberturaVelaAtual); m.fechamentoVelaAnterior = preco; m.aberturaVelaAtual = preco;
    }

    if (m.buscandoTaxa && segs < 30) {
        const dist = m.corpoVelaAnterior * (PCT_RECUO_TAXA / 100);
        if ((m.sinalPendente === "CALL" && preco <= (m.fechamentoVelaAnterior - dist)) || (m.sinalPendente === "PUT" && preco >= (m.fechamentoVelaAnterior + dist))) {
            m.buscandoTaxa = false; m.operacaoAtiva = m.sinalPendente; m.precoEntrada = preco; m.tempoOp = 60;
            enviarTelegram(`🚀 *ENTRADA CONFIRMADA*\n💎 Ativo: ${m.nome}\n🎯 Direção: ${m.operacaoAtiva === "CALL" ? "🟢 COMPRA" : "🔴 VENDA"}\n⏰ Início: ${getHoraBR()}\n🏁 Fim: ${getHoraBR(60)}`);
        }
    }

    if (m.tempoOp > 0) {
        m.tempoOp--;
        if (m.tempoOp <= 0) {
            const win = (m.operacaoAtiva === "CALL" && preco > m.precoEntrada) || (m.operacaoAtiva === "PUT" && preco < m.precoEntrada);
            if (win) {
                registrarResultado(m.nome, "WIN", m.galeAtual > 0);
                let pA = statsDiario.ativos[m.nome];
                enviarTelegram(`✅ *GREEN: ${m.nome}*\n🏆 Resultado: ${m.galeAtual > 0 ? 'GALE '+m.galeAtual : 'DIRETO'}\n📊 ATIVO: ${pA.w}W - ${pA.l}L\n🌍 GLOBAL: ${statsDiario.winDireto + statsDiario.winGale}W - ${statsDiario.lossDireto + statsDiario.lossGale}L`);
                m.operacaoAtiva = null; m.galeAtual = 0;
            } else if (m.galeAtual < 2) {
                m.galeAtual++; m.precoEntrada = preco; m.tempoOp = 60; 
                enviarTelegram(`🔄 *GALE ${m.galeAtual}: ${m.nome}*\n⏰ Início: ${getHoraBR()}\n🏁 Fim: ${getHoraBR(60)}`);
            } else {
                registrarResultado(m.nome, "LOSS", true);
                let pA = statsDiario.ativos[m.nome];
                enviarTelegram(`❌ *LOSS FINAL: ${m.nome}*\n📊 ATIVO: ${pA.w}W - ${pA.l}L\n🌍 GLOBAL: ${statsDiario.winDireto + statsDiario.winGale}W - ${statsDiario.lossDireto + statsDiario.lossGale}L`);
                m.operacaoAtiva = null; m.galeAtual = 0;
            }
        }
    }
}

let ws;
function conectar(){
    ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
    ws.on('open', () => { inicializarMotores(); slots.forEach(id => id!=="NONE" && ws.send(JSON.stringify({ticks:id}))); });
    ws.on('message', data => { const r=JSON.parse(data); if(r.tick) processarTick(r.tick.symbol, r.tick.quote); });
    ws.on('close', () => setTimeout(conectar, 5000));
}
function reiniciarWS() { if(ws) ws.close(); }
conectar(); app.listen(process.env.PORT || 3000);
