const axios = require('axios');
const express = require('express');
const WebSocket = require('ws');
const cors = require('cors'); // <--- ADICIONADO
const app = express();

app.use(express.json());
app.use(cors()); // <--- LIBERA O PAINEL DO GITHUB

const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI";
const TG_CHAT_ID = "-1003355965894";
const LINK_CORRETORA = "https://track.deriv.com/_S_W1N_";

const FORCA_MINIMA = 70; 
const PCT_RECUO_TAXA = 30; 

const LISTA_ATIVOS = [
    { id: "NONE", nome: "❌ DESATIVAR SLOT" },
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
    { id: "frxEURUSD", nome: "💱 EUR/USD (Euro/Dólar)" },
    { id: "frxGBPUSD", nome: "💱 GBP/USD (Libra/Dólar)" },
    { id: "frxUSDJPY", nome: "💱 USD/JPY (Dólar/Iene)" },
    { id: "frxAUDUSD", nome: "💱 AUD/USD (Dólar Aus./Dólar)" },
    { id: "frxUSDCAD", nome: "💱 USD/CAD (Dólar/Dólar Can.)" },
    { id: "frxUSDCHF", nome: "💱 USD/CHF (Dólar/Franco Suíço)" },
    { id: "frxEURGBP", nome: "💱 EUR/GBP (Euro/Libra)" },
    { id: "frxEURJPY", nome: "💱 EUR/JPY (Euro/Iene)" },
    { id: "frxGBPJPY", nome: "💱 GBP/JPY (Libra/Iene)" },
    { id: "frxXAUUSD", nome: "🪙 OURO (XAU/USD)" },
    { id: "frxXAGUSD", nome: "🥈 PRATA (XAG/USD)" },
    { id: "frxXPDUSD", nome: "🧪 PALÁDIO (XPD/USD)" },
    { id: "frxXPTUSD", nome: "⚪ PLATINA (XPT/USD)" },
    { id: "cryBTCUSD", nome: "₿ BITCOIN (BTC/USD)" },
    { id: "cryETHUSD", nome: "♢ ETHEREUM (ETH/USD)" },
    { id: "cryLTCUSD", nome: "Ł LITECOIN (LTC/USD)" },
    { id: "cryXRPUSD", nome: "✕ RIPPLE (XRP/USD)" },
    { id: "cryBCHUSD", nome: "₿ BITCOIN CASH (BCH/USD)" },
    { id: "cryEOSUSD", nome: "🌐 EOS (EOS/USD)" },
    { id: "cryDSHUSD", nome: "💨 DASH (DASH/USD)" }
];

let statsDiario = { analises: 0, winDireto: 0, lossDireto: 0, winGale: 0, lossGale: 0, ativos: {} };
let statsSemanal = {
    segunda: { analises: 0, wins: 0, loss: 0, winGale: 0, lossGale: 0, melhor: "-", pior: "-" },
    terca: { analises: 0, wins: 0, loss: 0, winGale: 0, lossGale: 0, melhor: "-", pior: "-" },
    quarta: { analises: 0, wins: 0, loss: 0, winGale: 0, lossGale: 0, melhor: "-", pior: "-" },
    quinta: { analises: 0, wins: 0, loss: 0, winGale: 0, lossGale: 0, melhor: "-", pior: "-" },
    sexta: { analises: 0, wins: 0, loss: 0, winGale: 0, lossGale: 0, melhor: "-", pior: "-" },
    sabado: { analises: 0, wins: 0, loss: 0, winGale: 0, lossGale: 0, melhor: "-", pior: "-" },
    domingo: { analises: 0, wins: 0, loss: 0, winGale: 0, lossGale: 0, melhor: "-", pior: "-" }
};

let motores = {};
let slots = ["1HZ100V", "R_100", "frxEURUSD", "1HZ10V"];

// --- ROTAS DE COMUNICAÇÃO COM O PAINEL DO GITHUB ---
app.get('/api-dados', (req, res) => {
    const segs = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"})).getSeconds();
    const dadosSlots = slots.map(id => {
        const m = motores[id] || { forca: 50 };
        return {
            forca: m.forca || 50,
            timer: (60 - segs).toString().padStart(2, '0'),
            status: m.operacaoAtiva ? "OPERANDO" : (m.buscandoTaxa ? "AGUARD. TAXA" : "ANALISANDO")
        };
    });
    let winsTotal = statsDiario.winDireto + statsDiario.winGale;
    let lossTotal = statsDiario.lossDireto + statsDiario.lossGale;
    res.json({
        global: { analises: statsDiario.analises, wins: winsTotal, loss: lossTotal, eficiencia: statsDiario.analises > 0 ? ((winsTotal / statsDiario.analises) * 100).toFixed(1) : 0 },
        slots: dadosSlots
    });
});

app.post('/selecionar-ativo', (req, res) => {
    const { index, ativo } = req.body;
    slots[index] = ativo;
    reiniciarWS();
    res.json({ success: true });
});

