const axios = require('axios');
const express = require('express');
const WebSocket = require('ws');
const app = express();

const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI";
const TG_CHAT_ID = "-1003355965894";
const LINK_CORRETORA = "https://track.deriv.com/_S_W1N_";

// --- LISTA MASSIVA COMPLETA (NÃO DIMINUI MAIS) ---
const LISTA_ATIVOS = [
    { id: "NONE", nome: "❌ NENHUM (DESATIVAR)" },
    // SINTÉTICOS VOLATILITY
    { id: "1HZ10V", nome: "Volatility 10 (1s)" }, { id: "1HZ25V", nome: "Volatility 25 (1s)" },
    { id: "1HZ50V", nome: "Volatility 50 (1s)" }, { id: "1HZ75V", nome: "Volatility 75 (1s)" },
    { id: "1HZ100V", nome: "Volatility 100 (1s)" }, { id: "R_10", nome: "Volatility 10" },
    { id: "R_25", nome: "Volatility 25" }, { id: "R_50", nome: "Volatility 50" },
    { id: "R_75", nome: "Volatility 75" }, { id: "R_100", nome: "Volatility 100" },
    // JUMP INDICES
    { id: "JD10", nome: "Jump 10" }, { id: "JD25", nome: "Jump 25" },
    { id: "JD50", nome: "Jump 50" }, { id: "JD75", nome: "Jump 75" },
    { id: "JD100", nome: "Jump 100" },
    // BOOM & CRASH
    { id: "BOOM300", nome: "Boom 300" }, { id: "BOOM500", nome: "Boom 500" },
    { id: "BOOM1000", nome: "Boom 1000" }, { id: "CRASH300", nome: "Crash 300" },
    { id: "CRASH500", nome: "Crash 500" }, { id: "CRASH1000", nome: "Crash 1000" },
    // FOREX REAL
    { id: "frxEURUSD", nome: "EUR/USD" }, { id: "frxGBPUSD", nome: "GBP/USD" },
    { id: "frxUSDJPY", nome: "USD/JPY" }, { id: "frxAUDUSD", nome: "AUD/USD" },
    { id: "frxUSDCAD", nome: "USD/CAD" }, { id: "frxUSDCHF", nome: "USD/CHF" },
    { id: "frxEURGBP", nome: "EUR/GBP" }, { id: "frxEURJPY", nome: "EUR/JPY" },
    { id: "frxGBPJPY", nome: "GBP/JPY" }, { id: "frxAUDJPY", nome: "AUD/JPY" },
    { id: "frxEURCAD", nome: "EUR/CAD" }, { id: "frxXAUUSD", nome: "OURO (XAU/USD)" },
    // CRIPTOMOEDAS
    { id: "cryBTCUSD", nome: "BITCOIN (BTC)" }, { id: "cryETHUSD", nome: "ETHEREUM (ETH)" },
    { id: "cryLTCUSD", nome: "LITECOIN (LTC)" }, { id: "cryXRPUSD", nome: "RIPPLE (XRP)" },
    { id: "cryBCHUSD", nome: "BITCOIN CASH" }
];

let globalStats = { analises: 0, winDireto: 0, winGales: 0, loss: 0 };
let motores = {};
let wsDeriv;
let slots = ["1HZ100V", "R_100", "frxEURUSD", "NONE"];

function inicializarMotores() {
    slots.forEach(id => {
        if (id !== "NONE" && !motores[id]) {
            const info = LISTA_ATIVOS.find(a => a.id === id);
            motores[id] = { 
                nome: info ? info.nome : id, wins: 0, loss: 0, aberturaVela: 0, fechamentoAnterior: 0,
                forca: 50, buscandoTaxa: false, operacaoAtiva: null, galeAtual: 0, tempoOp: 0, precoEntrada: 0, sinalPendente: null, precoAtual: 0 
            };
        }
    });
}

