const axios = require('axios');
const express = require('express');
const WebSocket = require('ws');
const app = express();

const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI";
const TG_CHAT_ID = "-1003355965894";
const LINK_CORRETORA = "https://track.deriv.com/_S_W1N_";

// --- LISTA MASSIVA COMPLETA ---
const LISTA_ATIVOS = [
    { id: "NONE", nome: "❌ NENHUM (DESATIVAR)" },
    { id: "1HZ10V", nome: "Volatility 10 (1s)" }, { id: "1HZ25V", nome: "Volatility 25 (1s)" },
    { id: "1HZ50V", nome: "Volatility 50 (1s)" }, { id: "1HZ75V", nome: "Volatility 75 (1s)" },
    { id: "1HZ100V", nome: "Volatility 100 (1s)" }, { id: "R_10", nome: "Volatility 10" },
    { id: "R_25", nome: "Volatility 25" }, { id: "R_50", nome: "Volatility 50" },
    { id: "R_75", nome: "Volatility 75" }, { id: "R_100", nome: "Volatility 100" },
    { id: "JD10", nome: "Jump 10" }, { id: "JD25", nome: "Jump 25" },
    { id: "JD50", nome: "Jump 50" }, { id: "JD75", nome: "Jump 75" },
    { id: "JD100", nome: "Jump 100" },
    { id: "BOOM300", nome: "Boom 300" }, { id: "BOOM500", nome: "Boom 500" },
    { id: "BOOM1000", nome: "Boom 1000" }, { id: "CRASH300", nome: "Crash 300" },
    { id: "CRASH500", nome: "Crash 500" }, { id: "CRASH1000", nome: "Crash 1000" },
    { id: "frxEURUSD", nome: "EUR/USD" }, { id: "frxGBPUSD", nome: "GBP/USD" },
    { id: "frxUSDJPY", nome: "USD/JPY" }, { id: "frxAUDUSD", nome: "AUD/USD" },
    { id: "frxXAUUSD", nome: "OURO (XAU/USD)" },
    { id: "cryBTCUSD", nome: "BITCOIN (BTC)" }, { id: "cryETHUSD", nome: "ETHEREUM (ETH)" }
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
    wsDeriv.on('open', () => { slots.forEach(id => { if(id !== "NONE") wsDeriv.send(JSON.stringify({ ticks: id })); }); });
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

function gerarPlacarMsg(id) {
    const m = motores[id];
    const totalW = globalStats.winDireto + globalStats.winGales;
    const assert = globalStats.analises > 0 ? ((totalW / globalStats.analises) * 100).toFixed(1) : "0";
    return `\n\n━━━━━━━━━━━━━━━\n📊 *ATIVO:* ${m.wins}W - ${m.loss}L\n🌍 *GLOBAL:* ${totalW}W - ${globalStats.loss}L (${assert}%)`;
}

function processarTick(id, preco) {
    const m = motores[id]; if (!m) return;
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
            enviarTelegram(`🚀 *ENTRADA CONFIRMADA*\n\n💎 *Ativo:* ${m.nome}\n🎯 *Sinal:* ${txtSinal(m.operacaoAtiva)}${gerarPlacarMsg(id)}`);
        }
    }

    if (segs === 0 && m.aberturaVela !== preco) {
        m.fechamentoAnterior = m.aberturaVela; m.aberturaVela = preco;
        if (m.forca >= 70) m.sinalPendente = "CALL"; else if (m.forca <= 30) m.sinalPendente = "PUT"; else m.sinalPendente = null;
        if (m.sinalPendente && !m.operacaoAtiva) {
            m.buscandoTaxa = true;
            enviarTelegram(`⚠️ *ANALISANDO:* ${m.nome}\n🔥 *FORÇA:* ${m.forca.toFixed(0)}%\n🎯 *SINAL:* ${txtSinal(m.sinalPendente)}\n⏳ *AGUARDANDO TAXA...*${gerarPlacarMsg(id)}`);
        }
    }

    if (m.tempoOp > 0) {
        m.tempoOp--;
        if (m.tempoOp <= 0) {
            const win = (m.operacaoAtiva === "CALL" && preco > m.precoEntrada) || (m.operacaoAtiva === "PUT" && preco < m.precoEntrada);
            const sinalBkp = m.operacaoAtiva;
            if (win) {
                if (m.galeAtual === 0) globalStats.winDireto++; else globalStats.winGales++;
                m.wins++; globalStats.analises++;
                enviarTelegram(`✅ *WIN: ${m.nome}*${gerarPlacarMsg(id)}`, false);
                m.operacaoAtiva = null; m.galeAtual = 0;
            } else if (m.galeAtual < 2) {
                m.galeAtual++; m.precoEntrada = preco; m.tempoOp = 60;
                enviarTelegram(`🔄 *GALE ${m.galeAtual}: ${m.nome}*\n🎯 *SINAL:* ${txtSinal(sinalBkp)}${gerarPlacarMsg(id)}`);
            } else {
                m.loss++; globalStats.loss++; globalStats.analises++;
                enviarTelegram(`❌ *RED: ${m.nome}*${gerarPlacarMsg(id)}`, false);
                m.operacaoAtiva = null; m.galeAtual = 0;
            }
        }
    }
}