// Mantive o seu painel interno da Render como backup
app.get('/', (req, res) => {
    if (req.query.slotIdx !== undefined && req.query.ativoId) {
        const idx = parseInt(req.query.slotIdx);
        const novoId = req.query.ativoId;
        slots[idx] = novoId;
        reiniciarWS();
    }
    let html = `<html><head><title>ABS-UEWS DASHBOARD</title>
    <style>
        body { font-family: sans-serif; background: #0b0e11; color: white; display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; padding: 20px; }
        .card { background: #1e2329; padding: 20px; border-radius: 12px; border-top: 4px solid #f0b90b; position: relative; }
        .card.trade { border-top-color: #2ebd85; box-shadow: 0 0 15px rgba(46, 189, 133, 0.4); }
        h2 { margin: 0; font-size: 14px; color: #f0b90b; }
        .placar { font-size: 24px; font-weight: bold; margin: 10px 0; }
        .info { color: #848e9c; font-size: 11px; margin-bottom: 10px; }
        select { background: #2b2f36; color: white; border: 1px solid #444; padding: 5px; border-radius: 4px; width: 100%; cursor: pointer; }
    </style>
    <script>setTimeout(() => { if(!window.location.search) location.reload(); }, 5000);</script>
    </head><body>`;
    slots.forEach((idAtivo, index) => {
        const m = motores[idAtivo] || { wins: 0, loss: 0, forca: 50, status: "CARREGANDO" };
        html += `<div class="card ${m.operacaoAtiva ? 'trade' : ''}">
            <h2>SLOT ${index + 1}</h2>
            <div class="placar">${m.wins || 0}W - ${m.loss || 0}L</div>
            <div class="info">Força: ${(m.forca || 50).toFixed(1)}% | ${m.operacaoAtiva ? '🔥 OPERANDO' : '🔍 ANALISANDO'}</div>
            <form action="/" method="get">
                <input type="hidden" name="slotIdx" value="${index}">
                <select name="ativoId" onchange="this.form.submit()">
                    ${LISTA_ATIVOS.map(a => `<option value="${a.id}" ${a.id === idAtivo ? 'selected' : ''}>${a.nome}</option>`).join('')}
                </select>
            </form>
        </div>`;
    });
    html += `</body></html>`;
    res.send(html);
});

function inicializarMotores() {
    slots.forEach(id => {
        if (id !== "NONE" && !motores[id]) {
            const info = LISTA_ATIVOS.find(a => a.id === id);
            motores[id] = { 
                nome: info ? info.nome : id, wins: 0, loss: 0, 
                aberturaVelaAtual: 0, corpoVelaAnterior: 0, fechamentoVelaAnterior: 0,
                forca: 50, operacaoAtiva: null, galeAtual: 0, tempoOp: 0, precoEntrada: 0,
                buscandoTaxa: false, sinalPendente: null
            };
        }
    });
}

function getHoraBR(offsetSegundos = 0) {
    const data = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    if (offsetSegundos) data.setSeconds(data.getSeconds() + offsetSegundos);
    return data.getHours().toString().padStart(2, '0') + ":" + data.getMinutes().toString().padStart(2, '0') + ":" + data.getSeconds().toString().padStart(2, '0');
}

async function enviarTelegram(msg) {
    const payload = {
        chat_id: TG_CHAT_ID, text: msg, parse_mode: "Markdown",
        disable_web_page_preview: true,
        reply_markup: { inline_keyboard: [[{ text: "📲 DERIV.COM", url: LINK_CORRETORA }]] }
    };
    try { await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, payload); } catch (e) {}
}

function registrarResultado(ativoNome, resultado, foiGale) {
    const agora = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    const diaHoje = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"][agora.getDay()];
    if (!statsDiario.ativos[ativoNome]) statsDiario.ativos[ativoNome] = { w: 0, l: 0 };
    if (resultado === "WIN") {
        if (foiGale) { statsDiario.winGale++; statsSemanal[diaHoje].winGale++; }
        else { statsDiario.winDireto++; statsSemanal[diaHoje].wins++; }
        statsDiario.ativos[ativoNome].w++;
    } else {
        if (foiGale) { statsDiario.lossGale++; statsSemanal[diaHoje].lossGale++; }
        else { statsDiario.lossDireto++; statsSemanal[diaHoje].loss++; }
        statsDiario.ativos[ativoNome].l++;
    }
    statsDiario.analises++;
    statsSemanal[diaHoje].analises++;
    let ranking = Object.entries(statsDiario.ativos).sort((a, b) => (b[1].w - b[1].l) - (a[1].w - a[1].l));
    if(ranking.length > 0) {
        statsSemanal[diaHoje].melhor = ranking[0][0];
        statsSemanal[diaHoje].pior = ranking[ranking.length - 1][0];
    }
}

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
            m.fechamentoVelaAnterior = preco; m.aberturaVelaAtual = preco;
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

// Relatórios automáticos que você tinha
setInterval(() => {
    if (statsDiario.analises === 0) return;
    let ef = (((statsDiario.winDireto + statsDiario.winGale) / statsDiario.analises) * 100).toFixed(1);
    enviarTelegram(`📊 *RELATÓRIO DIÁRIO*\n\n📋 Análises: ${statsDiario.analises}\n✅ Win Direto: ${statsDiario.winDireto}\n🔄 Win Gale: ${statsDiario.winGale}\n❌ Loss Geral: ${statsDiario.lossDireto + statsDiario.lossGale}\n🔥 Eficiência: ${ef}%`);
}, 300000);

let ws;
function conectar(){
    ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
    ws.on('open', () => {
        inicializarMotores();
        slots.forEach(id => id!=="NONE" && ws.send(JSON.stringify({ticks:id})));
    });
    ws.on('message', data => { const r=JSON.parse(data); if(r.tick) processarTick(r.tick.symbol, r.tick.quote); });
    ws.on('close', () => setTimeout(conectar, 5000));
}
function reiniciarWS() { if(ws) ws.close(); }

conectar(); app.listen(process.env.PORT || 3000);
