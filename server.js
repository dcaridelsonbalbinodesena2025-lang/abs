const axios = require('axios');
const express = require('express');
const path = require('path');
const app = express();

// --- PARTE PARA O PAINEL VISUAL VOLTAR ---
app.use(express.static(path.join(__dirname, '.')));

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

// LOOP DO ROBÔ (SINAIS QUE VOCÊ JÁ VÊ NO TELEGRAM)
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
                setTimeout(() => processarResultado(ativo, direcao, 0), 60000);
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