app.get('/api/status', (req, res) => res.json({ slots, motores, globalStats }));

app.get('/mudar/:index/:novoId', (req, res) => {
    const { index, novoId } = req.params;
    const antigoId = slots[index];
    if (wsDeriv && wsDeriv.readyState === WebSocket.OPEN) {
        if (antigoId !== "NONE") wsDeriv.send(JSON.stringify({ forget: antigoId }));
        slots[index] = novoId; inicializarMotores();
        if (novoId !== "NONE") wsDeriv.send(JSON.stringify({ ticks: novoId }));
    }
    res.redirect('/');
});

app.get('/', (req, res) => {
    let options = LISTA_ATIVOS.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
    res.send(`<!DOCTYPE html><html><head><title>KCM V19</title><meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body{background:#05070a; color:white; font-family:sans-serif; display:flex; flex-direction:column; align-items:center; padding:15px;}
        .card{background:#111418; padding:15px; border-radius:15px; border:1px solid #333; margin-bottom:10px; transition:0.3s;}
        .termometro-bg{height:4px; background:#222; margin:10px 0; border-radius:2px; overflow:hidden;}
        .termometro-bar{height:100%; transition: 0.5s; background:linear-gradient(90deg, #ff3355, #00ff88);}
    </style></head>
    <body><h3>K.C<span style="color:#1e90ff">📈</span>M ULTIMATE</h3>
    <div style="width:100%; max-width:450px; background:#0a0c0f; border:2px solid #1e90ff; border-radius:20px; padding:15px">
        <div id="grid-cards" style="display:grid; grid-template-columns:1fr 1fr; gap:10px">
            ${slots.map((id, i) => `
                <div class="card" id="card-${i}">
                    <div style="font-size:10px; color:#1e90ff" id="nome-${i}">Carregando...</div>
                    <div style="font-size:16px; font-weight:bold; margin:5px 0" id="preco-${i}">---</div>
                    <div class="termometro-bg"><div class="termometro-bar" id="bar-${i}" style="width:50%"></div></div>
                    <select onchange="window.location.href='/mudar/${i}/'+this.value" style="width:100%; background:#000; color:#fff; font-size:10px">
                        <option value="">Trocar...</option>${options}
                    </select>
                </div>`).join('')}
        </div>
        <div id="placar" style="background:#000; padding:10px; border-radius:10px; margin-top:10px; font-size:12px; color:#1e90ff; text-align:center">📊 PLACAR: 0W - 0L</div>
    </div>
    <script>
        async function up(){
            const r=await fetch('/api/status'); const d=await r.json(); 
            d.slots.forEach((id,i)=>{
                const m=d.motores[id]||{nome:"OFF", precoAtual:0, forca:50}; 
                document.getElementById('nome-'+i).innerText=m.nome; 
                document.getElementById('preco-'+i).innerText=id==="NONE"?"---":m.precoAtual.toFixed(4); 
                document.getElementById('bar-'+i).style.width = m.forca + "%";
                document.getElementById('card-'+i).style.opacity=id==="NONE"?"0.5":"1";
            }); 
            document.getElementById('placar').innerText="📊 PLACAR GLOBAL: "+(d.globalStats.winDireto+d.globalStats.winGales)+"W - "+d.globalStats.loss+"L";
        } 
        setInterval(up, 2000);
    </script></body></html>`);
});

inicializarMotores(); conectarDeriv(); app.listen(process.env.PORT || 3000);