function conectarDeriv() {
    wsDeriv = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
    wsDeriv.on('open', () => {
        slots.forEach(id => { if(id !== "NONE") wsDeriv.send(JSON.stringify({ ticks: id })); });
    });
    wsDeriv.on('message', (data) => {
        const res = JSON.parse(data);
        if (res.tick) processarTick(res.tick.symbol, res.tick.quote);
    });
    wsDeriv.on('close', () => setTimeout(conectarDeriv, 5000));
}

async function enviarTelegram(msg, comBotao = true) {
    const payload = { chat_id: TG_CHAT_ID, text: msg, parse_mode: "Markdown" };
    if (comBotao) payload.reply_markup = { inline_keyboard: [[{ text: "📲 OPERAR AGORA", url: LINK_CORRETORA }]] };
    try { await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, payload); } catch (e) {}
}

// RELATÓRIO DE PERFORMANCE (A CADA 5 MINUTOS)
setInterval(() => {
    const totalW = globalStats.winDireto + globalStats.winGales;
    const ef = globalStats.analises > 0 ? ((totalW / globalStats.analises) * 100).toFixed(1) : 0;
    let ranking = Object.values(motores).filter(m => (m.wins + m.loss) > 0).sort((a,b) => b.wins - a.wins).slice(0, 4).map((item, i) => `${i+1}º ${item.nome}: ${item.wins}W`).join("\n");
    const msg = `📊 *RELATÓRIO DE PERFORMANCE*\n\n📈 *GERAL:*\n• Análises: ${globalStats.analises}\n• Wins Diretos: ${globalStats.winDireto}\n• Wins c/ Gale: ${globalStats.winGales}\n• Reds Total: ${globalStats.loss}\n\n🏆 *RANKING ATIVOS:*\n${ranking || "Sem operações"}\n\n🔥 *EFICIÊNCIA: ${ef}%*`;
    enviarTelegram(msg, false);
}, 300000);

function processarTick(id, preco) {
    const m = motores[id];
    if (!m) return;
    m.precoAtual = preco;
    const segs = new Date().getSeconds();
    const txtSinal = (s) => s === "CALL" ? "🟢 COMPRA (CALL)" : "🔴 VENDA (PUT)";

    if (m.aberturaVela > 0) {
        let diff = preco - m.aberturaVela;
        m.forca = 50 + (diff / (m.aberturaVela * 0.0002) * 20);
        m.forca = Math.min(98, Math.max(2, m.forca));
    }

    if (m.buscandoTaxa && !m.operacaoAtiva && segs <= 30) {
        let diffVelaAnterior = Math.abs(m.fechamentoAnterior - m.aberturaVela) || 0.0001;
        let alvo = diffVelaAnterior * 0.20; 
        if ((m.sinalPendente === "CALL" && preco <= (m.aberturaVela - alvo)) || (m.sinalPendente === "PUT" && preco >= (m.aberturaVela + alvo))) {
            m.operacaoAtiva = m.sinalPendente; m.precoEntrada = preco; m.tempoOp = (60 - segs); m.buscandoTaxa = false;
            enviarTelegram(`🚀 *ENTRADA CONFIRMADA*\n👉 *CLIQUE AGORA*\n\n💎 *Ativo:* ${m.nome}\n🎯 *Sinal:* ${txtSinal(m.operacaoAtiva)}`);
        }
    }

    if (segs === 0 && m.aberturaVela !== preco) {
        m.fechamentoAnterior = m.aberturaVela; m.aberturaVela = preco;
        if (m.forca >= 70) m.sinalPendente = "CALL"; else if (m.forca <= 30) m.sinalPendente = "PUT"; else m.sinalPendente = null;
        if (m.sinalPendente && !m.operacaoAtiva) {
            m.buscandoTaxa = true;
            enviarTelegram(`⚠️ *ANALISANDO:* ${m.nome}\n🔥 *FORÇA:* ${m.forca.toFixed(0)}%\n🎯 *SINAL:* ${txtSinal(m.sinalPendente)}\n⏳ *AGUARDANDO TAXA...*`);
        }
    }

    if (m.tempoOp > 0) {
        m.tempoOp--;
        if (m.tempoOp <= 0) {
            const win = (m.operacaoAtiva === "CALL" && preco > m.precoEntrada) || (m.operacaoAtiva === "PUT" && preco < m.precoEntrada);
            const sinalBackup = m.operacaoAtiva;
            if (win) {
                if (m.galeAtual === 0) globalStats.winDireto++; else globalStats.winGales++;
                m.wins++; globalStats.analises++;
                enviarTelegram(`✅ *WIN: ${m.nome}*`, false);
                m.operacaoAtiva = null; m.galeAtual = 0;
            } else if (m.galeAtual < 2) {
                m.galeAtual++; m.precoEntrada = preco; m.tempoOp = 60;
                enviarTelegram(`🔄 *GALE ${m.galeAtual}: ${m.nome}*\n🎯 *SINAL:* ${txtSinal(sinalBackup)}`);
            } else {
                m.loss++; globalStats.loss++; globalStats.analises++;
                enviarTelegram(`❌ *RED: ${m.nome}*`, false);
                m.operacaoAtiva = null; m.galeAtual = 0;
            }
        }
    }
}

