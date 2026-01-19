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

const LISTA_ATIVOS = [
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
let motores = {};
let slots = ["1HZ100V", "R_100", "frxEURUSD", "1HZ10V"];

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
}, 300000);

// --- PAINEL NEON V19 ---
app.get('/', (req, res) => {
    if (req.query.slotIdx !== undefined && req.query.ativoId) { slots[parseInt(req.query.slotIdx)] = req.query.ativoId; reiniciarWS(); }
    const segs = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"})).getSeconds();
    const timerGeral = (60 - segs).toString().padStart(2, '0');
    let winsTotal = statsDiario.winDireto + statsDiario.winGale;
    let eficiencia = statsDiario.analises > 0 ? ((winsTotal / statsDiario.analises) * 100).toFixed(1) : 0;

    res.send(`
    <html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>K.C.M NEON V19</title>
    <style>
        :root { --neon-blue: #1e90ff; --neon-green: #00ff88; --neon-red: #ff3355; --bg-dark: #05070a; }
        body { background: var(--bg-dark); color: white; font-family: 'Segoe UI', sans-serif; margin: 0; padding: 15px; display: flex; flex-direction: column; align-items: center; }
        .header { width: 100%; max-width: 600px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #1e2228; padding-bottom: 10px; }
        .stats-global { display: flex; gap: 8px; background: #111418; padding: 8px 15px; border-radius: 50px; border: 1px solid var(--neon-blue); }
        .stat-item { text-align: center; font-size: 9px; } .stat-val { font-weight: bold; display: block; font-size: 13px; }
        .grid-container { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; width: 100%; max-width: 600px; }
        .card { background: #111418; border-radius: 15px; padding: 15px; border: 1px solid #1e2228; text-align: center; transition: 0.3s; }
        .card.active { border-color: var(--neon-green); box-shadow: 0 0 15px rgba(0,255,136,0.2); }
        .thermometer-wrap { width: 100%; height: 6px; background: #222; border-radius: 3px; margin: 10px 0; overflow: hidden; }
        .thermometer-fill { height: 100%; transition: 0.5s; background: linear-gradient(90deg, var(--neon-red), var(--neon-green)); }
        .timer-large { font-size: 40px; font-weight: 900; margin: 5px 0; color: #fff; }
        select { background: #000; color: #fff; border: 1px solid #333; width: 100%; padding: 8px; border-radius: 8px; font-size: 11px; }
    </style>
    <script>setTimeout(() => { if(!window.location.search) location.reload(); }, 2000);</script>
    </head><body>
        <div class="header">
            <div style="font-weight:900; font-size:18px">K.C.M <span style="color:var(--neon-blue)">NEON</span></div>
            <div class="stats-global">
                <div class="stat-item"><span class="stat-val" style="color:var(--neon-green)">${winsTotal}</span>WINS</div>
                <div class="stat-item"><span class="stat-val" style="color:var(--neon-red)">${statsDiario.lossDireto + statsDiario.lossGale}</span>LOSS</div>
                <div class="stat-item"><span class="stat-val">${eficiencia}%</span>ASSERT.</div>
            </div>
        </div>
        <div class="grid-container">
            ${slots.map((idAtivo, i) => {
                const m = motores[idAtivo] || { forca: 50 };
                return `<div class="card ${m.operacaoAtiva ? 'active' : ''}">
                    <div style="font-size:9px;color:#666">FORÇA DO MERCADO</div>
                    <div class="thermometer-wrap"><div class="thermometer-fill" style="width: ${m.forca}%"></div></div>
                    <div class="timer-large">${timerGeral}</div>
                    <form action="/" method="get">
                        <input type="hidden" name="slotIdx" value="${i}">
                        <select name="ativoId" onchange="this.form.submit()">
                            ${LISTA_ATIVOS.map(a => `<option value="${a.id}" ${a.id === idAtivo ? 'selected' : ''}>${a.nome}</option>`).join('')}
                        </select>
                    </form>
                </div>`}).join('')}
        </div>
    </body></html>`);
});

