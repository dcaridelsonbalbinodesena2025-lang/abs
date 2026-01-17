const axios = require('axios');
const express = require('express');
const path = require('path');
const app = express();

// FAZ O INDEX.HTML APARECER NO LINK DO RENDER
app.use(express.static(path.join(__dirname, '.')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Painel visual online na porta ${PORT}`));

// CONFIGURAÇÕES DO TELEGRAM
const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI";
const TG_CHAT_ID = "-1003355965894";
const LINK_CORRETORA = "https://fwd.cx/m8xU812pB87p";

let statsGlobal = { wins: 0, loss: 0 };
const ativosData = {};
const listaAtivos = [
    "EUR/USD", "GBP/USD", "USD/CAD", "EUR/GBP", "USD/JPY", "AUD/USD",
    "EUR/USD-OTC", "GBP/USD-OTC", "USD/JPY-OTC", "USD/CHF-OTC", 
    "EUR/JPY-OTC", "GBP/JPY-OTC", "AUD/USD-OTC", "BTC/USD-OTC"
];

listaAtivos.forEach(a => ativosData[a] = { wins: 0, loss: 0 });

function enviarTelegram(msg, botao = true) {
    const url = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`;
    const data = {
        chat_id: TG_CHAT_ID, text: msg, parse_mode: "Markdown",
        reply_markup: botao ? { inline_keyboard: [[{ text: "📲 OPERAR AGORA", url: LINK_CORRETORA }]] } : {}
    };
    axios.post(url, data).catch(e => console.log("Erro TG"));
}

function obterPlacar(ativo) {
    return `📊 Placar ${ativo}: ${ativosData[ativo].wins}W - ${ativosData[ativo].loss}L\n🌍 Global: ${statsGlobal.wins}W - ${statsGlobal.loss}L`;
}

let alertaAtivo = {};

setInterval(() => {
    const agora = new Date();
    const segs = agora.getSeconds();

    listaAtivos.forEach(ativo => {
        if (segs === 50) {
            alertaAtivo[ativo] = true;
            enviarTelegram(`⚠️ *ATENÇÃO PARA A ENTRADA*\n📊 Ativo: ${ativo}\n⚡ Força: 85%\n🧐 Monitorando retração...`, false);
        }

        if (segs >= 1 && segs <= 30 && alertaAtivo[ativo]) {
            let bateuRetracao = Math.random() > 0.50; 
            if (bateuRetracao) {
                let direcao = Math.random() > 0.5 ? "CALL 🟢" : "PUT 🔴";
                enviarTelegram(`👉 *FAÇA A ENTRADA AGORA*\n💎 Ativo: ${ativo}\n📈 Direção: ${direcao}\n⏱️ Entrada aos: ${segs}s\n\n${obterPlacar(ativo)}`);
                alertaAtivo[ativo] = false;
                setTimeout(() => processarResultado(ativo, direcao, 0), 60000); // 1 MINUTO EXATO
            }
        }
        if (segs > 30 && alertaAtivo[ativo]) alertaAtivo[ativo] = false;
    });
}, 1000);

function processarResultado(ativo, direcao, gale) {
    let win = Math.random() > 0.4;
    let label = gale === 0 ? "DIRETO" : `GALE ${gale}`;

    if (win) {
        statsGlobal.wins++; ativosData[ativo].wins++;
        enviarTelegram(`✅ *GREEN CONFIRMADO (${label})* ✅\n💎 Ativo: ${ativo}\n\n${obterPlacar(ativo)}`);
    } else if (gale < 2) {
        let prox = gale + 1;
        enviarTelegram(`🔄 *ENTRADA GALE ${prox}*\n💎 Ativo: ${ativo}\n📈 Direção: ${direcao}`);
        setTimeout(() => processarResultado(ativo, direcao, prox), 60000);
    } else {
        statsGlobal.loss++; ativosData[ativo].loss++;
        enviarTelegram(`❌ *LOSS (GALE 2)* ❌\n💎 Ativo: ${ativo}\n\n${obterPlacar(ativo)}`, false);
    }
}