app.get('/mudar/:index/:novoId', (req, res) => {
    const { index, novoId } = req.params;
    const antigoId = slots[index];
    if (wsDeriv && wsDeriv.readyState === WebSocket.OPEN) {
        if (antigoId !== "NONE") wsDeriv.send(JSON.stringify({ forget: antigoId }));
        slots[index] = novoId;
        inicializarMotores();
        if (novoId !== "NONE") wsDeriv.send(JSON.stringify({ ticks: novoId }));
    }
    res.redirect('/');
});

app.get('/', (req, res) => {
    let optionsHtml = LISTA_ATIVOS.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
    let cardsHtml = slots.map((id, i) => {
        const m = id !== "NONE" ? motores[id] : { nome: "DESATIVADO", precoAtual: 0, forca: 50 };
        return `<div style="background:#111418; padding:15px; border-radius:15px; border:1px solid #333; opacity:${id === 'NONE' ? '0.5' : '1'}">
            <div style="font-size:11px; color:#1e90ff">${m.nome}</div>
            <div style="font-size:20px; font-weight:bold; margin:8px 0">${id === "NONE" ? "---" : m.precoAtual.toFixed(4)}</div>
            <div style="height:4px; background:#222; margin-bottom:10px; border-radius:2px; overflow:hidden">
                <div style="width:${m.forca}%; height:100%; background:linear-gradient(90deg, #ff3355, #00ff88)"></div>
            </div>
            <select onchange="window.location.href='/mudar/${i}/'+this.value" style="background:#000; color:#fff; border:1px solid #444; width:100%; font-size:11px">
                <option value="">Trocar Ativo...</option>${optionsHtml}
            </select>
        </div>`;
    }).join('');

    res.send(`<!DOCTYPE html><html><head><title>KCM V19</title><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="3">
    <style>body{background:#05070a; color:white; font-family:sans-serif; display:flex; flex-direction:column; align-items:center; padding:15px;}</style></head>
    <body><h3>K.C<span style="color:#1e90ff">📈</span>M ULTIMATE</h3>
    <div style="width:100%; max-width:450px; background:#0a0c0f; border:2px solid #1e90ff; border-radius:20px; padding:15px">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:15px">${cardsHtml}</div>
        <div style="background:#000; padding:10px; border-radius:10px; border:1px solid #222; font-size:12px">
            <div style="color:#1e90ff; font-weight:bold; margin-bottom:8px">📊 PLACAR: ${globalStats.winDireto + globalStats.winGales}W - ${globalStats.loss}L</div>
            ${slots.filter(id => id !== "NONE").map(id => `<div>${motores[id].nome}: <span style="color:#00ff88">${motores[id].wins}W</span></div>`).join('')}
        </div>
    </div></body></html>`);
});

inicializarMotores();
conectarDeriv();
app.listen(process.env.PORT || 3000);