// --- FUNÇÕES DE APOIO ---
function inicializarMotores() {
    slots.forEach(id => {
        if (id !== "NONE" && !motores[id]) {
            const info = LISTA_ATIVOS.find(a => a.id === id);
            motores[id] = { nome: info ? info.nome : id, wins: 0, loss: 0, aberturaVelaAtual: 0, corpoVelaAnterior: 0, fechamentoVelaAnterior: 0, forca: 50, operacaoAtiva: null, galeAtual: 0, tempoOp: 0, precoEntrada: 0, buscandoTaxa: false, sinalPendente: null };
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
}

// --- LÓGICA DE PROCESSAMENTO DE SINAIS (MANTIDA ORIGINAL) ---
function processarTick(id, preco) {
    const m = motores[id]; if (!m) return;
    const segs = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"})).getSeconds();
    
    if (m.aberturaVelaAtual > 0) {
        m.forca = 50 + ((preco - m.aberturaVelaAtual) / (m.aberturaVelaAtual * 0.0002) * 20);
        m.forca = Math.min(98, Math.max(2, m.forca));
    }

    if (!m.operacaoAtiva && !m.buscandoTaxa) {
        if (segs === 0 && m.aberturaVelaAtual !== preco) {
            let dirPrevista = m.forca >= 50 ? "🟢 COMPRA" : "🔴 VENDA";
            enviarTelegram(`🔍 *BUSCANDO POSSÍVEL ENTRADA*\n💎 Ativo: ${m.nome}\n🎯 Direção: ${dirPrevista}\n⏰ Possível entrada às: ${getHoraBR().slice(0,5)}:00`);
            
            setTimeout(() => {
                const bateuForca = (m.forca >= FORCA_MINIMA || m.forca <= (100 - FORCA_MINIMA));
                if (!bateuForca) {
                    enviarTelegram(`⚠️ *OPERAÇÃO ABORTADA*\n💎 Ativo: ${m.nome}\n_(Aguardando nova oportunidade)_`);
                } else {
                    m.sinalPendente = m.forca >= FORCA_MINIMA ? "CALL" : "PUT";
                    m.buscandoTaxa = true;
                    enviarTelegram(`⏳ *AGUARDANDO CONFIRMAÇÃO DA ENTRADA*\n💎 Ativo: ${m.nome}\n🎯 Direção: ${m.sinalPendente === "CALL" ? "🟢 COMPRA" : "🔴 VENDA"}\n⏰ Entrada alvo: ${getHoraBR().slice(0,5)}:00`);
                }
            }, 1200);

            m.corpoVelaAnterior = Math.abs(preco - m.aberturaVelaAtual);
            m.fechamentoVelaAnterior = preco; 
            m.aberturaVelaAtual = preco;
        }
    }

    if (m.buscandoTaxa && segs < 30) {
        const dist = m.corpoVelaAnterior * (PCT_RECUO_TAXA / 100);
        let bateuTaxa = (m.sinalPendente === "CALL" && preco <= (m.fechamentoVelaAnterior - dist)) || 
                        (m.sinalPendente === "PUT" && preco >= (m.fechamentoVelaAnterior + dist));
        if (bateuTaxa) {
            m.buscandoTaxa = false; m.operacaoAtiva = m.sinalPendente; m.precoEntrada = preco; m.tempoOp = 60;
            enviarTelegram(`🚀 *ENTRADA CONFIRMADA*\n👉 CLIQUE AGORA\n💎 Ativo: ${m.nome}\n🎯 Direção: ${m.operacaoAtiva === "CALL" ? "🟢 COMPRA" : "🔴 VENDA"}\n⏰ Início ás: ${getHoraBR()}\n🏁 Fim ás: ${getHoraBR(60)}`);
        }
    }

    if (segs >= 30 && m.buscandoTaxa) {
        enviarTelegram(`⚠️ *OPERAÇÃO ABORTADA*\n💎 Ativo: ${m.nome}\nPreço não atingiu a taxa.`);
        m.buscandoTaxa = false; m.sinalPendente = null;
    }

    if (m.tempoOp > 0) {
        m.tempoOp--;
        if (m.tempoOp <= 0) {
            const win = (m.operacaoAtiva === "CALL" && preco > m.precoEntrada) || (m.operacaoAtiva === "PUT" && preco < m.precoEntrada);
            if (win) {
                m.wins++; registrarResultado(m.nome, "WIN", m.galeAtual > 0);
                enviarTelegram(`✅ *GREEN: ${m.nome}*\n🏆 Resultado: ${m.galeAtual > 0 ? 'GALE '+m.galeAtual : 'DIRETO'}`);
                m.operacaoAtiva = null; m.galeAtual = 0;
            } else if (m.galeAtual < 2) {
                m.galeAtual++; m.precoEntrada = preco; m.tempoOp = 60; 
                enviarTelegram(`🔄 *GALE ${m.galeAtual}: ${m.nome}*\n🎯 Direção: ${m.operacaoAtiva === "CALL" ? "🟢 COMPRA" : "🔴 VENDA"}\n⏰ Início: ${getHoraBR()}\n🏁 Fim: ${getHoraBR(60)}`);
            } else {
                m.loss++; registrarResultado(m.nome, "LOSS", true);
                enviarTelegram(`❌ *LOSS FINAL: ${m.nome}*`);
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
